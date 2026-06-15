import type { ScheduleConfig, ShipTask, ScheduleResult } from '@/types'
import { genShortId } from '../common/id'
import { optimizeCargoOrder } from './cargoOrdering'
import { calculateLiftDuration, findAvailableBerth, findAvailableCrane } from './resourceAllocator'
import type { BerthOccupancy, CraneUtilization, CongestionPoint, DelayRisk, OperationStep } from '@/types'

export function runSimulation(config: ScheduleConfig, ships: ShipTask[]): ScheduleResult {
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

  const shipLoadQueue = new Map<string, import('@/types').CargoTask[]>()
  const shipUnloadQueue = new Map<string, import('@/types').CargoTask[]>()
  const shipBerthAssignment = new Map<string, import('@/types').Berth>()

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
        const actualStart = Math.max(
          currentTime,
          craneFree,
          ship.arrivalTime + config.shipPreparationTime
        )
        const waitTime = Math.max(0, actualStart - (ship.arrivalTime + config.shipPreparationTime))
        const duration = calculateLiftDuration(cargo, crane, config, actualStart)
        const endTime = actualStart + duration

        operationSteps.push({
          id: genShortId(),
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

        const actualStart = Math.max(
          currentTime,
          craneFree,
          unloadFinishTime || ship.arrivalTime + config.shipPreparationTime
        )
        const waitTime = Math.max(
          0,
          actualStart - (unloadFinishTime || ship.arrivalTime + config.shipPreparationTime)
        )
        const duration = calculateLiftDuration(cargo, crane, config, actualStart)
        const endTime = actualStart + duration

        operationSteps.push({
          id: genShortId(),
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
        if (
          interval.startTime <= last.endTime + config.queueBufferTime &&
          interval.operationType === last.operationType
        ) {
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
  const avgCraneUtil =
    craneUtilizations.length > 0
      ? craneUtilizations.reduce((sum, c) => sum + c.utilizationRate, 0) / craneUtilizations.length
      : 0
  const avgQueueTime =
    operationSteps.length > 0
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

export function runStabilityAwareSimulation(
  config: ScheduleConfig,
  ships: ShipTask[],
  strategy: import('@/types').OptimizationStrategy
): ScheduleResult {
  const modifiedConfig = { ...config }

  if (strategy === 'stability') {
    modifiedConfig.loadingOrderStrategy = 'fragile_last'
    modifiedConfig.unloadingOrderStrategy = 'fragile_last'
  }

  return runSimulation(modifiedConfig, ships)
}
