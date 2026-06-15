import type { CargoTask, LoadingOrderStrategy } from '@/types'

export function sortCargosByStrategy(cargos: CargoTask[], strategy: LoadingOrderStrategy): CargoTask[] {
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

export function optimizeCargoOrder(
  ships: import('@/types').ShipTask[],
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

export function generateStabilityOptimizedLoadingOrder(
  cargos: CargoTask[],
  _ship: import('@/types').Ship,
  strategy: 'stability' | 'efficiency'
): CargoTask[] {
  if (strategy === 'efficiency') {
    return [...cargos].sort((a, b) => b.weight - a.weight)
  }

  const sorted = [...cargos].sort((a, b) => {
    if (a.fragile !== b.fragile) return a.fragile ? 1 : -1
    return b.weight - a.weight
  })

  const balanced: CargoTask[] = []
  const leftSide: CargoTask[] = []
  const rightSide: CargoTask[] = []
  const heavy: CargoTask[] = []
  const light: CargoTask[] = []

  const midWeight = sorted.reduce((sum, c) => sum + c.weight, 0) / sorted.length

  for (const cargo of sorted) {
    if (cargo.weight >= midWeight) {
      heavy.push(cargo)
    } else {
      light.push(cargo)
    }
  }

  let leftTotal = 0
  let rightTotal = 0

  for (const cargo of heavy) {
    if (leftTotal <= rightTotal) {
      leftSide.push(cargo)
      leftTotal += cargo.weight
    } else {
      rightSide.push(cargo)
      rightTotal += cargo.weight
    }
  }

  for (const cargo of light) {
    if (leftTotal <= rightTotal) {
      leftSide.push(cargo)
      leftTotal += cargo.weight
    } else {
      rightSide.push(cargo)
      rightTotal += cargo.weight
    }
  }

  const maxLen = Math.max(leftSide.length, rightSide.length)
  for (let i = 0; i < maxLen; i++) {
    if (i < leftSide.length) balanced.push(leftSide[i])
    if (i < rightSide.length) balanced.push(rightSide[i])
  }

  return balanced
}

export function generateStabilityOptimizedUnloadingOrder(
  cargos: CargoTask[],
  _ship: import('@/types').Ship,
  strategy: 'stability' | 'efficiency'
): CargoTask[] {
  if (strategy === 'efficiency') {
    return [...cargos].sort((a, b) => a.weight - b.weight)
  }

  const sorted = [...cargos].sort((a, b) => {
    if (a.fragile !== b.fragile) return a.fragile ? -1 : 1
    return a.weight - b.weight
  })

  return sorted
}
