import type { CargoTask, OperationType, LoadingOrderStrategy } from './cargo'
import type { ShipTask } from './ship'

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
