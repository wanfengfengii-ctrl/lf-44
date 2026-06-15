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

export interface Deck {
  id: string
  name: string
  level: number
  zStart: number
  zEnd: number
  maxLoad: number
  restricted?: boolean
}

export interface HoldZone3D {
  id: string
  name: string
  deckLevel: number
  x: number
  y: number
  width: number
  height: number
  maxWeightPerSquareMeter: number
  currentWeight: number
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

export interface CenterOfGravity {
  x: number
  y: number
}

export interface CenterOfGravity3D extends CenterOfGravity {
  z: number
}

export interface BalanceResult {
  totalWeight: number
  centerOfGravity: CenterOfGravity3D
  leftWeight: number
  rightWeight: number
  frontWeight: number
  backWeight: number
  leftRightDiff: number
  frontBackDiff: number
  leftRightTilt: number
  frontBackTilt: number
  draft: number
  draftBow: number
  draftStern: number
  loadPercentage: number
  metacentricHeight: number
  stabilityScore: number
  deckLoads: { deckId: string; deckName: string; load: number; maxLoad: number; overload: boolean }[]
  holdOverloads: { zoneId: string; zoneName: string; load: number; maxLoad: number; overloadRatio: number }[]
}

export interface WarningItem {
  type: 'error' | 'warning' | 'info'
  message: string
  cargoId?: string
  zoneId?: string
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

export interface LoadingPlan {
  id: string
  name: string
  cargos: Cargo[]
  balance: BalanceResult
  createdAt: Date
  score: number
}

export interface PlanComparison {
  manualPlan: {
    name: string
    balance: BalanceResult
    stabilityScore: number
  }
  recommendedPlan: {
    name: string
    balance: BalanceResult
    stabilityScore: number
  }
  differences: {
    metric: string
    manual: string
    recommended: string
    better: 'manual' | 'recommended' | 'equal'
  }[]
}

export interface AutoStowageOptions {
  priority: 'balance' | 'space' | 'stability' | 'speed'
  allowStacking: boolean
  maxStackLayers: number
}
