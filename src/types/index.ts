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

export interface Berth {
  id: string
  name: string
  capacity: number
  craneCount: number
  available: boolean
}

export interface Crane {
  id: string
  name: string
  maxLiftWeight: number
  efficiency: number
  currentBerthId: string | null
}

export interface WorkShift {
  id: string
  name: string
  startTime: number
  endTime: number
  workerCount: number
  efficiencyMultiplier: number
}

export type OperationType = 'load' | 'unload'
export type LoadingOrderStrategy = 'fifo' | 'weight_desc' | 'weight_asc' | 'priority' | 'fragile_last'

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

export interface ShipTask {
  id: string
  name: string
  arrivalTime: number
  scheduledDepartureTime: number
  loadCargos: CargoTask[]
  unloadCargos: CargoTask[]
  requiredBerthCapacity: number
}

export interface OperationStep {
  id: string
  cargoTaskId: string
  cargoName: string
  shipId: string
  shipName: string
  operationType: OperationType
  weight: number
  berthId: string
  berthName: string
  craneId: string
  craneName: string
  startTime: number
  endTime: number
  duration: number
  queueWaitTime: number
}

export interface BerthOccupancy {
  berthId: string
  berthName: string
  intervals: {
    shipId: string
    shipName: string
    startTime: number
    endTime: number
    operationType: 'berthing' | 'unloading' | 'loading' | 'departure'
  }[]
}

export interface CraneUtilization {
  craneId: string
  craneName: string
  totalWorkTime: number
  totalIdleTime: number
  utilizationRate: number
  operations: number
  totalWeight: number
}

export interface CongestionPoint {
  type: 'berth' | 'crane' | 'queue'
  name: string
  startTime: number
  endTime: number
  duration: number
  severity: 'low' | 'medium' | 'high'
  affectedShips: string[]
}

export interface DelayRisk {
  shipId: string
  shipName: string
  scheduledDeparture: number
  actualFinishTime: number
  delayMinutes: number
  riskLevel: 'none' | 'low' | 'medium' | 'high'
  reason: string
}

export interface ScheduleConfig {
  berths: Berth[]
  cranes: Crane[]
  shifts: WorkShift[]
  loadingOrderStrategy: LoadingOrderStrategy
  unloadingOrderStrategy: LoadingOrderStrategy
  averageLiftTime: number
  queueBufferTime: number
  shipPreparationTime: number
}

export interface ScheduleResult {
  totalSimulationTime: number
  totalOperationTime: number
  operationSteps: OperationStep[]
  berthOccupancies: BerthOccupancy[]
  craneUtilizations: CraneUtilization[]
  congestionPoints: CongestionPoint[]
  delayRisks: DelayRisk[]
  optimalLoadingOrder: CargoTask[]
  optimalUnloadingOrder: CargoTask[]
  canMeetDepartureDeadline: boolean
  summary: {
    totalShips: number
    totalLoadCargos: number
    totalUnloadCargos: number
    totalWeight: number
    averageCraneUtilization: number
    averageQueueTime: number
    congestionCount: number
    delayedShips: number
  }
}

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'completed'
