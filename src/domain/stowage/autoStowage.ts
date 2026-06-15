import type { Cargo, PendingCargo, Ship, AutoStowageOptions } from '@/types'
import { generateId } from '../common/id'
import { calculateBalance } from '../balance/balanceCalculator'
import { doCargosOverlap3D } from '../balance/cargoGeometry'

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
    let maxDeckDepth = 0
    for (const d of ship.decks) {
      maxDeckDepth = Math.max(maxDeckDepth, d.zEnd - d.zStart)
    }
    if (
      pending.dimensions.width > ship.length ||
      pending.dimensions.height > ship.width ||
      pending.dimensions.depth > maxDeckDepth
    ) {
      continue
    }

    let placed = false

    const deckOrder =
      options.priority === 'stability'
        ? [0, 1, 2]
        : options.priority === 'speed'
        ? [2, 1, 0]
        : [1, 0, 2]

    for (const deckLevel of deckOrder) {
      if (placed) break
      const deck = ship.decks.find((d) => d.level === deckLevel)
      if (!deck) continue
      if (pending.dimensions.depth > deck.zEnd - deck.zStart) continue

      const positions: { x: number; y: number; z: number; score: number }[] = []

      const xMax = ship.length - pending.dimensions.width
      const yMax = ship.width - pending.dimensions.height
      const zMax = deck.zEnd - pending.dimensions.depth
      if (xMax < 0 || yMax < 0 || zMax < deck.zStart - 0.001) continue

      for (let x = 0; x <= xMax + 0.001; x += gridStep) {
        for (let y = 0; y <= yMax + 0.001; y += gridStep) {
          for (let z = deck.zStart; z <= zMax + 0.001; z += gridStep) {
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
      continue
    }
  }

  return result
}

export function createInitialCargoState(_ship: Ship): Cargo[] {
  return []
}
