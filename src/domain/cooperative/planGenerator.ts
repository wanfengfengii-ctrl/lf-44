import type {
  ScheduleConfig,
  ShipTask,
  CooperativePlan,
  CooperativeComparison,
  OptimizationStrategy,
  ShipBalanceHistory
} from '@/types'
import type { Ship } from '@/types'
import { runStabilityAwareSimulation } from '../scheduling/simulator'
import { generateBalanceHistory } from './balanceHistory'
import { createShipForCoop } from '../common/shipFactory'
import { formatDuration } from '../common/format'

export function generateCooperativePlan(
  config: ScheduleConfig,
  ships: ShipTask[],
  strategy: OptimizationStrategy,
  shipModel?: Ship
): CooperativePlan {
  const ship = shipModel || createShipForCoop()

  const scheduleResult = runStabilityAwareSimulation(config, ships, strategy)

  const balanceHistories: ShipBalanceHistory[] = ships.map((shipTask) => {
    const shipLoadOrders = scheduleResult.optimalLoadingOrder.filter(
      (c) => c.shipId === shipTask.id
    )
    const shipUnloadOrders = scheduleResult.optimalUnloadingOrder.filter(
      (c) => c.shipId === shipTask.id
    )

    const history = generateBalanceHistory(
      ship,
      shipTask.loadCargos,
      shipTask.unloadCargos,
      shipLoadOrders,
      shipUnloadOrders
    )

    return {
      ...history,
      shipId: shipTask.id,
      shipName: shipTask.name
    }
  })

  const totalSafetyScore =
    balanceHistories.length > 0
      ? balanceHistories.reduce((sum, h) => sum + h.safetyScore, 0) / balanceHistories.length
      : 100

  const avgStabilityScore =
    balanceHistories.length > 0
      ? balanceHistories.reduce((sum, h) => sum + h.finalBalance.stabilityScore, 0) /
        balanceHistories.length
      : 100

  const onTimeShips = scheduleResult.delayRisks.filter((d) => d.delayMinutes <= 0).length
  const onTimeRate = ships.length > 0 ? (onTimeShips / ships.length) * 100 : 100

  return {
    id: `plan-${strategy}-${Date.now()}`,
    name: strategy === 'efficiency' ? '作业效率最优方案' : '航行稳性最优方案',
    strategy,
    scheduleResult,
    balanceHistories,
    overallSafetyScore: totalSafetyScore,
    averageStabilityScore: avgStabilityScore,
    onTimeRate,
    totalOperationTime: scheduleResult.totalSimulationTime
  }
}

export function compareCooperativePlans(
  efficiencyPlan: CooperativePlan,
  stabilityPlan: CooperativePlan
): CooperativeComparison {
  const metrics = [
    {
      metric: '总作业时长',
      efficiency: formatDuration(efficiencyPlan.totalOperationTime),
      stability: formatDuration(stabilityPlan.totalOperationTime),
      better:
        efficiencyPlan.totalOperationTime <= stabilityPlan.totalOperationTime
          ? 'efficiency'
          : ('stability' as 'efficiency' | 'stability' | 'equal'),
      unit: '时间'
    },
    {
      metric: '离港准点率',
      efficiency: `${efficiencyPlan.onTimeRate.toFixed(1)}%`,
      stability: `${stabilityPlan.onTimeRate.toFixed(1)}%`,
      better:
        efficiencyPlan.onTimeRate >= stabilityPlan.onTimeRate
          ? efficiencyPlan.onTimeRate === stabilityPlan.onTimeRate
            ? 'equal'
            : 'efficiency'
          : ('stability' as 'efficiency' | 'stability' | 'equal'),
      unit: '百分比'
    },
    {
      metric: '装载安全评分',
      efficiency: `${efficiencyPlan.overallSafetyScore.toFixed(0)} 分`,
      stability: `${stabilityPlan.overallSafetyScore.toFixed(0)} 分`,
      better:
        efficiencyPlan.overallSafetyScore <= stabilityPlan.overallSafetyScore
          ? 'stability'
          : ('efficiency' as 'efficiency' | 'stability' | 'equal'),
      unit: '分数'
    },
    {
      metric: '平均稳性评分',
      efficiency: `${efficiencyPlan.averageStabilityScore.toFixed(0)} 分`,
      stability: `${stabilityPlan.averageStabilityScore.toFixed(0)} 分`,
      better:
        efficiencyPlan.averageStabilityScore <= stabilityPlan.averageStabilityScore
          ? 'stability'
          : ('efficiency' as 'efficiency' | 'stability' | 'equal'),
      unit: '分数'
    },
    {
      metric: '作业船舶数',
      efficiency: `${efficiencyPlan.scheduleResult.summary.totalShips} 艘`,
      stability: `${stabilityPlan.scheduleResult.summary.totalShips} 艘`,
      better: 'equal' as 'efficiency' | 'stability' | 'equal',
      unit: '数量'
    },
    {
      metric: '延误船舶数',
      efficiency: `${efficiencyPlan.scheduleResult.summary.delayedShips} 艘`,
      stability: `${stabilityPlan.scheduleResult.summary.delayedShips} 艘`,
      better:
        efficiencyPlan.scheduleResult.summary.delayedShips <=
        stabilityPlan.scheduleResult.summary.delayedShips
          ? efficiencyPlan.scheduleResult.summary.delayedShips ===
            stabilityPlan.scheduleResult.summary.delayedShips
            ? 'equal'
            : 'efficiency'
          : ('stability' as 'efficiency' | 'stability' | 'equal'),
      unit: '数量'
    },
    {
      metric: '吊机平均利用率',
      efficiency: `${(efficiencyPlan.scheduleResult.summary.averageCraneUtilization * 100).toFixed(1)}%`,
      stability: `${(stabilityPlan.scheduleResult.summary.averageCraneUtilization * 100).toFixed(1)}%`,
      better:
        efficiencyPlan.scheduleResult.summary.averageCraneUtilization >=
        stabilityPlan.scheduleResult.summary.averageCraneUtilization
          ? efficiencyPlan.scheduleResult.summary.averageCraneUtilization ===
            stabilityPlan.scheduleResult.summary.averageCraneUtilization
            ? 'equal'
            : 'efficiency'
          : ('stability' as 'efficiency' | 'stability' | 'equal'),
      unit: '百分比'
    }
  ]

  return {
    efficiencyPlan,
    stabilityPlan,
    metrics
  }
}

export function getDefaultCooperativeConfig() {
  return {
    minStabilityThreshold: 60,
    maxTiltThreshold: 8,
    stabilityWeight: 0.5,
    efficiencyWeight: 0.5,
    enableBalancedLoading: true,
    enableStabilityCheckEachStep: true
  }
}
