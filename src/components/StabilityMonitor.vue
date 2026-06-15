<template>
  <div class="stability-monitor">
    <div class="monitor-header">
      <h3>稳性实时监控</h3>
      <div v-if="currentSnapshot" class="step-badge">
        步骤 {{ stepIndex + 1 }} / {{ totalSteps }}
      </div>
    </div>

    <div v-if="!balance" class="empty-state">
      <div class="empty-icon">⚖️</div>
      <p>选择船舶并开始查看稳性数据</p>
    </div>

    <div v-else class="monitor-content">
      <div class="stability-score-section">
        <div class="score-ring" :class="scoreLevel">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" class="score-bg" />
            <circle
              cx="50" cy="50" r="42"
              class="score-fill"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="scoreOffset"
            />
          </svg>
          <div class="score-text">
            <div class="score-value">{{ balance.stabilityScore.toFixed(0) }}</div>
            <div class="score-label">稳性评分</div>
          </div>
        </div>
        <div v-if="currentSnapshot" class="score-delta" :class="deltaClass">
          <span class="delta-icon">{{ stabilityDelta >= 0 ? '↑' : '↓' }}</span>
          {{ Math.abs(stabilityDelta).toFixed(1) }} 分
        </div>
      </div>

      <div class="tilt-section">
        <div class="tilt-item">
          <div class="tilt-label">横倾 (左右)</div>
          <div class="tilt-bar">
            <div class="tilt-track">
              <div
                class="tilt-fill left"
                :style="{ width: leftTiltPercent + '%' }"
              ></div>
              <div
                class="tilt-fill right"
                :style="{ width: rightTiltPercent + '%' }"
              ></div>
              <div class="tilt-center"></div>
            </div>
            <div class="tilt-value" :class="{ warning: Math.abs(balance.leftRightTilt) > 5 }">
              {{ balance.leftRightTilt >= 0 ? '右' : '左' }} {{ Math.abs(balance.leftRightTilt).toFixed(2) }}°
            </div>
          </div>
        </div>

        <div class="tilt-item">
          <div class="tilt-label">纵倾 (前后)</div>
          <div class="tilt-bar vertical">
            <div class="tilt-track">
              <div
                class="tilt-fill front"
                :style="{ height: frontTiltPercent + '%' }"
              ></div>
              <div
                class="tilt-fill back"
                :style="{ height: backTiltPercent + '%' }"
              ></div>
              <div class="tilt-center-h"></div>
            </div>
            <div class="tilt-value" :class="{ warning: Math.abs(balance.frontBackTilt) > 5 }">
              {{ balance.frontBackTilt >= 0 ? '前' : '后' }} {{ Math.abs(balance.frontBackTilt).toFixed(2) }}°
            </div>
          </div>
        </div>
      </div>

      <div class="cog-section">
        <div class="section-title">重心位置</div>
        <div class="cog-grid">
          <div class="cog-item">
            <span class="cog-label">X (纵向)</span>
            <span class="cog-value">{{ balance.centerOfGravity.x.toFixed(2) }} m</span>
          </div>
          <div class="cog-item">
            <span class="cog-label">Y (横向)</span>
            <span class="cog-value">{{ balance.centerOfGravity.y.toFixed(2) }} m</span>
          </div>
          <div class="cog-item">
            <span class="cog-label">Z (垂向)</span>
            <span class="cog-value">{{ balance.centerOfGravity.z.toFixed(2) }} m</span>
          </div>
        </div>
      </div>

      <div class="draft-section">
        <div class="section-title">吃水深度</div>
        <div class="draft-grid">
          <div class="draft-item">
            <span class="draft-label">平均吃水</span>
            <span class="draft-value">{{ balance.draft.toFixed(2) }} m</span>
          </div>
          <div class="draft-item">
            <span class="draft-label">首吃水</span>
            <span class="draft-value">{{ balance.draftBow.toFixed(2) }} m</span>
          </div>
          <div class="draft-item">
            <span class="draft-label">尾吃水</span>
            <span class="draft-value">{{ balance.draftStern.toFixed(2) }} m</span>
          </div>
        </div>
      </div>

      <div class="weight-section">
        <div class="section-title">载荷分布</div>
        <div class="weight-bars">
          <div class="weight-row">
            <span class="weight-label">左舷</span>
            <div class="weight-bar-track">
              <div class="weight-bar-fill left" :style="{ width: leftWeightPercent + '%' }"></div>
            </div>
            <span class="weight-value">{{ balance.leftWeight.toFixed(1) }}T</span>
          </div>
          <div class="weight-row">
            <span class="weight-label">右舷</span>
            <div class="weight-bar-track">
              <div class="weight-bar-fill right" :style="{ width: rightWeightPercent + '%' }"></div>
            </div>
            <span class="weight-value">{{ balance.rightWeight.toFixed(1) }}T</span>
          </div>
          <div class="weight-row">
            <span class="weight-label">前部</span>
            <div class="weight-bar-track">
              <div class="weight-bar-fill front" :style="{ width: frontWeightPercent + '%' }"></div>
            </div>
            <span class="weight-value">{{ balance.frontWeight.toFixed(1) }}T</span>
          </div>
          <div class="weight-row">
            <span class="weight-label">后部</span>
            <div class="weight-bar-track">
              <div class="weight-bar-fill back" :style="{ width: backWeightPercent + '%' }"></div>
            </div>
            <span class="weight-value">{{ balance.backWeight.toFixed(1) }}T</span>
          </div>
        </div>
      </div>

      <div class="deck-section">
        <div class="section-title">甲板载荷</div>
        <div class="deck-list">
          <div
            v-for="deck in balance.deckLoads"
            :key="deck.deckId"
            class="deck-item"
            :class="{ overload: deck.overload, warning: deck.load > deck.maxLoad * 0.8 && !deck.overload }"
          >
            <span class="deck-name">{{ deck.deckName }}</span>
            <div class="deck-bar">
              <div
                class="deck-bar-fill"
                :style="{ width: Math.min(100, (deck.load / deck.maxLoad) * 100) + '%' }"
              ></div>
            </div>
            <span class="deck-value">{{ deck.load.toFixed(0) }} / {{ deck.maxLoad.toFixed(0) }}T</span>
          </div>
        </div>
      </div>

      <div v-if="balance.holdOverloads.length > 0" class="overload-section">
        <div class="section-title warning">
          <span class="warning-icon">⚠</span>
          局部超载预警
        </div>
        <div class="overload-list">
          <div
            v-for="ho in balance.holdOverloads"
            :key="ho.zoneId"
            class="overload-item"
            :class="{ danger: ho.overloadRatio > 1 }"
          >
            <span class="overload-name">{{ ho.zoneName }}</span>
            <span class="overload-ratio">
              {{ (ho.overloadRatio * 100).toFixed(0) }}%
            </span>
          </div>
        </div>
      </div>

      <div class="gm-section">
        <div class="section-title">初稳性高度 (GM)</div>
        <div class="gm-value" :class="{ low: balance.metacentricHeight < 0.5 }">
          {{ balance.metacentricHeight.toFixed(2) }} m
        </div>
        <div class="gm-status">
          {{ balance.metacentricHeight >= 1.0 ? '稳性良好' : balance.metacentricHeight >= 0.5 ? '稳性一般' : '稳性不足' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BalanceResult, StepBalanceSnapshot } from '@/types'

const props = defineProps<{
  balance: BalanceResult | null
  currentSnapshot?: StepBalanceSnapshot | null
  stepIndex?: number
  totalSteps?: number
}>()

const circumference = 2 * Math.PI * 42

const scoreLevel = computed(() => {
  if (!props.balance) return 'normal'
  const score = props.balance.stabilityScore
  if (score >= 80) return 'good'
  if (score >= 60) return 'medium'
  return 'poor'
})

const scoreOffset = computed(() => {
  if (!props.balance) return circumference
  const score = props.balance.stabilityScore
  return circumference * (1 - score / 100)
})

const stabilityDelta = computed(() => {
  return props.currentSnapshot?.stabilityDelta || 0
})

const deltaClass = computed(() => {
  if (stabilityDelta.value > 0) return 'positive'
  if (stabilityDelta.value < 0) return 'negative'
  return 'neutral'
})

const maxTilt = 15

const leftTiltPercent = computed(() => {
  if (!props.balance) return 0
  const tilt = props.balance.leftRightTilt
  if (tilt >= 0) return 0
  return Math.min(50, (Math.abs(tilt) / maxTilt) * 50)
})

const rightTiltPercent = computed(() => {
  if (!props.balance) return 0
  const tilt = props.balance.leftRightTilt
  if (tilt <= 0) return 0
  return Math.min(50, (Math.abs(tilt) / maxTilt) * 50)
})

const frontTiltPercent = computed(() => {
  if (!props.balance) return 0
  const tilt = props.balance.frontBackTilt
  if (tilt >= 0) return 0
  return Math.min(50, (Math.abs(tilt) / maxTilt) * 50)
})

const backTiltPercent = computed(() => {
  if (!props.balance) return 0
  const tilt = props.balance.frontBackTilt
  if (tilt <= 0) return 0
  return Math.min(50, (Math.abs(tilt) / maxTilt) * 50)
})

const maxWeight = computed(() => {
  if (!props.balance) return 1
  return Math.max(
    props.balance.leftWeight,
    props.balance.rightWeight,
    props.balance.frontWeight,
    props.balance.backWeight,
    1
  )
})

const leftWeightPercent = computed(() => {
  if (!props.balance) return 0
  return (props.balance.leftWeight / maxWeight.value) * 100
})

const rightWeightPercent = computed(() => {
  if (!props.balance) return 0
  return (props.balance.rightWeight / maxWeight.value) * 100
})

const frontWeightPercent = computed(() => {
  if (!props.balance) return 0
  return (props.balance.frontWeight / maxWeight.value) * 100
})

const backWeightPercent = computed(() => {
  if (!props.balance) return 0
  return (props.balance.backWeight / maxWeight.value) * 100
})
</script>

<style scoped>
.stability-monitor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #e8e8e8;
  background: linear-gradient(135deg, #f0f5ff 0%, #fff 100%);
  flex-shrink: 0;
}

.monitor-header h3 {
  margin: 0;
  font-size: 14px;
  color: #1e3a5f;
}

.step-badge {
  padding: 3px 10px;
  background: #1890ff;
  color: #fff;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
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
  font-size: 42px;
  margin-bottom: 10px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 13px;
}

.monitor-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.stability-score-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
}

.score-ring {
  position: relative;
  width: 100px;
  height: 100px;
}

.score-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.score-bg {
  fill: none;
  stroke: #e8e8e8;
  stroke-width: 8;
}

.score-fill {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease;
}

.score-ring.good .score-fill { stroke: #52c41a; }
.score-ring.medium .score-fill { stroke: #faad14; }
.score-ring.poor .score-fill { stroke: #ff4d4f; }

.score-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.score-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e3a5f;
  line-height: 1;
}

.score-label {
  font-size: 10px;
  color: #8c8c8c;
  margin-top: 2px;
}

.score-delta {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
}

.score-delta.positive {
  background: #f6ffed;
  color: #52c41a;
}

.score-delta.negative {
  background: #fff2f0;
  color: #ff4d4f;
}

.score-delta.neutral {
  background: #fafafa;
  color: #8c8c8c;
}

.delta-icon {
  font-size: 14px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.section-title.warning {
  color: #fa8c16;
  display: flex;
  align-items: center;
  gap: 4px;
}

.warning-icon {
  font-size: 14px;
}

.tilt-section {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  margin-bottom: 14px;
}

.tilt-item {
  padding: 10px;
  background: #fafafa;
  border-radius: 6px;
}

.tilt-label {
  font-size: 11px;
  color: #8c8c8c;
  margin-bottom: 6px;
}

.tilt-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tilt-bar.vertical {
  flex-direction: column;
}

.tilt-track {
  position: relative;
  height: 8px;
  width: 100%;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.tilt-bar.vertical .tilt-track {
  width: 8px;
  height: 60px;
}

.tilt-fill {
  position: absolute;
  top: 0;
  height: 100%;
  transition: width 0.3s ease;
}

.tilt-fill.left {
  right: 50%;
  background: linear-gradient(to left, #1890ff, #40a9ff);
}

.tilt-fill.right {
  left: 50%;
  background: linear-gradient(to right, #1890ff, #40a9ff);
}

.tilt-fill.front {
  bottom: 50%;
  width: 100%;
  height: auto;
  background: linear-gradient(to bottom, #fa8c16, #ffa940);
}

.tilt-fill.back {
  top: 50%;
  width: 100%;
  height: auto;
  background: linear-gradient(to top, #fa8c16, #ffa940);
}

.tilt-center {
  position: absolute;
  top: 0;
  left: 50%;
  width: 2px;
  height: 100%;
  background: #bfbfbf;
  transform: translateX(-50%);
}

.tilt-center-h {
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 2px;
  background: #bfbfbf;
  transform: translateY(-50%);
}

.tilt-value {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

.tilt-value.warning {
  color: #fa8c16;
}

.cog-section,
.draft-section,
.weight-section,
.deck-section,
.overload-section,
.gm-section {
  margin-bottom: 14px;
  padding: 10px;
  background: #fafafa;
  border-radius: 6px;
}

.cog-grid,
.draft-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.cog-item,
.draft-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px;
  background: #fff;
  border-radius: 4px;
}

.cog-label,
.draft-label {
  font-size: 10px;
  color: #8c8c8c;
  margin-bottom: 2px;
}

.cog-value,
.draft-value {
  font-size: 13px;
  font-weight: 600;
  color: #1e3a5f;
}

.weight-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.weight-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.weight-label {
  width: 36px;
  font-size: 11px;
  color: #666;
  flex-shrink: 0;
}

.weight-bar-track {
  flex: 1;
  height: 16px;
  background: #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}

.weight-bar-fill {
  height: 100%;
  border-radius: 8px;
  transition: width 0.3s ease;
}

.weight-bar-fill.left { background: linear-gradient(to right, #1890ff, #40a9ff); }
.weight-bar-fill.right { background: linear-gradient(to right, #1890ff, #40a9ff); }
.weight-bar-fill.front { background: linear-gradient(to right, #fa8c16, #ffa940); }
.weight-bar-fill.back { background: linear-gradient(to right, #fa8c16, #ffa940); }

.weight-value {
  width: 50px;
  text-align: right;
  font-size: 11px;
  font-weight: 600;
  color: #333;
  flex-shrink: 0;
}

.deck-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.deck-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #fff;
  border-radius: 4px;
}

.deck-item.warning {
  background: #fffbe6;
}

.deck-item.overload {
  background: #fff2f0;
}

.deck-name {
  width: 50px;
  font-size: 11px;
  color: #333;
  flex-shrink: 0;
}

.deck-bar {
  flex: 1;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.deck-bar-fill {
  height: 100%;
  background: #52c41a;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.deck-item.warning .deck-bar-fill { background: #faad14; }
.deck-item.overload .deck-bar-fill { background: #ff4d4f; }

.deck-value {
  width: 70px;
  text-align: right;
  font-size: 10px;
  color: #666;
  flex-shrink: 0;
}

.overload-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.overload-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: #fffbe6;
  border-radius: 4px;
  font-size: 11px;
}

.overload-item.danger {
  background: #fff2f0;
}

.overload-name {
  color: #333;
}

.overload-ratio {
  font-weight: 600;
  color: #fa8c16;
}

.overload-item.danger .overload-ratio {
  color: #ff4d4f;
}

.gm-section {
  text-align: center;
}

.gm-value {
  font-size: 20px;
  font-weight: 700;
  color: #52c41a;
  margin-bottom: 4px;
}

.gm-value.low {
  color: #fa8c16;
}

.gm-status {
  font-size: 11px;
  color: #8c8c8c;
}
</style>
