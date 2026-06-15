import type { Cargo } from './cargo'

export interface CenterOfGravity {
  x: number
  y: number
}

export interface CenterOfGravity3D extends CenterOfGravity {
  z: number
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

export interface HoldZone {
  name: string
  x: number
  y: number
  width: number
  height: number
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

export interface HoldZoneLoad {
  zoneId: string
  zoneName: string
  load: number
  maxLoad: number
  overloadRatio: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

export interface StepBalanceSnapshot {
  stepIndex: number
  operationType: import('./cargo').OperationType
  cargoName: string
  cargoWeight: number
  balance: BalanceResult
  stabilityDelta: number
  tiltDelta: number
}

export interface ShipBalanceHistory {
  shipId: string
  shipName: string
  initialBalance: BalanceResult
  stepSnapshots: StepBalanceSnapshot[]
  finalBalance: BalanceResult
  minStabilityScore: number
  maxTiltAngle: number
  safetyScore: number
}
