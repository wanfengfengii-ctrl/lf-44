import type { Cargo, Ship, BalanceResult, ValidationResult, WarningItem } from '@/types'

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export function getCargoColor(index: number): string {
  const colors = [
    '#4A90D9',
    '#E67E22',
    '#27AE60',
    '#8E44AD',
    '#C0392B',
    '#16A085',
    '#D35400',
    '#2980B9',
    '#F39C12',
    '#7F8C8D'
  ]
  return colors[index % colors.length]
}

export function getCargoCenter(cargo: Cargo): { x: number; y: number } {
  return {
    x: cargo.position.x + cargo.dimensions.width / 2,
    y: cargo.position.y + cargo.dimensions.height / 2
  }
}

export function calculateBalance(cargos: Cargo[], ship: Ship): BalanceResult {
  const totalWeight = cargos.reduce((sum, cargo) => sum + cargo.weight, 0)

  if (cargos.length === 0 || totalWeight === 0) {
    return {
      totalWeight: 0,
      centerOfGravity: { x: ship.length / 2, y: ship.width / 2 },
      leftWeight: 0,
      rightWeight: 0,
      frontWeight: 0,
      backWeight: 0,
      leftRightDiff: 0,
      frontBackDiff: 0,
      leftRightTilt: 0,
      frontBackTilt: 0,
      draft: 0,
      loadPercentage: 0
    }
  }

  let weightedX = 0
  let weightedY = 0
  let leftWeight = 0
  let rightWeight = 0
  let frontWeight = 0
  let backWeight = 0

  const centerX = ship.length / 2
  const centerY = ship.width / 2

  cargos.forEach((cargo) => {
    const cargoCenter = getCargoCenter(cargo)
    weightedX += cargoCenter.x * cargo.weight
    weightedY += cargoCenter.y * cargo.weight

    if (cargoCenter.y < centerY) {
      leftWeight += cargo.weight
    } else {
      rightWeight += cargo.weight
    }

    if (cargoCenter.x < centerX) {
      backWeight += cargo.weight
    } else {
      frontWeight += cargo.weight
    }
  })

  const cogX = weightedX / totalWeight
  const cogY = weightedY / totalWeight

  const leftRightDiff = rightWeight - leftWeight
  const frontBackDiff = frontWeight - backWeight

  const leftRightOffset = cogY - centerY
  const frontBackOffset = cogX - centerX

  const maxTilt = 15
  const leftRightTilt = Math.max(-maxTilt, Math.min(maxTilt, (leftRightOffset / (ship.width / 2)) * maxTilt))
  const frontBackTilt = Math.max(-maxTilt, Math.min(maxTilt, (frontBackOffset / (ship.length / 2)) * maxTilt))

  const draft = (totalWeight / ship.maxLoad) * ship.hullDepth * 0.8
  const loadPercentage = (totalWeight / ship.maxLoad) * 100

  return {
    totalWeight,
    centerOfGravity: { x: cogX, y: cogY },
    leftWeight,
    rightWeight,
    frontWeight,
    backWeight,
    leftRightDiff,
    frontBackDiff,
    leftRightTilt,
    frontBackTilt,
    draft,
    loadPercentage
  }
}

export function isCargoWithinShip(cargo: Cargo, ship: Ship): boolean {
  return (
    cargo.position.x >= 0 &&
    cargo.position.y >= 0 &&
    cargo.position.x + cargo.dimensions.width <= ship.length &&
    cargo.position.y + cargo.dimensions.height <= ship.width
  )
}

export function doCargosOverlap(cargo1: Cargo, cargo2: Cargo): boolean {
  return !(
    cargo1.position.x + cargo1.dimensions.width <= cargo2.position.x ||
    cargo2.position.x + cargo2.dimensions.width <= cargo1.position.x ||
    cargo1.position.y + cargo1.dimensions.height <= cargo2.position.y ||
    cargo2.position.y + cargo2.dimensions.height <= cargo1.position.y
  )
}

export function checkOverlapWithOthers(cargo: Cargo, allCargos: Cargo[]): Cargo[] {
  return allCargos.filter((c) => c.id !== cargo.id && doCargosOverlap(cargo, c))
}

export function validateCargo(cargo: Cargo): string | null {
  if (cargo.weight <= 0) {
    return '货物重量必须大于零'
  }
  if (cargo.dimensions.width <= 0) {
    return '货物宽度必须大于零'
  }
  if (cargo.dimensions.height <= 0) {
    return '货物高度必须大于零'
  }
  if (cargo.dimensions.depth <= 0) {
    return '货物深度必须大于零'
  }
  return null
}

export function validateLoadingPlan(
  cargos: Cargo[],
  ship: Ship,
  balance: BalanceResult
): ValidationResult {
  const warnings: WarningItem[] = []
  let canSave = true

  for (const cargo of cargos) {
    const cargoError = validateCargo(cargo)
    if (cargoError) {
      warnings.push({ type: 'error', message: `[${cargo.name}] ${cargoError}` })
      canSave = false
    }
  }

  if (balance.totalWeight > ship.maxLoad) {
    warnings.push({
      type: 'error',
      message: `总载重 ${balance.totalWeight.toFixed(1)} 吨超过船只上限 ${ship.maxLoad} 吨`
    })
    canSave = false
  }

  for (let i = 0; i < cargos.length; i++) {
    if (!isCargoWithinShip(cargos[i], ship)) {
      warnings.push({
        type: 'error',
        message: `[${cargos[i].name}] 货物超出船舱边界`
      })
      canSave = false
    }
  }

  for (let i = 0; i < cargos.length; i++) {
    for (let j = i + 1; j < cargos.length; j++) {
      if (doCargosOverlap(cargos[i], cargos[j])) {
        warnings.push({
          type: 'error',
          message: `[${cargos[i].name}] 与 [${cargos[j].name}] 互相重叠`
        })
        canSave = false
      }
    }
  }

  if (balance.totalWeight > 0) {
    const leftRightDiffRatio = Math.abs(balance.leftRightDiff) / balance.totalWeight
    const frontBackDiffRatio = Math.abs(balance.frontBackDiff) / balance.totalWeight

    if (leftRightDiffRatio > ship.leftRightBalanceThreshold * 1.5) {
      warnings.push({
        type: 'error',
        message: `左右载荷严重不平衡，差值比例 ${(leftRightDiffRatio * 100).toFixed(1)}%，存在严重倾斜风险`
      })
      canSave = false
    } else if (leftRightDiffRatio > ship.leftRightBalanceThreshold) {
      warnings.push({
        type: 'warning',
        message: `左右载荷不平衡，差值比例 ${(leftRightDiffRatio * 100).toFixed(1)}%，请调整货物位置`
      })
    }

    if (frontBackDiffRatio > ship.frontBackBalanceThreshold * 1.5) {
      warnings.push({
        type: 'error',
        message: `前后载荷严重不平衡，差值比例 ${(frontBackDiffRatio * 100).toFixed(1)}%，存在严重倾首风险`
      })
      canSave = false
    } else if (frontBackDiffRatio > ship.frontBackBalanceThreshold) {
      warnings.push({
        type: 'warning',
        message: `前后载荷不平衡，差值比例 ${(frontBackDiffRatio * 100).toFixed(1)}%，请调整货物位置`
      })
    }
  }

  if (balance.loadPercentage > 95) {
    warnings.push({
      type: 'warning',
      message: `载重已达上限的 ${balance.loadPercentage.toFixed(1)}%，接近满载`
    })
  }

  return {
    valid: warnings.filter((w) => w.type === 'error').length === 0,
    warnings,
    canSave
  }
}

export function calculateHoldDistribution(
  cargos: Cargo[],
  ship: Ship
): { name: string; weight: number }[] {
  const x1 = 0
  const x2 = ship.length / 3
  const x3 = ship.length * 2 / 3
  const x4 = ship.length
  const y1 = 0
  const y2 = ship.width / 2
  const y3 = ship.width

  const zones = [
    { name: '船首左舱', x1: x3, x2: x4, y1: y1, y2: y2 },
    { name: '船首右舱', x1: x3, x2: x4, y1: y2, y2: y3 },
    { name: '船中左舱', x1: x2, x2: x3, y1: y1, y2: y2 },
    { name: '船中右舱', x1: x2, x2: x3, y1: y2, y2: y3 },
    { name: '船尾左舱', x1: x1, x2: x2, y1: y1, y2: y2 },
    { name: '船尾右舱', x1: x1, x2: x2, y1: y2, y2: y3 }
  ]

  return zones.map((zone) => {
    const zoneWeight = cargos.reduce((sum, cargo) => {
      const cargoCenter = getCargoCenter(cargo)
      if (
        cargoCenter.x >= zone.x1 &&
        cargoCenter.x < zone.x2 &&
        cargoCenter.y >= zone.y1 &&
        cargoCenter.y < zone.y2
      ) {
        return sum + cargo.weight
      }
      return sum
    }, 0)
    return { name: zone.name, weight: zoneWeight }
  })
}
