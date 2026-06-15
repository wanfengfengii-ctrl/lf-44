import type { Cargo, Ship, BalanceResult, Deck, HoldZone3D } from '@/types'
import { getCargoCenter3D, getCargoCenter } from './cargoGeometry'
import { generateHoldZones } from '../common/shipFactory'
import { calculateStabilityScore } from './stabilityScorer'

export function calculateDeckLoads(cargos: Cargo[], ship: Ship): BalanceResult['deckLoads'] {
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

export function calculateHoldOverloads(
  cargos: Cargo[],
  ship: Ship
): BalanceResult['holdOverloads'] {
  const zones = generateHoldZones(ship)
  const overloads: BalanceResult['holdOverloads'] = []

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

export function calculateHoldDistribution(
  cargos: Cargo[],
  ship: Ship
): { name: string; weight: number }[] {
  const x1 = 0
  const x2 = ship.length / 3
  const x3 = (ship.length * 2) / 3
  const x4 = ship.length
  const y1 = 0
  const y2 = ship.width / 2
  const y3 = ship.width

  const planeZones = [
    { name: '船首左舱', x1: x3, x2: x4, y1: y1, y2: y2 },
    { name: '船首右舱', x1: x3, x2: x4, y1: y2, y2: y3 },
    { name: '船中左舱', x1: x2, x2: x3, y1: y1, y2: y2 },
    { name: '船中右舱', x1: x2, x2: x3, y1: y2, y2: y3 },
    { name: '船尾左舱', x1: x1, x2: x2, y1: y1, y2: y2 },
    { name: '船尾右舱', x1: x1, x2: x2, y1: y2, y2: y3 }
  ]

  const allZones: { name: string; x1: number; x2: number; y1: number; y2: number; deckLevel: number }[] = []
  for (const deck of ship.decks) {
    for (const pz of planeZones) {
      allZones.push({
        ...pz,
        name: `${deck.name}-${pz.name}`,
        deckLevel: deck.level
      })
    }
  }

  return allZones.map((zone) => {
    const zoneWeight = cargos.reduce((sum, cargo) => {
      if (cargo.deckLevel !== zone.deckLevel) return sum
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

export function createEmptyBalance(ship: Ship): BalanceResult {
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

export function calculateBalance(cargos: Cargo[], ship: Ship): BalanceResult {
  const totalWeight = cargos.reduce((sum, cargo) => sum + cargo.weight, 0)

  if (cargos.length === 0 || totalWeight === 0) {
    return createEmptyBalance(ship)
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
    draftBow: Math.max(0, Math.min(ship.hullDepth, draftBow)),
    draftStern: Math.max(0, Math.min(ship.hullDepth, draftStern)),
    loadPercentage,
    metacentricHeight: effectiveGM,
    stabilityScore: 0,
    deckLoads,
    holdOverloads
  }

  balance.stabilityScore = calculateStabilityScore(balance, ship)
  return balance
}
