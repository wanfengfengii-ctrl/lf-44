import type { Cargo, Ship, BalanceResult, ValidationResult, WarningItem } from '@/types'
import { isCargoWithinShip3D, doCargosOverlap3D, checkStackWeight } from './cargoGeometry'

export function validateCargo(cargo: Cargo, ship?: Ship): string | null {
  if (cargo.weight <= 0) return '货物重量必须大于零'
  if (cargo.dimensions.width <= 0) return '货物宽度必须大于零'
  if (cargo.dimensions.height <= 0) return '货物高度必须大于零'
  if (cargo.dimensions.depth <= 0) return '货物深度必须大于零'
  if (cargo.deckLevel < 0) return '甲板层级无效'
  if (ship) {
    const deck = ship.decks.find((d) => d.level === cargo.deckLevel)
    if (!deck) return '指定的甲板不存在'
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
    const cargoError = validateCargo(cargo, ship)
    if (cargoError) {
      warnings.push({ type: 'error', message: `[${cargo.name}] ${cargoError}`, cargoId: cargo.id })
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
    if (!isCargoWithinShip3D(cargos[i], ship)) {
      warnings.push({
        type: 'error',
        message: `[${cargos[i].name}] 货物超出船舱边界或甲板高度限制`,
        cargoId: cargos[i].id
      })
      canSave = false
    }
  }

  for (let i = 0; i < cargos.length; i++) {
    for (let j = i + 1; j < cargos.length; j++) {
      if (doCargosOverlap3D(cargos[i], cargos[j])) {
        warnings.push({
          type: 'error',
          message: `[${cargos[i].name}] 与 [${cargos[j].name}] 互相重叠`,
          cargoId: cargos[i].id
        })
        canSave = false
      }
    }
  }

  for (const cargo of cargos) {
    if (cargo.fragile) {
      const weightAbove = checkStackWeight(cargo, cargos, ship)
      if (weightAbove > 0) {
        warnings.push({
          type: 'warning',
          message: `[${cargo.name}] 为易碎货物，上方有 ${weightAbove.toFixed(1)} 吨货物堆叠`,
          cargoId: cargo.id
        })
      }
    }
  }

  balance.deckLoads.forEach((dl) => {
    if (dl.overload) {
      warnings.push({
        type: 'error',
        message: `[${dl.deckName}] 超载: ${dl.load.toFixed(1)} 吨 / 上限 ${dl.maxLoad.toFixed(1)} 吨`
      })
      canSave = false
    } else if (dl.load > dl.maxLoad * 0.9) {
      warnings.push({
        type: 'warning',
        message: `[${dl.deckName}] 接近满载: ${dl.load.toFixed(1)} 吨 / 上限 ${dl.maxLoad.toFixed(1)} 吨`
      })
    }
  })

  balance.holdOverloads.forEach((ho) => {
    if (ho.overloadRatio > 1) {
      warnings.push({
        type: 'error',
        message: `[${ho.zoneName}] 局部超载 ${((ho.overloadRatio - 1) * 100).toFixed(1)}%`,
        zoneId: ho.zoneId
      })
      canSave = false
    } else if (ho.overloadRatio > 0.9) {
      warnings.push({
        type: 'warning',
        message: `[${ho.zoneName}] 接近局部载荷上限 ${ho.overloadRatio * 100}%`,
        zoneId: ho.zoneId
      })
    }
  })

  if (balance.totalWeight > 0) {
    const leftRightDiffRatio = Math.abs(balance.leftRightDiff) / balance.totalWeight
    const frontBackDiffRatio = Math.abs(balance.frontBackDiff) / balance.totalWeight

    if (leftRightDiffRatio > ship.leftRightBalanceThreshold * 1.5) {
      warnings.push({
        type: 'error',
        message: `左右载荷严重不平衡，差值比例 ${(leftRightDiffRatio * 100).toFixed(1)}%，存在严重横倾风险`
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
        message: `前后载荷严重不平衡，差值比例 ${(frontBackDiffRatio * 100).toFixed(1)}%，存在严重纵倾风险`
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

  if (balance.metacentricHeight < 0.5 && balance.totalWeight > 0) {
    warnings.push({
      type: 'warning',
      message: `初稳性高度偏低 (${balance.metacentricHeight.toFixed(2)}m)，注意稳性安全`
    })
  }

  return {
    valid: warnings.filter((w) => w.type === 'error').length === 0,
    warnings,
    canSave
  }
}
