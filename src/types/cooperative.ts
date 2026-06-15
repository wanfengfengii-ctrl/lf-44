import type { ScheduleResult } from './schedule'
import type { ShipBalanceHistory } from './balance'

export type OptimizationStrategy = 'efficiency' | 'stability'

export interface CooperativePlan {
  id: string
  name: string
  strategy: OptimizationStrategy
  scheduleResult: ScheduleResult
  balanceHistories: ShipBalanceHistory[]
  overallSafetyScore: number
  averageStabilityScore: number
  onTimeRate: number
  totalOperationTime: number
}

export interface CooperativeComparison {
  efficiencyPlan: CooperativePlan
  stabilityPlan: CooperativePlan
  metrics: {
    metric: string
    efficiency: string
    stability: string
    better: 'efficiency' | 'stability' | 'equal'
    unit: string
  }[]
}

export interface CooperativeConfig {
  minStabilityThreshold: number
  maxTiltThreshold: number
  stabilityWeight: number
  efficiencyWeight: number
  enableBalancedLoading: boolean
  enableStabilityCheckEachStep: boolean
}
