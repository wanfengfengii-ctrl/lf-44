import type { BalanceResult, PlanComparison } from '@/types'

export function comparePlans(
  manualBalance: BalanceResult,
  recommendedBalance: BalanceResult,
  manualName: string = '手动方案',
  recommendedName: string = '推荐方案'
): PlanComparison {
  const lowerBetter = (a: number, b: number): 'manual' | 'recommended' | 'equal' =>
    a < b ? 'manual' : a > b ? 'recommended' : 'equal'
  const higherBetter = (a: number, b: number): 'manual' | 'recommended' | 'equal' =>
    a > b ? 'manual' : a < b ? 'recommended' : 'equal'
  const closerToZero = (a: number, b: number): 'manual' | 'recommended' | 'equal' =>
    Math.abs(a) < Math.abs(b) ? 'manual' : Math.abs(a) > Math.abs(b) ? 'recommended' : 'equal'

  return {
    manualPlan: {
      name: manualName,
      balance: manualBalance,
      stabilityScore: manualBalance.stabilityScore
    },
    recommendedPlan: {
      name: recommendedName,
      balance: recommendedBalance,
      stabilityScore: recommendedBalance.stabilityScore
    },
    differences: [
      {
        metric: '稳性评分',
        manual: `${manualBalance.stabilityScore.toFixed(0)} 分`,
        recommended: `${recommendedBalance.stabilityScore.toFixed(0)} 分`,
        better: higherBetter(manualBalance.stabilityScore, recommendedBalance.stabilityScore)
      },
      {
        metric: '横倾角度',
        manual: `${Math.abs(manualBalance.leftRightTilt).toFixed(2)}°`,
        recommended: `${Math.abs(recommendedBalance.leftRightTilt).toFixed(2)}°`,
        better: closerToZero(manualBalance.leftRightTilt, recommendedBalance.leftRightTilt)
      },
      {
        metric: '纵倾角度',
        manual: `${Math.abs(manualBalance.frontBackTilt).toFixed(2)}°`,
        recommended: `${Math.abs(recommendedBalance.frontBackTilt).toFixed(2)}°`,
        better: closerToZero(manualBalance.frontBackTilt, recommendedBalance.frontBackTilt)
      },
      {
        metric: '重心高度',
        manual: `${manualBalance.centerOfGravity.z.toFixed(2)} m`,
        recommended: `${recommendedBalance.centerOfGravity.z.toFixed(2)} m`,
        better: lowerBetter(manualBalance.centerOfGravity.z, recommendedBalance.centerOfGravity.z)
      },
      {
        metric: '左右差值',
        manual: `${Math.abs(manualBalance.leftRightDiff).toFixed(1)} 吨`,
        recommended: `${Math.abs(recommendedBalance.leftRightDiff).toFixed(1)} 吨`,
        better: lowerBetter(
          Math.abs(manualBalance.leftRightDiff),
          Math.abs(recommendedBalance.leftRightDiff)
        )
      },
      {
        metric: '前后差值',
        manual: `${Math.abs(manualBalance.frontBackDiff).toFixed(1)} 吨`,
        recommended: `${Math.abs(recommendedBalance.frontBackDiff).toFixed(1)} 吨`,
        better: lowerBetter(
          Math.abs(manualBalance.frontBackDiff),
          Math.abs(recommendedBalance.frontBackDiff)
        )
      },
      {
        metric: '超载舱位数',
        manual: `${manualBalance.holdOverloads.filter((h) => h.overloadRatio > 1).length} 个`,
        recommended: `${recommendedBalance.holdOverloads.filter((h) => h.overloadRatio > 1).length} 个`,
        better: lowerBetter(
          manualBalance.holdOverloads.filter((h) => h.overloadRatio > 1).length,
          recommendedBalance.holdOverloads.filter((h) => h.overloadRatio > 1).length
        )
      }
    ]
  }
}
