export interface Position {
  x: number
  y: number
}

export interface Position3D extends Position {
  z: number
}

export interface CargoDimensions {
  width: number
  height: number
  depth: number
}

export interface Cargo {
  id: string
  name: string
  weight: number
  position: Position3D
  dimensions: CargoDimensions
  color: string
  rotate: number
  stackOrder: number
  deckLevel: number
  fragile?: boolean
  priority?: number
}

export interface PendingCargo {
  id: string
  name: string
  weight: number
  dimensions: CargoDimensions
  color: string
  fragile?: boolean
  priority?: number
}

export interface AutoStowageOptions {
  priority: 'balance' | 'space' | 'stability' | 'speed'
  allowStacking: boolean
  maxStackLayers: number
}

export type OperationType = 'load' | 'unload'

export interface CargoTask {
  id: string
  cargoId: string
  cargoName: string
  weight: number
  fragile: boolean
  priority: number
  operationType: OperationType
  shipId: string
  estimatedArrival: number
}
