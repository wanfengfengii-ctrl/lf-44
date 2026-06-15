import type {
  Cargo,
  Ship,
  CargoTask,
  OperationType,
  BalanceResult,
  StepBalanceSnapshot,
  ShipBalanceHistory
} from '@/types'
import { calculateBalance, createEmptyBalance } from '../balance/balanceCalculator'
import { generateId } from '../common/id'
import { getCargoColor } from '../common/colors'

export function simulateCargoOperation(
  currentCargos: Cargo[],
  ship: Ship,
  cargoTask: CargoTask,
  operationType: OperationType,
  targetPosition?: { x: number; y: number; z: number; deckLevel: number }
): { cargos: Cargo[]; balance: BalanceResult; cargo: Cargo | null } {
  let newCargos = [...currentCargos]
  let affectedCargo: Cargo | null = null

  if (operationType === 'load') {
    const deck = targetPosition
      ? ship.decks.find((d) => d.level === targetPosition.deckLevel)
      : ship.decks[0]

    if (!deck) {
      return {
        cargos: currentCargos,
        balance: calculateBalance(currentCargos, ship),
        cargo: null
      }
    }

    const pos = targetPosition || {
      x: 10 + (currentCargos.length % 5) * 15,
      y: 5 + Math.floor(currentCargos.length / 5) * 10,
      z: deck.zStart,
      deckLevel: deck.level
    }

    const newCargo: Cargo = {
      id: cargoTask.cargoId || generateId(),
      name: cargoTask.cargoName,
      weight: cargoTask.weight,
      position: { x: pos.x, y: pos.y, z: pos.z },
      dimensions: { width: 8, height: 6, depth: 2.5 },
      color: getCargoColor(currentCargos.length),
      rotate: 0,
      stackOrder: currentCargos.length,
      deckLevel: pos.deckLevel,
      fragile: cargoTask.fragile,
      priority: cargoTask.priority
    }

    newCargos.push(newCargo)
    affectedCargo = newCargo
  } else {
    const idx = newCargos.findIndex(
      (c) => c.id === cargoTask.cargoId || c.name === cargoTask.cargoName
    )
    if (idx !== -1) {
      affectedCargo = newCargos[idx]
      newCargos.splice(idx, 1)
    }
  }

  const newBalance = calculateBalance(newCargos, ship)
  return { cargos: newCargos, balance: newBalance, cargo: affectedCargo }
}

function calculateSafetyScore(
  snapshots: StepBalanceSnapshot[],
  initialBalance: BalanceResult,
  ship: Ship
): number {
  let score = 100

  if (snapshots.length === 0) return score

  const avgStability =
    snapshots.reduce((sum, s) => sum + s.balance.stabilityScore, 0) / snapshots.length
  const minStability = Math.min(...snapshots.map((s) => s.balance.stabilityScore))
  const maxTilt = Math.max(
    ...snapshots.map((s) =>
      Math.max(Math.abs(s.balance.leftRightTilt), Math.abs(s.balance.frontBackTilt))
    )
  )

  if (avgStability < 60) score -= 30
  else if (avgStability < 70) score -= 15
  else if (avgStability < 80) score -= 5

  if (minStability < 40) score -= 25
  else if (minStability < 50) score -= 10
  else if (minStability < 60) score -= 5

  if (maxTilt > 10) score -= 20
  else if (maxTilt > 7) score -= 10
  else if (maxTilt > 5) score -= 5

  const overloadSteps = snapshots.filter((s) =>
    s.balance.holdOverloads.some((h) => h.overloadRatio > 1)
  ).length
  if (overloadSteps > 0) {
    score -= Math.min(20, overloadSteps * 3)
  }

  return Math.max(0, Math.min(100, score))
}

export function generateBalanceHistory(
  ship: Ship,
  loadCargos: CargoTask[],
  unloadCargos: CargoTask[],
  loadingOrder: CargoTask[],
  unloadingOrder: CargoTask[]
): ShipBalanceHistory {
  const initialBalance = createEmptyBalance(ship)
  const stepSnapshots: StepBalanceSnapshot[] = []
  let currentCargos: Cargo[] = []
  let currentBalance = initialBalance
  let stepIndex = 0

  for (const cargoTask of unloadingOrder) {
    const result = simulateCargoOperation(currentCargos, ship, cargoTask, 'unload')
    const stabilityDelta = result.balance.stabilityScore - currentBalance.stabilityScore
    const tiltDelta =
      Math.abs(result.balance.leftRightTilt) + Math.abs(result.balance.frontBackTilt) -
      (Math.abs(currentBalance.leftRightTilt) + Math.abs(currentBalance.frontBackTilt))

    stepSnapshots.push({
      stepIndex: stepIndex++,
      operationType: 'unload',
      cargoName: cargoTask.cargoName,
      cargoWeight: cargoTask.weight,
      balance: result.balance,
      stabilityDelta,
      tiltDelta
    })

    currentCargos = result.cargos
    currentBalance = result.balance
  }

  for (const cargoTask of loadingOrder) {
    const result = simulateCargoOperation(currentCargos, ship, cargoTask, 'load')
    const stabilityDelta = result.balance.stabilityScore - currentBalance.stabilityScore
    const tiltDelta =
      Math.abs(result.balance.leftRightTilt) + Math.abs(result.balance.frontBackTilt) -
      (Math.abs(currentBalance.leftRightTilt) + Math.abs(currentBalance.frontBackTilt))

    stepSnapshots.push({
      stepIndex: stepIndex++,
      operationType: 'load',
      cargoName: cargoTask.cargoName,
      cargoWeight: cargoTask.weight,
      balance: result.balance,
      stabilityDelta,
      tiltDelta
    })

    currentCargos = result.cargos
    currentBalance = result.balance
  }

  const minStabilityScore =
    stepSnapshots.length > 0
      ? Math.min(...stepSnapshots.map((s) => s.balance.stabilityScore))
      : initialBalance.stabilityScore

  const maxTiltAngle =
    stepSnapshots.length > 0
      ? Math.max(
          ...stepSnapshots.map((s) =>
            Math.max(Math.abs(s.balance.leftRightTilt), Math.abs(s.balance.frontBackTilt))
          )
        )
      : 0

  const safetyScore = calculateSafetyScore(stepSnapshots, initialBalance, ship)

  return {
    shipId: '',
    shipName: '',
    initialBalance,
    stepSnapshots,
    finalBalance: currentBalance,
    minStabilityScore,
    maxTiltAngle,
    safetyScore
  }
}
