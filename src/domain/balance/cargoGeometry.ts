import type { Cargo, CenterOfGravity3D } from '@/types'
import type { Ship } from '@/types'

export function getCargoCenter(cargo: Cargo): { x: number; y: number } {
  return {
    x: cargo.position.x + cargo.dimensions.width / 2,
    y: cargo.position.y + cargo.dimensions.height / 2
  }
}

export function getCargoCenter3D(cargo: Cargo): CenterOfGravity3D {
  return {
    x: cargo.position.x + cargo.dimensions.width / 2,
    y: cargo.position.y + cargo.dimensions.height / 2,
    z: cargo.position.z + cargo.dimensions.depth / 2
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

export function doCargosOverlap(cargo1: Cargo, cargo2: Cargo): boolean {
  if (cargo1.deckLevel !== cargo2.deckLevel) return false
  return !(
    cargo1.position.x + cargo1.dimensions.width <= cargo2.position.x ||
    cargo2.position.x + cargo2.dimensions.width <= cargo1.position.x ||
    cargo1.position.y + cargo1.dimensions.height <= cargo2.position.y ||
    cargo2.position.y + cargo2.dimensions.height <= cargo1.position.y
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
