import type { BalanceResult, StepBalanceSnapshot, ShipBalanceHistory } from '@/types'
import type { ScheduleResult, OperationStep, CraneUtilization, BerthOccupancy } from '@/types'
import type { CooperativePlan } from '@/types'

export interface BalanceChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    color?: string
  }[]
}

export function buildStabilityChartData(
  history: ShipBalanceHistory
): BalanceChartData {
  const labels = history.stepSnapshots.map((s) => `${s.stepIndex + 1}. ${s.cargoName}`)
  const stabilityData = history.stepSnapshots.map((s) => s.balance.stabilityScore)

  return {
    labels,
    datasets: [
      {
        label: '稳性评分',
        data: stabilityData,
        color: '#4A90D9'
      }
    ]
  }
}

export function buildTiltChartData(history: ShipBalanceHistory): BalanceChartData {
  const labels = history.stepSnapshots.map((s) => `${s.stepIndex + 1}. ${s.cargoName}`)
  const leftRightData = history.stepSnapshots.map((s) => s.balance.leftRightTilt)
  const frontBackData = history.stepSnapshots.map((s) => s.balance.frontBackTilt)

  return {
    labels,
    datasets: [
      {
        label: '横倾角',
        data: leftRightData,
        color: '#E67E22'
      },
      {
        label: '纵倾角',
        data: frontBackData,
        color: '#27AE60'
      }
    ]
  }
}

export function buildWeightDistributionChartData(
  balance: BalanceResult
): BalanceChartData {
  return {
    labels: ['左舷', '右舷', '船首', '船尾'],
    datasets: [
      {
        label: '重量 (吨)',
        data: [
          balance.leftWeight,
          balance.rightWeight,
          balance.frontWeight,
          balance.backWeight
        ],
        color: '#8E44AD'
      }
    ]
  }
}

export function buildDeckLoadChartData(balance: BalanceResult): BalanceChartData {
  const labels = balance.deckLoads.map((d) => d.deckName)
  const loadData = balance.deckLoads.map((d) => d.load)
  const maxLoadData = balance.deckLoads.map((d) => d.maxLoad)

  return {
    labels,
    datasets: [
      {
        label: '当前载荷',
        data: loadData,
        color: '#4A90D9'
      },
      {
        label: '最大载荷',
        data: maxLoadData,
        color: '#C0392B'
      }
    ]
  }
}

export function buildCraneUtilizationChartData(
  utilizations: CraneUtilization[]
): BalanceChartData {
  const labels = utilizations.map((u) => u.craneName)
  const workData = utilizations.map((u) => u.totalWorkTime)
  const idleData = utilizations.map((u) => u.totalIdleTime)

  return {
    labels,
    datasets: [
      {
        label: '工作时间',
        data: workData,
        color: '#27AE60'
      },
      {
        label: '空闲时间',
        data: idleData,
        color: '#7F8C8D'
      }
    ]
  }
}

export function buildTimelineChartData(
  berthOccupancies: BerthOccupancy[]
): { berthName: string; intervals: { label: string; start: number; end: number; type: string }[] }[] {
  return berthOccupancies.map((bo) => ({
    berthName: bo.berthName,
    intervals: bo.intervals.map((i) => ({
      label: i.shipName,
      start: i.startTime,
      end: i.endTime,
      type: i.operationType
    }))
  }))
}

export interface GanttChartItem {
  id: string
  name: string
  start: number
  end: number
  group: string
  type: string
}

export function buildGanttChartData(scheduleResult: ScheduleResult): GanttChartItem[] {
  const items: GanttChartItem[] = []

  scheduleResult.operationSteps.forEach((step) => {
    items.push({
      id: step.id,
      name: step.cargoName,
      start: step.startTime,
      end: step.endTime,
      group: step.craneName,
      type: step.operationType
    })
  })

  return items.sort((a, b) => a.start - b.start)
}

export function buildCooperativeComparisonChartData(
  plan: CooperativePlan
): { labels: string[]; values: number[] } {
  return {
    labels: ['安全评分', '稳性评分', '准点率', '作业效率'],
    values: [
      plan.overallSafetyScore,
      plan.averageStabilityScore,
      plan.onTimeRate,
      Math.max(0, 100 - (plan.totalOperationTime / 10))
    ]
  }
}
