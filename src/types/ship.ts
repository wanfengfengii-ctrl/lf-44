import type { Deck, HoldZone3D, HoldZone } from './balance'

export interface Ship {
  length: number
  width: number
  maxLoad: number
  hullDepth: number
  leftRightBalanceThreshold: number
  frontBackBalanceThreshold: number
  decks: Deck[]
  maxStackWeight: number
  metacentricHeight: number
  lightDisplacement: number
}

export interface ShipTask {
  id: string
  name: string
  arrivalTime: number
  scheduledDepartureTime: number
  loadCargos: import('./cargo').CargoTask[]
  unloadCargos: import('./cargo').CargoTask[]
  requiredBerthCapacity: number
}

export type LoadingOrderStrategy = 'fifo' | 'weight_desc' | 'weight_asc' | 'priority' | 'fragile_last'

export { HoldZone3D, HoldZone }
