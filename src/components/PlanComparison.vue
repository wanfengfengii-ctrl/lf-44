<template>
  <div class="plan-comparison">
    <div class="comparison-header">
      <h3>方案对比分析</h3>
      <button class="close-btn" @click="$emit('close')">
        <span>×</span>
      </button>
    </div>

    <div v-if="!comparison" class="empty-state">
      <div class="empty-icon">📊</div>
      <p>请先生成两种协同方案进行对比</p>
    </div>

    <div v-else class="comparison-content">
      <div class="plans-overview">
        <div class="plan-card efficiency">
          <div class="plan-icon">⚡</div>
          <div class="plan-info">
            <div class="plan-name">作业效率最优</div>
            <div class="plan-desc">追求最短作业时间，最大化设备利用率</div>
          </div>
          <div class="plan-badge">效率优先</div>
        </div>
        <div class="vs-badge">VS</div>
        <div class="plan-card stability">
          <div class="plan-icon">⚖️</div>
          <div class="plan-info">
            <div class="plan-name">航行稳性最优</div>
            <div class="plan-desc">追求最佳稳性状态，确保航行安全</div>
          </div>
          <div class="plan-badge">稳性优先</div>
        </div>
      </div>

      <div class="core-metrics">
        <div class="core-metric">
          <div class="metric-label">总作业时长</div>
          <div class="metric-compare">
            <div class="metric-side efficiency">
              <span class="metric-value">{{ getMetricValue('总作业时长', 'efficiency') }}</span>
              <span class="metric-tag" v-if="getBetter('总作业时长') === 'efficiency'">更优</span>
            </div>
            <div class="metric-arrow">→</div>
            <div class="metric-side stability">
              <span class="metric-value">{{ getMetricValue('总作业时长', 'stability') }}</span>
              <span class="metric-tag" v-if="getBetter('总作业时长') === 'stability'">更优</span>
            </div>
          </div>
        </div>

        <div class="core-metric">
          <div class="metric-label">离港准点率</div>
          <div class="metric-compare">
            <div class="metric-side efficiency">
              <span class="metric-value">{{ getMetricValue('离港准点率', 'efficiency') }}</span>
              <span class="metric-tag" v-if="getBetter('离港准点率') === 'efficiency'">更优</span>
            </div>
            <div class="metric-arrow">→</div>
            <div class="metric-side stability">
              <span class="metric-value">{{ getMetricValue('离港准点率', 'stability') }}</span>
              <span class="metric-tag" v-if="getBetter('离港准点率') === 'stability'">更优</span>
            </div>
          </div>
        </div>

        <div class="core-metric highlight">
          <div class="metric-label">装载安全评分</div>
          <div class="metric-compare">
            <div class="metric-side efficiency">
              <span class="metric-value">{{ getMetricValue('装载安全评分', 'efficiency') }}</span>
              <span class="metric-tag" v-if="getBetter('装载安全评分') === 'efficiency'">更优</span>
            </div>
            <div class="metric-arrow">→</div>
            <div class="metric-side stability">
              <span class="metric-value">{{ getMetricValue('装载安全评分', 'stability') }}</span>
              <span class="metric-tag" v-if="getBetter('装载安全评分') === 'stability'">更优</span>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-metrics">
        <div class="section-title">详细指标对比</div>
        <div class="metrics-table">
          <div class="table-header">
            <div class="th metric-name">指标</div>
            <div class="th efficiency-col">效率最优</div>
            <div class="th stability-col">稳性最优</div>
            <div class="th better-col">更优方案</div>
          </div>
          <div class="table-body">
            <div
              v-for="metric in comparison.metrics"
              :key="metric.metric"
              class="table-row"
              :class="{ highlight: isCoreMetric(metric.metric) }"
            >
              <div class="td metric-name">{{ metric.metric }}</div>
              <div class="td efficiency-col" :class="{ better: metric.better === 'efficiency' }">
                {{ metric.efficiency }}
              </div>
              <div class="td stability-col" :class="{ better: metric.better === 'stability' }">
                {{ metric.stability }}
              </div>
              <div class="td better-col">
                <span v-if="metric.better === 'efficiency'" class="better-tag efficiency">效率方案</span>
                <span v-else-if="metric.better === 'stability'" class="better-tag stability">稳性方案</span>
                <span v-else class="better-tag equal">持平</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="ship-comparison">
        <div class="section-title">各船稳性对比</div>
        <div class="ship-stats">
          <div
            v-for="(ship, index) in shipComparisons"
            :key="ship.shipId"
            class="ship-stat"
          >
            <div class="ship-name">{{ ship.shipName }}</div>
            <div class="ship-metrics">
              <div class="ship-metric">
                <span class="sm-label">安全评分</span>
                <div class="sm-compare">
                  <span class="sm-val efficiency" :class="{ best: ship.efficiencyScore > ship.stabilityScore }">
                    {{ ship.efficiencyScore.toFixed(0) }}
                  </span>
                  <span class="sm-divider">/</span>
                  <span class="sm-val stability" :class="{ best: ship.stabilityScore > ship.efficiencyScore }">
                    {{ ship.stabilityScore.toFixed(0) }}
                  </span>
                </div>
              </div>
              <div class="ship-metric">
                <span class="sm-label">最大倾角</span>
                <div class="sm-compare">
                  <span class="sm-val efficiency" :class="{ best: ship.efficiencyMaxTilt < ship.stabilityMaxTilt }">
                    {{ ship.efficiencyMaxTilt.toFixed(1) }}°
                  </span>
                  <span class="sm-divider">/</span>
                  <span class="sm-val stability" :class="{ best: ship.stabilityMaxTilt < ship.efficiencyMaxTilt }">
                    {{ ship.stabilityMaxTilt.toFixed(1) }}°
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="recommendation">
        <div class="rec-icon">💡</div>
        <div class="rec-content">
          <div class="rec-title">方案建议</div>
          <div class="rec-text">{{ recommendationText }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CooperativeComparison, CooperativePlan } from '@/types'

const props = defineProps<{
  comparison: CooperativeComparison | null
  efficiencyPlan: CooperativePlan | null
  stabilityPlan: CooperativePlan | null
}>()

defineEmits<{
  (e: 'close'): void
}>()

const coreMetrics = ['总作业时长', '离港准点率', '装载安全评分']

function getMetricValue(metricName: string, side: 'efficiency' | 'stability'): string {
  if (!props.comparison) return '-'
  const metric = props.comparison.metrics.find(m => m.metric === metricName)
  if (!metric) return '-'
  return side === 'efficiency' ? metric.efficiency : metric.stability
}

function getBetter(metricName: string): 'efficiency' | 'stability' | 'equal' {
  if (!props.comparison) return 'equal'
  const metric = props.comparison.metrics.find(m => m.metric === metricName)
  return metric?.better || 'equal'
}

function isCoreMetric(metricName: string): boolean {
  return coreMetrics.includes(metricName)
}

const shipComparisons = computed(() => {
  if (!props.efficiencyPlan || !props.stabilityPlan) return []

  const result: {
    shipId: string
    shipName: string
    efficiencyScore: number
    stabilityScore: number
    efficiencyMaxTilt: number
    stabilityMaxTilt: number
  }[] = []

  for (const effHistory of props.efficiencyPlan.balanceHistories) {
    const stabHistory = props.stabilityPlan.balanceHistories.find(
      h => h.shipId === effHistory.shipId
    )
    if (stabHistory) {
      result.push({
        shipId: effHistory.shipId,
        shipName: effHistory.shipName,
        efficiencyScore: effHistory.safetyScore,
        stabilityScore: stabHistory.safetyScore,
        efficiencyMaxTilt: effHistory.maxTiltAngle,
        stabilityMaxTilt: stabHistory.maxTiltAngle
      })
    }
  }

  return result
})

const recommendationText = computed(() => {
  if (!props.comparison) return ''

  const effWins = props.comparison.metrics.filter(m => m.better === 'efficiency').length
  const stabWins = props.comparison.metrics.filter(m => m.better === 'stability').length

  if (effWins > stabWins) {
    return '综合来看，作业效率最优方案在更多指标上表现更优。如果您重视作业速度和设备利用率，建议选择效率方案。但请注意稳性评分相对较低，需关注航行安全。'
  } else if (stabWins > effWins) {
    return '综合来看，航行稳性最优方案在更多指标上表现更优。如果您重视航行安全和稳性保障，建议选择稳性方案。但请注意作业时间可能会有所增加。'
  } else {
    return '两种方案各有优势，效率方案在作业时间上更优，稳性方案在安全评分上更佳。请根据实际业务需求权衡选择，或调整协同配置参数以获得更平衡的方案。'
  }
})
</script>

<style scoped>
.plan-comparison {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.comparison-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%);
  color: white;
  flex-shrink: 0;
}

.comparison-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 13px;
}

.comparison-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.plans-overview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.plan-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border-radius: 8px;
  border: 2px solid;
  position: relative;
}

.plan-card.efficiency {
  background: linear-gradient(135deg, #fff7e6 0%, #fff 100%);
  border-color: #fa8c16;
}

.plan-card.stability {
  background: linear-gradient(135deg, #e6f7ff 0%, #fff 100%);
  border-color: #1890ff;
}

.plan-icon {
  font-size: 28px;
}

.plan-info {
  flex: 1;
}

.plan-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 2px;
}

.plan-desc {
  font-size: 11px;
  color: #8c8c8c;
}

.plan-badge {
  position: absolute;
  top: -10px;
  right: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  color: white;
}

.plan-card.efficiency .plan-badge {
  background: #fa8c16;
}

.plan-card.stability .plan-badge {
  background: #1890ff;
}

.vs-badge {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #666;
  flex-shrink: 0;
}

.core-metrics {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
  padding: 14px;
  background: #fafafa;
  border-radius: 8px;
}

.core-metric {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.core-metric.highlight {
  padding: 10px;
  background: linear-gradient(135deg, #f6ffed 0%, #fff 100%);
  border-radius: 6px;
  border: 1px solid #b7eb8f;
}

.metric-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.metric-compare {
  display: flex;
  align-items: center;
  gap: 10px;
}

.metric-side {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.metric-side.efficiency {
  justify-content: flex-start;
}

.metric-side.stability {
  justify-content: flex-end;
}

.metric-value {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.metric-tag {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  background: #52c41a;
  color: white;
}

.metric-arrow {
  color: #bfbfbf;
  font-size: 14px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.detail-metrics {
  margin-bottom: 16px;
}

.metrics-table {
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 0.8fr;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
}

.th {
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #666;
  text-align: center;
}

.th.metric-name {
  text-align: left;
}

.table-body {
  max-height: 200px;
  overflow-y: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 0.8fr;
  border-bottom: 1px solid #f0f0f0;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row.highlight {
  background: #f6ffed;
}

.td {
  padding: 8px 10px;
  font-size: 11px;
  color: #333;
  text-align: center;
}

.td.metric-name {
  text-align: left;
  font-weight: 500;
}

.td.better {
  font-weight: 600;
  color: #52c41a;
}

.td.efficiency-col.better {
  color: #fa8c16;
}

.td.stability-col.better {
  color: #1890ff;
}

.better-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.better-tag.efficiency {
  background: #fff7e6;
  color: #fa8c16;
}

.better-tag.stability {
  background: #e6f7ff;
  color: #1890ff;
}

.better-tag.equal {
  background: #f5f5f5;
  color: #8c8c8c;
}

.ship-comparison {
  margin-bottom: 16px;
}

.ship-stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}

.ship-stat {
  padding: 10px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.ship-name {
  font-size: 12px;
  font-weight: 600;
  color: #1e3a5f;
  margin-bottom: 8px;
}

.ship-metrics {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ship-metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sm-label {
  font-size: 10px;
  color: #8c8c8c;
}

.sm-compare {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.sm-val {
  font-weight: 600;
  color: #666;
}

.sm-val.efficiency {
  color: #fa8c16;
}

.sm-val.stability {
  color: #1890ff;
}

.sm-val.best {
  font-size: 12px;
  color: #52c41a;
}

.sm-divider {
  color: #d9d9d9;
}

.recommendation {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: linear-gradient(135deg, #fffbe6 0%, #fff 100%);
  border-radius: 8px;
  border: 1px solid #ffe58f;
}

.rec-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.rec-content {
  flex: 1;
}

.rec-title {
  font-size: 13px;
  font-weight: 600;
  color: #d48806;
  margin-bottom: 4px;
}

.rec-text {
  font-size: 11px;
  color: #666;
  line-height: 1.6;
}
</style>
