export interface Position {
  x: number
  y: number
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
  position: Position
  dimensions: CargoDimensions
  color: string
  rotate: number
}

export interface Ship {
  length: number
  width: number
  maxLoad: number
  hullDepth: number
  leftRightBalanceThreshold: number
  frontBackBalanceThreshold: number
}

export interface CenterOfGravity {
  x: number
  y: number
}

export interface BalanceResult {
  totalWeight: number
  centerOfGravity: CenterOfGravity
  leftWeight: number
  rightWeight: number
  frontWeight: number
  backWeight: number
  leftRightDiff: number
  frontBackDiff: number
  leftRightTilt: number
  frontBackTilt: number
  draft: number
  loadPercentage: number
}

export interface WarningItem {
  type: 'error' | 'warning' | 'info'
  message: string
}

export interface ValidationResult {
  valid: boolean
  warnings: WarningItem[]
  canSave: boolean
}

export interface HoldZone {
  name: string
  x: number
  y: number
  width: number
  height: number
}
