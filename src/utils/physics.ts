import type {
  Cargo,
  Ship,
  BalanceResult,
  ValidationResult,
  WarningItem,
  PendingCargo,
  CenterOfGravity3D,
  HoldZone3D,
  AutoStowageOptions,
  PlanComparison
} from '@/types'

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

export function getCargoCenter3D(cargo: Cargo): CenterOfGravity3D {
  return {
    x: cargo.position.x + cargo.dimensions.width / 2,
    y: cargo.position.y + cargo.dimensions.height / 2,
    z: cargo.position.z + cargo.dimensions.depth / 2
  }
}

export function getCargoCenter(cargo: Cargo): { x: number; y: number } {
  return {
    x: cargo.position.x + cargo.dimensions.width / 2,
    y: cargo.position.y + cargo.dimensions.height / 2
  }
}

export function generateDefaultDecks(ship: Ship) {
  const deckHeight = ship.hullDepth / 3
  return [
    {
      id: 'deck-1',
      name: '底舱',
      level: 0,
      zStart: 0,
      zEnd: deckHeight,
      maxLoad: ship.maxLoad * 0.45,
      restricted: false
    },
    {
      id: 'deck-2',
      name: '中舱',
      level: 1,
      zStart: deckHeight,
      zEnd: deckHeight * 2,
      maxLoad: ship.maxLoad * 0.35,
      restricted: false
    },
    {
      id: 'deck-3',
      name: '主甲板',
      level: 2,
      zStart: deckHeight * 2,
      zEnd: ship.hullDepth,
      maxLoad: ship.maxLoad * 0.2,
      restricted: false
    }
  ]
}

export function generateHoldZones(ship: Ship): HoldZone3D[] {
  const zones: HoldZone3D[] = []
  const xZones = 3
  const yZones = 2
  const xStep = ship.length / xZones
  const yStep = ship.width / yZones
  const zoneNames = [
    ['船首左舱', '船首右舱'],
    ['船中左舱', '船中右舱'],
    ['船尾左舱', '船尾右舱']
  ]

  ship.decks.forEach((deck) => {
    for (let xi = 0; xi < xZones; xi++) {
      for (let yi = 0; yi < yZones; yi++) {
        zones.push({
          id: `zone-${deck.level}-${xi}-${yi}`,
          name: `${deck.name}-${zoneNames[xi][yi]}`,
          deckLevel: deck.level,
          x: xi * xStep,
          y: yi * yStep,
          width: xStep,
          height: yStep,
          maxWeightPerSquareMeter: deck.level === 0 ? 2.5 : deck.level === 1 ? 1.8 : 1.0,
          currentWeight: 0
        })
      }
    }
  })
  return zones
}

export function calculateDeckLoads(cargos: Cargo[], ship: Ship) {
  return ship.decks.map((deck) => {
    const load = cargos
      .filter((c) => c.deckLevel === deck.level)
      .reduce((sum, c) => sum + c.weight, 0)
    return {
      deckId: deck.id,
      deckName: deck.name,
      load,
      maxLoad: deck.maxLoad,
      overload: load > deck.maxLoad
    }
  })
}

export function calculateHoldOverloads(cargos: Cargo[], ship: Ship) {
  const zones = generateHoldZones(ship)
  const overloads: { zoneId: string; zoneName: string; load: number; maxLoad: number; overloadRatio: number }[] = []

  zones.forEach((zone) => {
    const zoneArea = zone.width * zone.height
    const maxLoad = zoneArea * zone.maxWeightPerSquareMeter
    let load = 0

    cargos.forEach((cargo) => {
      if (cargo.deckLevel !== zone.deckLevel) return
      const cargoCenter = getCargoCenter(cargo)
      if (
        cargoCenter.x >= zone.x &&
        cargoCenter.x < zone.x + zone.width &&
        cargoCenter.y >= zone.y &&
        cargoCenter.y < zone.y + zone.height
      ) {
        load += cargo.weight
      }
    })

    if (load > maxLoad * 0.8) {
      overloads.push({
        zoneId: zone.id,
        zoneName: zone.name,
        load,
        maxLoad,
        overloadRatio: load / maxLoad
      })
    }
  })

  return overloads
}

export function calculateStabilityScore(balance: BalanceResult, ship: Ship): number {
  let score = 100

  const lrRatio = balance.totalWeight > 0 ? Math.abs(balance.leftRightDiff) / balance.totalWeight : 0
  const fbRatio = balance.totalWeight > 0 ? Math.abs(balance.frontBackDiff) / balance.totalWeight : 0

  if (lrRatio > ship.leftRightBalanceThreshold * 1.5) score -= 30
  else if (lrRatio > ship.leftRightBalanceThreshold) score -= 15
  else if (lrRatio > ship.leftRightBalanceThreshold * 0.5) score -= 5

  if (fbRatio > ship.frontBackBalanceThreshold * 1.5) score -= 25
  else if (fbRatio > ship.frontBackBalanceThreshold) score -= 12
  else if (fbRatio > ship.frontBackBalanceThreshold * 0.5) score -= 4

  const idealZ = ship.hullDepth * 0.35
  const zRatio = Math.abs(balance.centerOfGravity.z - idealZ) / ship.hullDepth
  if (zRatio > 0.4) score -= 20
  else if (zRatio > 0.25) score -= 10
  else if (zRatio > 0.1) score -= 5

  if (balance.loadPercentage > 100) score -= 40
  else if (balance.loadPercentage > 95) score -= 15
  else if (balance.loadPercentage > 85) score -= 5

  balance.holdOverloads.forEach((h) => {
    if (h.overloadRatio > 1.2) score -= 20
    else if (h.overloadRatio > 1) score -= 10
    else if (h.overloadRatio > 0.9) score -= 5
  })

  balance.deckLoads.forEach((d) => {
    if (d.overload) score -= 15
  })

  return Math.max(0, Math.min(100, score))
}

export function calculateBalance(cargos: Cargo[], ship: Ship): BalanceResult {
  const totalWeight = cargos.reduce((sum, cargo) => sum + cargo.weight, 0)

  if (cargos.length === 0 || totalWeight === 0) {
    return {
      totalWeight: 0,
      centerOfGravity: { x: ship.length / 2, y: ship.width / 2, z: ship.hullDepth * 0.35 },
      leftWeight: 0,
      rightWeight: 0,
      frontWeight: 0,
      backWeight: 0,
      leftRightDiff: 0,
      frontBackDiff: 0,
      leftRightTilt: 0,
      frontBackTilt: 0,
      draft: 0,
      draftBow: 0,
      draftStern: 0,
      loadPercentage: 0,
      metacentricHeight: ship.metacentricHeight,
      stabilityScore: 100,
      deckLoads: ship.decks.map((d) => ({
        deckId: d.id,
        deckName: d.name,
        load: 0,
        maxLoad: d.maxLoad,
        overload: false
      })),
      holdOverloads: []
    }
  }

  let weightedX = 0
  let weightedY = 0
  let weightedZ = 0
  let leftWeight = 0
  let rightWeight = 0
  let frontWeight = 0
  let backWeight = 0

  const centerX = ship.length / 2
  const centerY = ship.width / 2

  cargos.forEach((cargo) => {
    const cargoCenter = getCargoCenter3D(cargo)
    weightedX += cargoCenter.x * cargo.weight
    weightedY += cargoCenter.y * cargo.weight
    weightedZ += cargoCenter.z * cargo.weight

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
  const cogZ = weightedZ / totalWeight

  const leftRightDiff = rightWeight - leftWeight
  const frontBackDiff = frontWeight - backWeight

  const leftRightOffset = cogY - centerY
  const frontBackOffset = cogX - centerX

  const maxTilt = 15
  const leftRightTilt = Math.max(-maxTilt, Math.min(maxTilt, (leftRightOffset / (ship.width / 2)) * maxTilt))
  const frontBackTilt = Math.max(-maxTilt, Math.min(maxTilt, (frontBackOffset / (ship.length / 2)) * maxTilt))

  const totalDisplacement = ship.lightDisplacement + totalWeight
  const draft = (totalDisplacement / (ship.maxLoad + ship.lightDisplacement)) * ship.hullDepth * 0.85
  const draftBase = draft
  const trimAngle = frontBackTilt * (Math.PI / 180)
  const draftBow = draftBase + (ship.length / 2) * Math.sin(trimAngle)
  const draftStern = draftBase - (ship.length / 2) * Math.sin(trimAngle)

  const loadPercentage = (totalWeight / ship.maxLoad) * 100
  const effectiveGM = Math.max(0, ship.metacentricHeight - (cogZ - ship.hullDepth * 0.2))

  const deckLoads = calculateDeckLoads(cargos, ship)
  const holdOverloads = calculateHoldOverloads(cargos, ship)

  const balance: BalanceResult = {
    totalWeight,
    centerOfGravity: { x: cogX, y: cogY, z: cogZ },
    leftWeight,
    rightWeight,
    frontWeight,
    backWeight,
    leftRightDiff,
    frontBackDiff,
    leftRightTilt,
    frontBackTilt,
    draft,
    draftBow: Math.max(0, draftBow),
    draftStern: Math.max(0, draftStern),
    loadPercentage,
    metacentricHeight: effectiveGM,
    stabilityScore: 0,
    deckLoads,
    holdOverloads
  }

  balance.stabilityScore = calculateStabilityScore(balance, ship)
  return balance
}

export function isCargoWithinShip3D(cargo: Cargo, ship: Ship): boolean {
  const deck = ship.decks.find((d) => d.level === cargo.deckLevel)
  if (!deck) return false

  return (
    cargo.position.x >= 0 &&
    cargo.position.y >= 0 &&
    cargo.position.z >= deck.zStart &&
    cargo.position.x + cargo.dimensions.width <= ship.length &&
    cargo.position.y + cargo.dimensions.height <= ship.width &&
    cargo.position.z + cargo.dimensions.depth <= deck.zEnd
  )
}

export function isCargoWithinShip(cargo: Cargo, ship: Ship): boolean {
  return (
    cargo.position.x >= 0 &&
    cargo.position.y >= 0 &&
    cargo.position.x + cargo.dimensions.width <= ship.length &&
    cargo.position.y + cargo.dimensions.height <= ship.width
  )
}

export function doCargosOverlap3D(cargo1: Cargo, cargo2: Cargo): boolean {
  if (cargo1.deckLevel !== cargo2.deckLevel) return false
  const overlapXY = !(
    cargo1.position.x + cargo1.dimensions.width <= cargo2.position.x ||
    cargo2.position.x + cargo2.dimensions.width <= cargo1.position.x ||
    cargo1.position.y + cargo1.dimensions.height <= cargo2.position.y ||
    cargo2.position.y + cargo2.dimensions.height <= cargo1.position.y
  )
  if (!overlapXY) return false
  return !(
    cargo1.position.z + cargo1.dimensions.depth <= cargo2.position.z ||
    cargo2.position.z + cargo2.dimensions.depth <= cargo1.position.z
  )
}

export function doCargosOverlap(cargo1: Cargo, cargo2: Cargo): boolean {
  if (cargo1.deckLevel !== cargo2.deckLevel) return false
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

export function checkStackWeight(cargo: Cargo, allCargos: Cargo[], _ship: Ship): number {
  let weightAbove = 0
  allCargos.forEach((c) => {
    if (c.id === cargo.id) return
    if (c.deckLevel !== cargo.deckLevel) return
    const overlapXY = !(
      cargo.position.x + cargo.dimensions.width <= c.position.x ||
      c.position.x + c.dimensions.width <= cargo.position.x ||
      cargo.position.y + cargo.dimensions.height <= c.position.y ||
      c.position.y + c.dimensions.height <= cargo.position.y
    )
    if (overlapXY && c.position.z > cargo.position.z) {
      weightAbove += c.weight
    }
  })
  return weightAbove
}

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
        message: `[${ho.zoneName}] 接近局部载荷上限 ${((ho.overloadRatio) * 100).toFixed(0)}%`,
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

export function generateAutoStowage(
  pendingCargos: PendingCargo[],
  ship: Ship,
  options: AutoStowageOptions,
  existingCargos: Cargo[] = []
): Cargo[] {
  const result: Cargo[] = [...existingCargos]
  const sorted = [...pendingCargos].sort((a, b) => {
    if (a.priority !== undefined && b.priority !== undefined) return b.priority - a.priority
    return b.weight - a.weight
  })

  const gridStep = 2

  for (const pending of sorted) {
    let placed = false

    const deckOrder = options.priority === 'stability'
      ? [0, 1, 2]
      : options.priority === 'speed'
      ? [2, 1, 0]
      : [1, 0, 2]

    for (const deckLevel of deckOrder) {
      if (placed) break
      const deck = ship.decks.find((d) => d.level === deckLevel)
      if (!deck) continue

      const positions: { x: number; y: number; z: number; score: number }[] = []

      for (let x = 0; x <= ship.length - pending.dimensions.width; x += gridStep) {
        for (let y = 0; y <= ship.width - pending.dimensions.height; y += gridStep) {
          for (let z = deck.zStart; z <= deck.zEnd - pending.dimensions.depth; z += gridStep) {
            const testCargo: Cargo = {
              id: 'test-' + generateId(),
              name: pending.name,
              weight: pending.weight,
              position: { x, y, z },
              dimensions: pending.dimensions,
              color: pending.color,
              rotate: 0,
              stackOrder: 0,
              deckLevel,
              fragile: pending.fragile,
              priority: pending.priority
            }

            const overlaps = result.some((c) => doCargosOverlap3D(testCargo, c))
            if (overlaps) continue

            let score = 0
            const testAll = [...result, testCargo]
            const testBalance = calculateBalance(testAll, ship)

            if (options.priority === 'balance' || options.priority === 'stability') {
              score += testBalance.stabilityScore
              const lrDiff = Math.abs(testBalance.leftRightDiff)
              const fbDiff = Math.abs(testBalance.frontBackDiff)
              score -= (lrDiff + fbDiff) * 0.5
            }

            if (options.priority === 'space') {
              score += (x / ship.length) * 10
              score += (z / deck.zEnd) * 5
            }

            if (pending.fragile && z > deck.zStart) score -= 50

            score -= z * 2

            positions.push({ x, y, z, score })
          }
        }
      }

      if (positions.length > 0) {
        positions.sort((a, b) => b.score - a.score)
        const best = positions[0]
        result.push({
          id: generateId(),
          name: pending.name,
          weight: pending.weight,
          position: { x: best.x, y: best.y, z: best.z },
          dimensions: pending.dimensions,
          color: pending.color,
          rotate: 0,
          stackOrder: result.length,
          deckLevel,
          fragile: pending.fragile,
          priority: pending.priority
        })
        placed = true
        break
      }
    }

    if (!placed) {
      const defaultDeck = ship.decks[0]
      result.push({
        id: generateId(),
        name: pending.name,
        weight: pending.weight,
        position: {
          x: Math.random() * Math.max(1, ship.length - pending.dimensions.width),
          y: Math.random() * Math.max(1, ship.width - pending.dimensions.height),
          z: defaultDeck.zStart
        },
        dimensions: pending.dimensions,
        color: pending.color,
        rotate: 0,
        stackOrder: result.length,
        deckLevel: 0,
        fragile: pending.fragile,
        priority: pending.priority
      })
    }
  }

  return result
}

export function comparePlans(
  manualBalance: BalanceResult,
  recommendedBalance: BalanceResult,
  manualName: string = '手动方案',
  recommendedName: string = '推荐方案'
): PlanComparison {
  const lowerBetter = (a: number, b: number): 'manual' | 'recommended' | 'equal' =>
    a < b ? 'manual' : a > b ? 'recommended' : 'equal'
  const higherBetter = (a: number, b: number): 'manual' | 'recommended' | 'equal' =>
    a > b ? 'manual' : a < b ? 'recommended' : 'equal'
  const closerToZero = (a: number, b: number): 'manual' | 'recommended' | 'equal' =>
    Math.abs(a) < Math.abs(b) ? 'manual' : Math.abs(a) > Math.abs(b) ? 'recommended' : 'equal'

  return {
    manualPlan: {
      name: manualName,
      balance: manualBalance,
      stabilityScore: manualBalance.stabilityScore
    },
    recommendedPlan: {
      name: recommendedName,
      balance: recommendedBalance,
      stabilityScore: recommendedBalance.stabilityScore
    },
    differences: [
      {
        metric: '稳性评分',
        manual: `${manualBalance.stabilityScore.toFixed(0)} 分`,
        recommended: `${recommendedBalance.stabilityScore.toFixed(0)} 分`,
        better: higherBetter(manualBalance.stabilityScore, recommendedBalance.stabilityScore)
      },
      {
        metric: '横倾角度',
        manual: `${Math.abs(manualBalance.leftRightTilt).toFixed(2)}°`,
        recommended: `${Math.abs(recommendedBalance.leftRightTilt).toFixed(2)}°`,
        better: closerToZero(manualBalance.leftRightTilt, recommendedBalance.leftRightTilt)
      },
      {
        metric: '纵倾角度',
        manual: `${Math.abs(manualBalance.frontBackTilt).toFixed(2)}°`,
        recommended: `${Math.abs(recommendedBalance.frontBackTilt).toFixed(2)}°`,
        better: closerToZero(manualBalance.frontBackTilt, recommendedBalance.frontBackTilt)
      },
      {
        metric: '重心高度',
        manual: `${manualBalance.centerOfGravity.z.toFixed(2)} m`,
        recommended: `${recommendedBalance.centerOfGravity.z.toFixed(2)} m`,
        better: lowerBetter(manualBalance.centerOfGravity.z, recommendedBalance.centerOfGravity.z)
      },
      {
        metric: '左右差值',
        manual: `${Math.abs(manualBalance.leftRightDiff).toFixed(1)} 吨`,
        recommended: `${Math.abs(recommendedBalance.leftRightDiff).toFixed(1)} 吨`,
        better: lowerBetter(Math.abs(manualBalance.leftRightDiff), Math.abs(recommendedBalance.leftRightDiff))
      },
      {
        metric: '前后差值',
        manual: `${Math.abs(manualBalance.frontBackDiff).toFixed(1)} 吨`,
        recommended: `${Math.abs(recommendedBalance.frontBackDiff).toFixed(1)} 吨`,
        better: lowerBetter(Math.abs(manualBalance.frontBackDiff), Math.abs(recommendedBalance.frontBackDiff))
      },
      {
        metric: '超载舱位数',
        manual: `${manualBalance.holdOverloads.filter(h => h.overloadRatio > 1).length} 个`,
        recommended: `${recommendedBalance.holdOverloads.filter(h => h.overloadRatio > 1).length} 个`,
        better: lowerBetter(
          manualBalance.holdOverloads.filter(h => h.overloadRatio > 1).length,
          recommendedBalance.holdOverloads.filter(h => h.overloadRatio > 1).length
        )
      }
    ]
  }
}
