import type {
  ScheduleConfig,
  ShipTask,
  CargoTask,
  OperationStep,
  BerthOccupancy,
  CraneUtilization,
  CongestionPoint,
  DelayRisk,
  ScheduleResult,
  LoadingOrderStrategy,
  OperationType,
  Berth,
  Crane,
  CooperativePlan,
  CooperativeComparison,
  OptimizationStrategy,
  ShipBalanceHistory
} from '@/types'
import {
  generateBalanceHistory,
  generateStabilityOptimizedLoadingOrder,
  generateStabilityOptimizedUnloadingOrder
} from './physics'
import type { Ship } from '@/types'

function genId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function sortCargosByStrategy(cargos: CargoTask[], strategy: LoadingOrderStrategy): CargoTask[] {
  const sorted = [...cargos]
  switch (strategy) {
    case 'fifo':
      return sorted.sort((a, b) => a.estimatedArrival - b.estimatedArrival)
    case 'weight_desc':
      return sorted.sort((a, b) => b.weight - a.weight)
    case 'weight_asc':
      return sorted.sort((a, b) => a.weight - b.weight)
    case 'priority':
      return sorted.sort((a, b) => b.priority - a.priority || a.estimatedArrival - b.estimatedArrival)
    case 'fragile_last':
      return sorted.sort((a, b) => {
        if (a.fragile !== b.fragile) return a.fragile ? 1 : -1
        return b.priority - a.priority
      })
    default:
      return sorted
  }
}

function calculateLiftDuration(
  cargo: CargoTask,
  crane: Crane,
  config: ScheduleConfig,
  currentTime: number
): number {
  const baseTime = config.averageLiftTime
  const weightFactor = cargo.weight / crane.maxLiftWeight
  const craneEfficiency = crane.efficiency

  let shiftMultiplier = 1
  for (const shift of config.shifts) {
    const timeOfDay = currentTime % 1440
    if (timeOfDay >= shift.startTime && timeOfDay < shift.endTime) {
      shiftMultiplier = 1 / shift.efficiencyMultiplier
      break
    }
  }

  return Math.ceil(baseTime * (1 + weightFactor * 0.5) / craneEfficiency * shiftMultiplier)
}

function findAvailableBerth(
  ship: ShipTask,
  config: ScheduleConfig,
  berthOccupancies: Map<string, BerthOccupancy>,
  currentTime: number
): Berth | null {
  const availableBerths = config.berths.filter(
    (b) => b.available && b.capacity >= ship.requiredBerthCapacity
  )

  let bestBerth: Berth | null = null
  let earliestFree = Infinity

  for (const berth of availableBerths) {
    const occupancy = berthOccupancies.get(berth.id)
    let freeTime = currentTime

    if (occupancy && occupancy.intervals.length > 0) {
      const lastInterval = occupancy.intervals[occupancy.intervals.length - 1]
      if (lastInterval.endTime > currentTime) {
        freeTime = lastInterval.endTime + config.queueBufferTime
      }
    }

    if (freeTime < earliestFree) {
      earliestFree = freeTime
      bestBerth = berth
    }
  }

  return bestBerth
}

function countActiveCranesAtBerth(
  berthId: string,
  craneBusyUntil: Map<string, number>,
  craneAssignments: Map<string, string>,
  currentTime: number
): number {
  let count = 0
  for (const [craneId, busyUntil] of craneBusyUntil) {
    const assignedBerth = craneAssignments.get(craneId)
    if (assignedBerth === berthId && busyUntil > currentTime) {
      count++
    }
  }
  return count
}

function findAvailableCrane(
  berthId: string,
  cargoWeight: number,
  config: ScheduleConfig,
  craneBusyUntil: Map<string, number>,
  craneAssignments: Map<string, string>,
  currentTime: number
): Crane | null {
  const berth = config.berths.find((b) => b.id === berthId)
  if (!berth) return null

  const activeCount = countActiveCranesAtBerth(berthId, craneBusyUntil, craneAssignments, currentTime)
  if (activeCount >= berth.craneCount) return null

  const availableCranes = config.cranes.filter((c) => {
    if (c.maxLiftWeight < cargoWeight) return false
    if (c.currentBerthId !== null && c.currentBerthId !== berthId) return false
    return true
  })

  let bestCrane: Crane | null = null
  let earliestFree = Infinity

  for (const crane of availableCranes) {
    const busyUntil = craneBusyUntil.get(crane.id) || 0
    const freeTime = Math.max(currentTime, busyUntil)
    if (freeTime < earliestFree) {
      earliestFree = freeTime
      bestCrane = crane
    }
  }

  return bestCrane
}

export function optimizeCargoOrder(
  ships: ShipTask[],
  loadStrategy: LoadingOrderStrategy,
  unloadStrategy: LoadingOrderStrategy
): { optimalLoadingOrder: CargoTask[]; optimalUnloadingOrder: CargoTask[] } {
  const allLoad: CargoTask[] = []
  const allUnload: CargoTask[] = []

  for (const ship of ships) {
    allLoad.push(...ship.loadCargos)
    allUnload.push(...ship.unloadCargos)
  }

  return {
    optimalLoadingOrder: sortCargosByStrategy(allLoad, loadStrategy),
    optimalUnloadingOrder: sortCargosByStrategy(allUnload, unloadStrategy)
  }
}

export function runSimulation(
  config: ScheduleConfig,
  ships: ShipTask[]
): ScheduleResult {
  const operationSteps: OperationStep[] = []
  const berthOccupancies = new Map<string, BerthOccupancy>()
  const craneBusyUntil = new Map<string, number>()
  const craneAssignments = new Map<string, string>()
  const craneWorkTime = new Map<string, number>()
  const craneOperations = new Map<string, number>()
  const craneTotalWeight = new Map<string, number>()
  const congestionPoints: CongestionPoint[] = []
  const shipFinishTimes = new Map<string, number>()

  for (const berth of config.berths) {
    berthOccupancies.set(berth.id, {
      berthId: berth.id,
      berthName: berth.name,
      intervals: []
    })
  }

  for (const crane of config.cranes) {
    craneBusyUntil.set(crane.id, 0)
    craneWorkTime.set(crane.id, 0)
    craneOperations.set(crane.id, 0)
    craneTotalWeight.set(crane.id, 0)
  }

  const sortedShips = [...ships].sort((a, b) => a.arrivalTime - b.arrivalTime)
  const { optimalLoadingOrder, optimalUnloadingOrder } = optimizeCargoOrder(
    ships,
    config.loadingOrderStrategy,
    config.unloadingOrderStrategy
  )

  const shipLoadQueue = new Map<string, CargoTask[]>()
  const shipUnloadQueue = new Map<string, CargoTask[]>()
  const shipBerthAssignment = new Map<string, Berth>()

  for (const ship of sortedShips) {
    shipLoadQueue.set(
      ship.id,
      optimalLoadingOrder.filter((c) => c.shipId === ship.id)
    )
    shipUnloadQueue.set(
      ship.id,
      optimalUnloadingOrder.filter((c) => c.shipId === ship.id)
    )
  }

  const processedShips = new Set<string>()
  const processingQueue: string[] = []
  let currentTime = 0

  while (processedShips.size < sortedShips.length) {
    for (const ship of sortedShips) {
      if (!processingQueue.includes(ship.id) && !processedShips.has(ship.id)) {
        if (ship.arrivalTime <= currentTime) {
          processingQueue.push(ship.id)
        }
      }
    }

    let progress = false

    for (let i = processingQueue.length - 1; i >= 0; i--) {
      const shipId = processingQueue[i]
      const ship = sortedShips.find((s) => s.id === shipId)!

      if (!shipBerthAssignment.has(shipId)) {
        const berth = findAvailableBerth(ship, config, berthOccupancies, currentTime)
        if (berth) {
          shipBerthAssignment.set(shipId, berth)
          const occupancy = berthOccupancies.get(berth.id)!
          const berthStart = Math.max(currentTime, ship.arrivalTime)

          occupancy.intervals.push({
            shipId: ship.id,
            shipName: ship.name,
            startTime: berthStart,
            endTime: berthStart + config.shipPreparationTime,
            operationType: 'berthing'
          })
          currentTime = berthStart
          progress = true
        } else {
          continue
        }
      }

      const berth = shipBerthAssignment.get(shipId)!
      const unloadQueue = shipUnloadQueue.get(shipId) || []
      const loadQueue = shipLoadQueue.get(shipId) || []

      while (unloadQueue.length > 0) {
        const nextCargo = unloadQueue[0]
        const crane = findAvailableCrane(
          berth.id,
          nextCargo.weight,
          config,
          craneBusyUntil,
          craneAssignments,
          currentTime
        )
        if (!crane) break

        const cargo = unloadQueue.shift()!
        craneAssignments.set(crane.id, berth.id)
        const craneFree = craneBusyUntil.get(crane.id) || 0
        const actualStart = Math.max(currentTime, craneFree, ship.arrivalTime + config.shipPreparationTime)
        const waitTime = Math.max(0, actualStart - (ship.arrivalTime + config.shipPreparationTime))
        const duration = calculateLiftDuration(cargo, crane, config, actualStart)
        const endTime = actualStart + duration

        operationSteps.push({
          id: genId(),
          cargoTaskId: cargo.id,
          cargoName: cargo.cargoName,
          shipId: ship.id,
          shipName: ship.name,
          operationType: 'unload',
          weight: cargo.weight,
          berthId: berth.id,
          berthName: berth.name,
          craneId: crane.id,
          craneName: crane.name,
          startTime: actualStart,
          endTime,
          duration,
          queueWaitTime: waitTime
        })

        craneBusyUntil.set(crane.id, endTime)
        craneWorkTime.set(crane.id, (craneWorkTime.get(crane.id) || 0) + duration)
        craneOperations.set(crane.id, (craneOperations.get(crane.id) || 0) + 1)
        craneTotalWeight.set(crane.id, (craneTotalWeight.get(crane.id) || 0) + cargo.weight)

        const occupancy = berthOccupancies.get(berth.id)!
        occupancy.intervals.push({
          shipId: ship.id,
          shipName: ship.name,
          startTime: actualStart,
          endTime,
          operationType: 'unloading'
        })

        progress = true
      }

      while (unloadQueue.length === 0 && loadQueue.length > 0) {
        const nextCargo = loadQueue[0]
        const crane = findAvailableCrane(
          berth.id,
          nextCargo.weight,
          config,
          craneBusyUntil,
          craneAssignments,
          currentTime
        )
        if (!crane) break

        const cargo = loadQueue.shift()!
        craneAssignments.set(crane.id, berth.id)
        const craneFree = craneBusyUntil.get(crane.id) || 0

        let unloadFinishTime = 0
        for (const step of operationSteps) {
          if (step.shipId === shipId && step.operationType === 'unload' && step.endTime > unloadFinishTime) {
            unloadFinishTime = step.endTime
          }
        }

        const actualStart = Math.max(currentTime, craneFree, unloadFinishTime || ship.arrivalTime + config.shipPreparationTime)
        const waitTime = Math.max(0, actualStart - (unloadFinishTime || ship.arrivalTime + config.shipPreparationTime))
        const duration = calculateLiftDuration(cargo, crane, config, actualStart)
        const endTime = actualStart + duration

        operationSteps.push({
          id: genId(),
          cargoTaskId: cargo.id,
          cargoName: cargo.cargoName,
          shipId: ship.id,
          shipName: ship.name,
          operationType: 'load',
          weight: cargo.weight,
          berthId: berth.id,
          berthName: berth.name,
          craneId: crane.id,
          craneName: crane.name,
          startTime: actualStart,
          endTime,
          duration,
          queueWaitTime: waitTime
        })

        craneBusyUntil.set(crane.id, endTime)
        craneWorkTime.set(crane.id, (craneWorkTime.get(crane.id) || 0) + duration)
        craneOperations.set(crane.id, (craneOperations.get(crane.id) || 0) + 1)
        craneTotalWeight.set(crane.id, (craneTotalWeight.get(crane.id) || 0) + cargo.weight)

        const occupancy = berthOccupancies.get(berth.id)!
        occupancy.intervals.push({
          shipId: ship.id,
          shipName: ship.name,
          startTime: actualStart,
          endTime,
          operationType: 'loading'
        })

        progress = true
      }

      const remainingUnload = shipUnloadQueue.get(shipId)?.length || 0
      const remainingLoad = shipLoadQueue.get(shipId)?.length || 0

      if (remainingUnload === 0 && remainingLoad === 0) {
        let shipEndTime = ship.arrivalTime
        for (const step of operationSteps) {
          if (step.shipId === shipId && step.endTime > shipEndTime) {
            shipEndTime = step.endTime
          }
        }
        shipEndTime += config.shipPreparationTime
        shipFinishTimes.set(shipId, shipEndTime)

        const occupancy = berthOccupancies.get(berth.id)!
        const prepStart = shipEndTime - config.shipPreparationTime
        occupancy.intervals.push({
          shipId: ship.id,
          shipName: ship.name,
          startTime: prepStart,
          endTime: shipEndTime,
          operationType: 'departure'
        })

        processedShips.add(shipId)
        const idx = processingQueue.indexOf(shipId)
        if (idx >= 0) processingQueue.splice(idx, 1)
        progress = true
      }
    }

    if (!progress) {
      let nextEvent = Infinity
      for (const [, busyUntil] of craneBusyUntil) {
        if (busyUntil > currentTime && busyUntil < nextEvent) {
          nextEvent = busyUntil
        }
      }
      for (const ship of sortedShips) {
        if (!processedShips.has(ship.id) && !processingQueue.includes(ship.id)) {
          if (ship.arrivalTime > currentTime && ship.arrivalTime < nextEvent) {
            nextEvent = ship.arrivalTime
          }
        }
      }

      if (nextEvent === Infinity) {
        currentTime += 1
      } else {
        currentTime = nextEvent
      }
    }
  }

  const totalSimulationTime = Math.max(
    currentTime,
    ...Array.from(shipFinishTimes.values()).filter((v) => isFinite(v))
  )

  const craneUtilizations: CraneUtilization[] = config.cranes.map((crane) => {
    const workTime = craneWorkTime.get(crane.id) || 0
    const idleTime = Math.max(0, totalSimulationTime - workTime)
    return {
      craneId: crane.id,
      craneName: crane.name,
      totalWorkTime: workTime,
      totalIdleTime: idleTime,
      utilizationRate: totalSimulationTime > 0 ? workTime / totalSimulationTime : 0,
      operations: craneOperations.get(crane.id) || 0,
      totalWeight: craneTotalWeight.get(crane.id) || 0
    }
  })

  for (const berth of config.berths) {
    const occupancy = berthOccupancies.get(berth.id)!
    const merged: typeof occupancy.intervals = []

    const sorted = [...occupancy.intervals].sort((a, b) => a.startTime - b.startTime)
    for (const interval of sorted) {
      if (merged.length === 0) {
        merged.push({ ...interval })
      } else {
        const last = merged[merged.length - 1]
        if (interval.startTime <= last.endTime + config.queueBufferTime && interval.operationType === last.operationType) {
          last.endTime = Math.max(last.endTime, interval.endTime)
          if (!last.shipId.includes(interval.shipId)) {
            congestionPoints.push({
              type: 'berth',
              name: berth.name,
              startTime: Math.min(last.startTime, interval.startTime),
              endTime: Math.max(last.endTime, interval.endTime),
              duration: Math.max(last.endTime, interval.endTime) - Math.min(last.startTime, interval.startTime),
              severity: 'medium',
              affectedShips: [last.shipId, interval.shipId]
            })
          }
        } else {
          merged.push({ ...interval })
        }
      }
    }
    occupancy.intervals = merged
  }

  const stepTimeCounts = new Map<number, string[]>()
  for (const step of operationSteps) {
    for (let t = Math.floor(step.startTime); t < Math.ceil(step.endTime); t += 5) {
      if (!stepTimeCounts.has(t)) stepTimeCounts.set(t, [])
      stepTimeCounts.get(t)!.push(step.cargoTaskId)
    }
  }

  const delayRisks: DelayRisk[] = []
  let allMeetDeadline = true

  for (const ship of sortedShips) {
    const finishTime = shipFinishTimes.get(ship.id) || 0
    const delay = Math.max(0, finishTime - ship.scheduledDepartureTime)
    let riskLevel: DelayRisk['riskLevel'] = 'none'
    let reason = '作业按计划完成'

    if (delay > 0) {
      allMeetDeadline = false
      if (delay <= 30) {
        riskLevel = 'low'
        reason = '存在小幅延误风险，建议加快作业节奏'
      } else if (delay <= 120) {
        riskLevel = 'medium'
        reason = '存在中度延误，可能影响后续船期'
      } else {
        riskLevel = 'high'
        reason = '严重延误！请立即调整作业方案或增加设备'
      }
    } else if (ship.scheduledDepartureTime - finishTime < 15) {
      riskLevel = 'low'
      reason = '离港时间紧张，需严格按计划执行'
    }

    delayRisks.push({
      shipId: ship.id,
      shipName: ship.name,
      scheduledDeparture: ship.scheduledDepartureTime,
      actualFinishTime: finishTime,
      delayMinutes: delay,
      riskLevel,
      reason
    })
  }

  const totalWeight = operationSteps.reduce((sum, s) => sum + s.weight, 0)
  const avgCraneUtil = craneUtilizations.length > 0
    ? craneUtilizations.reduce((sum, c) => sum + c.utilizationRate, 0) / craneUtilizations.length
    : 0
  const avgQueueTime = operationSteps.length > 0
    ? operationSteps.reduce((sum, s) => sum + s.queueWaitTime, 0) / operationSteps.length
    : 0

  return {
    totalSimulationTime,
    totalOperationTime: operationSteps.reduce((sum, s) => sum + s.duration, 0),
    operationSteps,
    berthOccupancies: Array.from(berthOccupancies.values()),
    craneUtilizations,
    congestionPoints,
    delayRisks,
    optimalLoadingOrder,
    optimalUnloadingOrder,
    canMeetDepartureDeadline: allMeetDeadline,
    summary: {
      totalShips: ships.length,
      totalLoadCargos: optimalLoadingOrder.length,
      totalUnloadCargos: optimalUnloadingOrder.length,
      totalWeight,
      averageCraneUtilization: avgCraneUtil,
      averageQueueTime: avgQueueTime,
      congestionCount: congestionPoints.length,
      delayedShips: delayRisks.filter((d) => d.delayMinutes > 0).length
    }
  }
}

export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} 分钟`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (mins === 0) return `${hours} 小时`
  return `${hours} 小时 ${mins} 分`
}

export function getDefaultScheduleConfig(): ScheduleConfig {
  return {
    berths: [
      { id: 'b1', name: '1号泊位', capacity: 10000, craneCount: 2, available: true },
      { id: 'b2', name: '2号泊位', capacity: 8000, craneCount: 2, available: true },
      { id: 'b3', name: '3号泊位', capacity: 15000, craneCount: 3, available: true }
    ],
    cranes: [
      { id: 'c1', name: '吊机A', maxLiftWeight: 50, efficiency: 1.0, currentBerthId: null },
      { id: 'c2', name: '吊机B', maxLiftWeight: 50, efficiency: 1.0, currentBerthId: null },
      { id: 'c3', name: '吊机C', maxLiftWeight: 80, efficiency: 0.9, currentBerthId: null },
      { id: 'c4', name: '吊机D', maxLiftWeight: 30, efficiency: 1.2, currentBerthId: null }
    ],
    shifts: [
      { id: 's1', name: '早班', startTime: 480, endTime: 960, workerCount: 20, efficiencyMultiplier: 1.0 },
      { id: 's2', name: '中班', startTime: 960, endTime: 1440, workerCount: 15, efficiencyMultiplier: 0.9 },
      { id: 's3', name: '夜班', startTime: 0, endTime: 480, workerCount: 10, efficiencyMultiplier: 0.75 }
    ],
    loadingOrderStrategy: 'priority',
    unloadingOrderStrategy: 'fragile_last',
    averageLiftTime: 8,
    queueBufferTime: 5,
    shipPreparationTime: 30
  }
}

export function getDefaultShipTasks(): ShipTask[] {
  return [
    {
      id: 'ship1',
      name: '东方号',
      arrivalTime: 60,
      scheduledDepartureTime: 540,
      requiredBerthCapacity: 8000,
      unloadCargos: [
        { id: 'u1', cargoId: 'c1', cargoName: '机械零件A', weight: 25, fragile: false, priority: 3, operationType: 'unload', shipId: 'ship1', estimatedArrival: 0 },
        { id: 'u2', cargoId: 'c2', cargoName: '精密仪器', weight: 10, fragile: true, priority: 5, operationType: 'unload', shipId: 'ship1', estimatedArrival: 0 },
        { id: 'u3', cargoId: 'c3', cargoName: '钢材', weight: 40, fragile: false, priority: 2, operationType: 'unload', shipId: 'ship1', estimatedArrival: 0 },
        { id: 'u4', cargoId: 'c4', cargoName: '木箱包装', weight: 15, fragile: true, priority: 4, operationType: 'unload', shipId: 'ship1', estimatedArrival: 0 }
      ],
      loadCargos: [
        { id: 'l1', cargoId: 'c5', cargoName: '集装箱1', weight: 30, fragile: false, priority: 2, operationType: 'load', shipId: 'ship1', estimatedArrival: 100 },
        { id: 'l2', cargoId: 'c6', cargoName: '集装箱2', weight: 35, fragile: false, priority: 3, operationType: 'load', shipId: 'ship1', estimatedArrival: 120 },
        { id: 'l3', cargoId: 'c7', cargoName: '陶瓷品', weight: 12, fragile: true, priority: 5, operationType: 'load', shipId: 'ship1', estimatedArrival: 150 }
      ]
    },
    {
      id: 'ship2',
      name: '远航号',
      arrivalTime: 200,
      scheduledDepartureTime: 720,
      requiredBerthCapacity: 12000,
      unloadCargos: [
        { id: 'u5', cargoId: 'c8', cargoName: '大型设备', weight: 60, fragile: false, priority: 4, operationType: 'unload', shipId: 'ship2', estimatedArrival: 200 },
        { id: 'u6', cargoId: 'c9', cargoName: '化工原料', weight: 45, fragile: false, priority: 2, operationType: 'unload', shipId: 'ship2', estimatedArrival: 200 },
        { id: 'u7', cargoId: 'c10', cargoName: '粮食袋', weight: 20, fragile: false, priority: 1, operationType: 'unload', shipId: 'ship2', estimatedArrival: 200 }
      ],
      loadCargos: [
        { id: 'l4', cargoId: 'c11', cargoName: '工程机械', weight: 55, fragile: false, priority: 4, operationType: 'load', shipId: 'ship2', estimatedArrival: 280 },
        { id: 'l5', cargoId: 'c12', cargoName: '纺织品', weight: 18, fragile: false, priority: 2, operationType: 'load', shipId: 'ship2', estimatedArrival: 300 },
        { id: 'l6', cargoId: 'c13', cargoName: '玻璃制品', weight: 8, fragile: true, priority: 5, operationType: 'load', shipId: 'ship2', estimatedArrival: 320 }
      ]
    },
    {
      id: 'ship3',
      name: '顺风号',
      arrivalTime: 400,
      scheduledDepartureTime: 900,
      requiredBerthCapacity: 6000,
      unloadCargos: [
        { id: 'u8', cargoId: 'c14', cargoName: '海鲜冷藏', weight: 22, fragile: true, priority: 5, operationType: 'unload', shipId: 'ship3', estimatedArrival: 400 },
        { id: 'u9', cargoId: 'c15', cargoName: '建材', weight: 38, fragile: false, priority: 2, operationType: 'unload', shipId: 'ship3', estimatedArrival: 400 }
      ],
      loadCargos: [
        { id: 'l7', cargoId: 'c16', cargoName: '电子产品', weight: 15, fragile: true, priority: 5, operationType: 'load', shipId: 'ship3', estimatedArrival: 480 },
        { id: 'l8', cargoId: 'c17', cargoName: '日用品', weight: 25, fragile: false, priority: 2, operationType: 'load', shipId: 'ship3', estimatedArrival: 500 },
        { id: 'l9', cargoId: 'c18', cargoName: '家具', weight: 32, fragile: false, priority: 3, operationType: 'load', shipId: 'ship3', estimatedArrival: 520 }
      ]
    }
  ]
}

function getDefaultShipForCoop(): Ship {
  return {
    length: 100,
    width: 30,
    maxLoad: 500,
    hullDepth: 6,
    leftRightBalanceThreshold: 0.15,
    frontBackBalanceThreshold: 0.2,
    decks: [
      { id: 'deck-1', name: '底舱', level: 0, zStart: 0, zEnd: 2, maxLoad: 225, restricted: false },
      { id: 'deck-2', name: '中舱', level: 1, zStart: 2, zEnd: 4, maxLoad: 175, restricted: false },
      { id: 'deck-3', name: '主甲板', level: 2, zStart: 4, zEnd: 6, maxLoad: 100, restricted: false }
    ],
    maxStackWeight: 100,
    metacentricHeight: 1.5,
    lightDisplacement: 200
  }
}

export function runStabilityAwareSimulation(
  config: ScheduleConfig,
  ships: ShipTask[],
  strategy: OptimizationStrategy
): ScheduleResult {
  const modifiedConfig = { ...config }

  if (strategy === 'stability') {
    modifiedConfig.loadingOrderStrategy = 'fragile_last'
    modifiedConfig.unloadingOrderStrategy = 'fragile_last'
  }

  return runSimulation(modifiedConfig, ships)
}

export function generateCooperativePlan(
  config: ScheduleConfig,
  ships: ShipTask[],
  strategy: OptimizationStrategy,
  shipModel?: Ship
): CooperativePlan {
  const ship = shipModel || getDefaultShipForCoop()

  const scheduleResult = runStabilityAwareSimulation(config, ships, strategy)

  const balanceHistories: ShipBalanceHistory[] = ships.map((shipTask) => {
    const shipLoadOrders = scheduleResult.optimalLoadingOrder.filter(c => c.shipId === shipTask.id)
    const shipUnloadOrders = scheduleResult.optimalUnloadingOrder.filter(c => c.shipId === shipTask.id)

    const history = generateBalanceHistory(
      ship,
      shipTask.loadCargos,
      shipTask.unloadCargos,
      shipLoadOrders,
      shipUnloadOrders
    )

    return {
      ...history,
      shipId: shipTask.id,
      shipName: shipTask.name
    }
  })

  const totalSafetyScore = balanceHistories.length > 0
    ? balanceHistories.reduce((sum, h) => sum + h.safetyScore, 0) / balanceHistories.length
    : 100

  const avgStabilityScore = balanceHistories.length > 0
    ? balanceHistories.reduce((sum, h) => sum + h.finalBalance.stabilityScore, 0) / balanceHistories.length
    : 100

  const onTimeShips = scheduleResult.delayRisks.filter(d => d.delayMinutes <= 0).length
  const onTimeRate = ships.length > 0 ? (onTimeShips / ships.length) * 100 : 100

  return {
    id: `plan-${strategy}-${Date.now()}`,
    name: strategy === 'efficiency' ? '作业效率最优方案' : '航行稳性最优方案',
    strategy,
    scheduleResult,
    balanceHistories,
    overallSafetyScore: totalSafetyScore,
    averageStabilityScore: avgStabilityScore,
    onTimeRate,
    totalOperationTime: scheduleResult.totalSimulationTime
  }
}

export function compareCooperativePlans(
  efficiencyPlan: CooperativePlan,
  stabilityPlan: CooperativePlan
): CooperativeComparison {
  const metrics = [
    {
      metric: '总作业时长',
      efficiency: formatDuration(efficiencyPlan.totalOperationTime),
      stability: formatDuration(stabilityPlan.totalOperationTime),
      better: efficiencyPlan.totalOperationTime <= stabilityPlan.totalOperationTime ? 'efficiency' : 'stability' as 'efficiency' | 'stability' | 'equal',
      unit: '时间'
    },
    {
      metric: '离港准点率',
      efficiency: `${efficiencyPlan.onTimeRate.toFixed(1)}%`,
      stability: `${stabilityPlan.onTimeRate.toFixed(1)}%`,
      better: efficiencyPlan.onTimeRate >= stabilityPlan.onTimeRate
        ? (efficiencyPlan.onTimeRate === stabilityPlan.onTimeRate ? 'equal' : 'efficiency')
        : 'stability' as 'efficiency' | 'stability' | 'equal',
      unit: '百分比'
    },
    {
      metric: '装载安全评分',
      efficiency: `${efficiencyPlan.overallSafetyScore.toFixed(0)} 分`,
      stability: `${stabilityPlan.overallSafetyScore.toFixed(0)} 分`,
      better: efficiencyPlan.overallSafetyScore <= stabilityPlan.overallSafetyScore ? 'stability' : 'efficiency' as 'efficiency' | 'stability' | 'equal',
      unit: '分数'
    },
    {
      metric: '平均稳性评分',
      efficiency: `${efficiencyPlan.averageStabilityScore.toFixed(0)} 分`,
      stability: `${stabilityPlan.averageStabilityScore.toFixed(0)} 分`,
      better: efficiencyPlan.averageStabilityScore <= stabilityPlan.averageStabilityScore ? 'stability' : 'efficiency' as 'efficiency' | 'stability' | 'equal',
      unit: '分数'
    },
    {
      metric: '作业船舶数',
      efficiency: `${efficiencyPlan.scheduleResult.summary.totalShips} 艘`,
      stability: `${stabilityPlan.scheduleResult.summary.totalShips} 艘`,
      better: 'equal' as 'efficiency' | 'stability' | 'equal',
      unit: '数量'
    },
    {
      metric: '延误船舶数',
      efficiency: `${efficiencyPlan.scheduleResult.summary.delayedShips} 艘`,
      stability: `${stabilityPlan.scheduleResult.summary.delayedShips} 艘`,
      better: efficiencyPlan.scheduleResult.summary.delayedShips <= stabilityPlan.scheduleResult.summary.delayedShips
        ? (efficiencyPlan.scheduleResult.summary.delayedShips === stabilityPlan.scheduleResult.summary.delayedShips ? 'equal' : 'efficiency')
        : 'stability' as 'efficiency' | 'stability' | 'equal',
      unit: '数量'
    },
    {
      metric: '吊机平均利用率',
      efficiency: `${(efficiencyPlan.scheduleResult.summary.averageCraneUtilization * 100).toFixed(1)}%`,
      stability: `${(stabilityPlan.scheduleResult.summary.averageCraneUtilization * 100).toFixed(1)}%`,
      better: efficiencyPlan.scheduleResult.summary.averageCraneUtilization >= stabilityPlan.scheduleResult.summary.averageCraneUtilization
        ? (efficiencyPlan.scheduleResult.summary.averageCraneUtilization === stabilityPlan.scheduleResult.summary.averageCraneUtilization ? 'equal' : 'efficiency')
        : 'stability' as 'efficiency' | 'stability' | 'equal',
      unit: '百分比'
    }
  ]

  return {
    efficiencyPlan,
    stabilityPlan,
    metrics
  }
}

export function getDefaultCooperativeConfig() {
  return {
    minStabilityThreshold: 60,
    maxTiltThreshold: 8,
    stabilityWeight: 0.5,
    efficiencyWeight: 0.5,
    enableBalancedLoading: true,
    enableStabilityCheckEachStep: true
  }
}
