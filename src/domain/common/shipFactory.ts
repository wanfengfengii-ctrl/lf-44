import type { Ship, Deck, HoldZone3D } from '@/types'

export function generateDefaultDecks(ship: Ship): Deck[] {
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

export function createDefaultShip(): Ship {
  const ship: Ship = {
    length: 100,
    width: 30,
    maxLoad: 500,
    hullDepth: 6,
    leftRightBalanceThreshold: 0.15,
    frontBackBalanceThreshold: 0.2,
    decks: [],
    maxStackWeight: 100,
    metacentricHeight: 1.5,
    lightDisplacement: 200
  }
  ship.decks = generateDefaultDecks(ship)
  return ship
}

export function createShipForCoop(): Ship {
  return {
    length: 100,
    width: 30,
    maxLoad: 500,
    hullDepth: 6,
    leftRightBalanceThreshold: 0.15,
    frontBackBalanceThreshold: 0.2,
    decks: [
      { id: 'deck-1', name: '底舱', level: 0, zStart: 0, zEnd: 2, maxLoad: 225, restricted: false },
      { id: 'deck-2', name: '中舱', level: 1, zStart: 2, zEnd: 4, maxLoad: 175, restricted: false },
      { id: 'deck-3', name: '主甲板', level: 2, zStart: 4, zEnd: 6, maxLoad: 100, restricted: false }
    ],
    maxStackWeight: 100,
    metacentricHeight: 1.5,
    lightDisplacement: 200
  }
}
