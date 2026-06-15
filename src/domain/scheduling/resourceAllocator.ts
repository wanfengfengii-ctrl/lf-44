import type {
  Berth,
  Crane,
  ShipTask,
  ScheduleConfig,
  CargoTask,
  BerthOccupancy
} from '@/types'

export function calculateLiftDuration(
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

  return Math.ceil((baseTime * (1 + weightFactor * 0.5)) / craneEfficiency * shiftMultiplier)
}

export function findAvailableBerth(
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

export function countActiveCranesAtBerth(
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

export function findAvailableCrane(
  berthId: string,
  cargoWeight: number,
  config: ScheduleConfig,
  craneBusyUntil: Map<string, number>,
  craneAssignments: Map<string, string>,
  currentTime: number
): Crane | null {
  const berth = config.berths.find((b) => b.id === berthId)
  if (!berth) return null

  const activeCount = countActiveCranesAtBerth(
    berthId,
    craneBusyUntil,
    craneAssignments,
    currentTime
  )
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
