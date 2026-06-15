import type { BalanceResult, Ship } from '@/types'

export function calculateStabilityScore(balance: BalanceResult, ship: Ship): number {
  let score = 100

  const lrRatio = balance.totalWeight > 0 ? Math.abs(balance.leftRightDiff) / balance.totalWeight : 0
  const fbRatio = balance.totalWeight > 0 ? Math.abs(balance.frontBackDiff) / balance.totalWeight : 0

  if (lrRatio > ship.leftRightBalanceThreshold * 1.5) score -= 30
  else if (lrRatio > ship.leftRightBalanceThreshold) score -= 15
  else if (lrRatio > ship.leftRightBalanceThreshold * 0.5) score -= 5

  if (fbRatio > ship.frontBackBalanceThreshold * 1.5) score -= 25
  else if (fbRatio > ship.frontBackBalanceThreshold) score -= 12
  else if (fbRatio > ship.frontBackBalanceThreshold * 0.5) score -= 4

  const idealZ = ship.hullDepth * 0.35
  const zRatio = Math.abs(balance.centerOfGravity.z - idealZ) / ship.hullDepth
  if (zRatio > 0.4) score -= 20
  else if (zRatio > 0.25) score -= 10
  else if (zRatio > 0.1) score -= 5

  if (balance.loadPercentage > 100) score -= 40
  else if (balance.loadPercentage > 95) score -= 15
  else if (balance.loadPercentage > 85) score -= 5

  balance.holdOverloads.forEach((h) => {
    if (h.overloadRatio > 1.2) score -= 20
    else if (h.overloadRatio > 1) score -= 10
    else if (h.overloadRatio > 0.9) score -= 5
  })

  balance.deckLoads.forEach((d) => {
    if (d.overload) score -= 15
  })

  return Math.max(0, Math.min(100, score))
}
