<template>
  <div class="status-panel">
    <div class="panel-header">
      <h3>装载状态</h3>
      <div class="actions">
        <button class="btn-default" @click="handleClearAll" :disabled="cargos.length === 0">
          清空
        </button>
        <button
          class="btn-success"
          @click="handleSavePlan"
          :disabled="!validation.canSave"
        >
          {{ validation.canSave ? '保存方案' : '存在风险' }}
        </button>
      </div>
    </div>

    <div class="stability-score-card">
      <div class="score-header">
        <span class="score-label">稳性评分</span>
        <span class="score-value" :class="getScoreClass(balance.stabilityScore)">
          {{ balance.stabilityScore.toFixed(0) }}
        </span>
        <span class="score-max">/ 100</span>
      </div>
      <div class="score-bar">
        <div
          class="score-fill"
          :class="getScoreClass(balance.stabilityScore)"
          :style="{ width: balance.stabilityScore + '%' }"
        ></div>
      </div>
      <div v-if="showComparison && recommendedBalance" class="score-compare">
        <span class="compare-label">推荐方案: {{ recommendedBalance.stabilityScore.toFixed(0) }} 分</span>
        <span :class="recommendedBalance.stabilityScore > balance.stabilityScore ? 'better' : 'worse'">
          {{ recommendedBalance.stabilityScore > balance.stabilityScore ? '↑ 更优' : recommendedBalance.stabilityScore < balance.stabilityScore ? '↓ 较差' : '= 相同' }}
        </span>
      </div>
    </div>

    <div class="status-scroll">
      <div class="status-grid">
        <div class="status-card">
          <div class="card-label">总载重</div>
          <div class="card-value" :class="{ danger: balance.totalWeight > ship.maxLoad }">
            {{ balance.totalWeight.toFixed(1) }} <span class="unit">吨</span>
          </div>
          <div class="card-sub">上限: {{ ship.maxLoad }} 吨 ({{ balance.loadPercentage.toFixed(1) }}%)</div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :class="{ danger: balance.loadPercentage > 95, warning: balance.loadPercentage > 80 }"
              :style="{ width: Math.min(100, balance.loadPercentage) + '%' }"
            ></div>
          </div>
        </div>

        <div class="status-card">
          <div class="card-label">吃水深度</div>
          <div class="card-value">
            {{ balance.draft.toFixed(2) }} <span class="unit">米</span>
          </div>
          <div class="card-sub">
            船首: {{ balance.draftBow.toFixed(2) }}m | 船尾: {{ balance.draftStern.toFixed(2) }}m
          </div>
        </div>
      </div>

      <div class="deck-loads-section">
        <div class="section-title">各甲板载荷</div>
        <div class="deck-load-list">
          <div v-for="dl in balance.deckLoads" :key="dl.deckId" class="deck-load-item">
            <div class="deck-load-header">
              <span class="deck-load-name">{{ dl.deckName }}</span>
              <span class="deck-load-value" :class="{ danger: dl.overload, warning: dl.load > dl.maxLoad * 0.9 }">
                {{ dl.load.toFixed(1) }} / {{ dl.maxLoad.toFixed(1) }} 吨
              </span>
            </div>
            <div class="progress-bar small">
              <div
                class="progress-fill"
                :class="{ danger: dl.load / dl.maxLoad > 0.95, warning: dl.load / dl.maxLoad > 0.8 }"
                :style="{ width: Math.min(100, (dl.load / dl.maxLoad) * 100) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div class="status-grid">
        <div class="status-card balance-card">
          <div class="card-label">左右平衡 (横倾)</div>
          <div class="balance-row">
            <div class="balance-side left">
              <div class="side-label">左舷</div>
              <div class="side-weight">{{ balance.leftWeight.toFixed(1) }} 吨</div>
            </div>
            <div class="balance-indicator" :class="getBalanceClass('leftRight')">
              <div class="tilt-arrow" :style="getTiltStyle('leftRight')">⇆</div>
              <div class="tilt-value">{{ Math.abs(balance.leftRightTilt).toFixed(1) }}°</div>
            </div>
            <div class="balance-side right">
              <div class="side-label">右舷</div>
              <div class="side-weight">{{ balance.rightWeight.toFixed(1) }} 吨</div>
            </div>
          </div>
          <div class="card-sub" :class="{ danger: isSevereImbalance('leftRight'), warning: isImbalance('leftRight') }">
            差值: {{ Math.abs(balance.leftRightDiff).toFixed(1) }} 吨 ({{ getDiffRatio('leftRight') }}%)
          </div>
          <div v-if="showComparison && recommendedBalance" class="compare-sub">
            推荐差值: {{ Math.abs(recommendedBalance.leftRightDiff).toFixed(1) }} 吨
          </div>
        </div>

        <div class="status-card balance-card">
          <div class="card-label">前后平衡 (纵倾)</div>
          <div class="balance-row">
            <div class="balance-side back">
              <div class="side-label">船尾</div>
              <div class="side-weight">{{ balance.backWeight.toFixed(1) }} 吨</div>
            </div>
            <div class="balance-indicator" :class="getBalanceClass('frontBack')">
              <div class="tilt-arrow" :style="getTiltStyle('frontBack')">⇅</div>
              <div class="tilt-value">{{ Math.abs(balance.frontBackTilt).toFixed(1) }}°</div>
            </div>
            <div class="balance-side front">
              <div class="side-label">船首</div>
              <div class="side-weight">{{ balance.frontWeight.toFixed(1) }} 吨</div>
            </div>
          </div>
          <div class="card-sub" :class="{ danger: isSevereImbalance('frontBack'), warning: isImbalance('frontBack') }">
            差值: {{ Math.abs(balance.frontBackDiff).toFixed(1) }} 吨 ({{ getDiffRatio('frontBack') }}%)
          </div>
          <div v-if="showComparison && recommendedBalance" class="compare-sub">
            推荐差值: {{ Math.abs(recommendedBalance.frontBackDiff).toFixed(1) }} 吨
          </div>
        </div>
      </div>

      <div class="status-card gravity-card">
        <div class="card-label">三维重心位置</div>
        <div class="gravity-info-3d">
          <div class="gravity-item">
            <span class="g-axis">X</span>
            <span class="g-value">{{ balance.centerOfGravity.x.toFixed(2) }} m</span>
            <span class="g-ideal">(理想 {{ (ship.length / 2).toFixed(1) }})</span>
          </div>
          <div class="gravity-item">
            <span class="g-axis">Y</span>
            <span class="g-value">{{ balance.centerOfGravity.y.toFixed(2) }} m</span>
            <span class="g-ideal">(理想 {{ (ship.width / 2).toFixed(1) }})</span>
          </div>
          <div class="gravity-item">
            <span class="g-axis">Z</span>
            <span class="g-value" :class="{ warning: balance.centerOfGravity.z > ship.hullDepth * 0.5 }">
              {{ balance.centerOfGravity.z.toFixed(2) }} m
            </span>
            <span class="g-ideal">(理想 {{ (ship.hullDepth * 0.35).toFixed(1) }})</span>
          </div>
        </div>
        <div class="card-sub">
          初稳性高度 GM: {{ balance.metacentricHeight.toFixed(2) }} m
          <span :class="{ warning: balance.metacentricHeight < 0.5 }">
            {{ balance.metacentricHeight < 0.5 ? '(偏低)' : '' }}
          </span>
        </div>
        <div v-if="showComparison && recommendedBalance" class="compare-sub">
          推荐 Z: {{ recommendedBalance.centerOfGravity.z.toFixed(2) }}m | GM: {{ recommendedBalance.metacentricHeight.toFixed(2) }}m
        </div>
      </div>

      <div v-if="balance.holdOverloads.length > 0" class="hold-overload-section">
        <div class="section-title">
          ⚠ 局部舱位超载 ({{ balance.holdOverloads.length }})
        </div>
        <div class="overload-list">
          <div
            v-for="ho in balance.holdOverloads"
            :key="ho.zoneId"
            class="overload-item"
            :class="{ danger: ho.overloadRatio > 1, warning: ho.overloadRatio <= 1 }"
          >
            <span class="overload-name">{{ ho.zoneName }}</span>
            <span class="overload-value">
              {{ ho.load.toFixed(1) }} / {{ ho.maxLoad.toFixed(1) }} 吨
              ({{ (ho.overloadRatio * 100).toFixed(0) }}%)
            </span>
          </div>
        </div>
      </div>

      <div v-if="showComparison && planComparison" class="comparison-section">
        <div class="section-title">方案稳定性对比</div>
        <div class="comparison-table">
          <div class="comp-row header">
            <span class="comp-metric">指标</span>
            <span class="comp-manual">当前方案</span>
            <span class="comp-rec">推荐方案</span>
            <span class="comp-better">最优</span>
          </div>
          <div v-for="diff in planComparison.differences" :key="diff.metric" class="comp-row">
            <span class="comp-metric">{{ diff.metric }}</span>
            <span class="comp-manual" :class="{ highlight: diff.better === 'manual' }">{{ diff.manual }}</span>
            <span class="comp-rec" :class="{ highlight: diff.better === 'recommended' }">{{ diff.recommended }}</span>
            <span class="comp-better">
              <span v-if="diff.better === 'manual'" class="tag-manual">✓</span>
              <span v-else-if="diff.better === 'recommended'" class="tag-rec">✓</span>
              <span v-else class="tag-eq">=</span>
            </span>
          </div>
        </div>
      </div>

      <div class="warnings-section" v-if="validation.warnings.length > 0">
        <div class="warnings-header">
          <span>警告信息 ({{ validation.warnings.length }})</span>
        </div>
        <div class="warnings-list">
          <div
            v-for="(warning, idx) in validation.warnings"
            :key="idx"
            class="warning-item"
            :class="warning.type"
          >
            <span class="warning-icon">{{ getWarningIcon(warning.type) }}</span>
            <span class="warning-text">{{ warning.message }}</span>
          </div>
        </div>
      </div>

      <div class="warnings-section no-warning" v-else>
        <span class="ok-icon">✓</span>
        <span>当前装载方案状态良好</span>
      </div>

      <div class="saved-plans-section" v-if="savedPlans.length > 0">
        <div class="warnings-header">
          <span>已保存方案 ({{ savedPlans.length }})</span>
        </div>
        <div class="plans-list">
          <div
            v-for="(plan, idx) in savedPlans"
            :key="idx"
            class="plan-item"
          >
            <span class="plan-name">{{ plan.name }}</span>
            <span class="plan-score" :class="getScoreClass(plan.score)">{{ plan.score.toFixed(0) }}分</span>
            <span class="plan-time">{{ formatDate(plan.savedAt) }}</span>
            <button class="btn-default load-btn" @click="loadPlan(idx)">加载</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useShipStore } from '@/stores/shipStore'

const store = useShipStore()
const {
  ship,
  cargos,
  balance,
  recommendedBalance,
  validation,
  savedPlans,
  showComparison,
  planComparison
} = storeToRefs(store)
const { clearAllCargos, savePlan, loadPlan } = store

function isImbalance(type: 'leftRight' | 'frontBack'): boolean {
  if (balance.value.totalWeight === 0) return false
  const threshold =
    type === 'leftRight' ? ship.value.leftRightBalanceThreshold : ship.value.frontBackBalanceThreshold
  const diff = type === 'leftRight' ? Math.abs(balance.value.leftRightDiff) : Math.abs(balance.value.frontBackDiff)
  return diff / balance.value.totalWeight > threshold
}

function isSevereImbalance(type: 'leftRight' | 'frontBack'): boolean {
  if (balance.value.totalWeight === 0) return false
  const threshold =
    type === 'leftRight' ? ship.value.leftRightBalanceThreshold : ship.value.frontBackBalanceThreshold
  const diff = type === 'leftRight' ? Math.abs(balance.value.leftRightDiff) : Math.abs(balance.value.frontBackDiff)
  return diff / balance.value.totalWeight > threshold * 1.5
}

function getBalanceClass(type: 'leftRight' | 'frontBack'): string {
  if (isSevereImbalance(type)) return 'danger'
  if (isImbalance(type)) return 'warning'
  return 'normal'
}

function getDiffRatio(type: 'leftRight' | 'frontBack'): string {
  if (balance.value.totalWeight === 0) return '0.0'
  const diff = type === 'leftRight' ? Math.abs(balance.value.leftRightDiff) : Math.abs(balance.value.frontBackDiff)
  return ((diff / balance.value.totalWeight) * 100).toFixed(1)
}

function getTiltStyle(type: 'leftRight' | 'frontBack') {
  const tilt = type === 'leftRight' ? balance.value.leftRightTilt : balance.value.frontBackTilt
  return {
    transform: `rotate(${tilt}deg)`
  }
}

function getWarningIcon(type: string): string {
  if (type === 'error') return '✕'
  if (type === 'warning') return '⚠'
  return 'ℹ'
}

function getScoreClass(score: number): string {
  if (score >= 80) return 'good'
  if (score >= 60) return 'warning'
  return 'danger'
}

function formatDate(date: Date): string {
  const d = new Date(date)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function handleClearAll() {
  if (confirm('确定要清空所有货物吗？')) {
    clearAllCargos()
  }
}

function handleSavePlan() {
  const name = prompt('请输入方案名称:', `装载方案 ${savedPlans.value.length + 1}`)
  if (name && name.trim()) {
    const success = savePlan(name.trim())
    if (!success) {
      alert('保存失败：存在严重倾斜风险或其他错误')
    }
  }
}
</script>

<style scoped>
.status-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
  flex-shrink: 0;
}

.panel-header h3 {
  font-size: 15px;
  color: #333;
  margin: 0;
}

.actions {
  display: flex;
  gap: 6px;
}

.status-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
}

.stability-score-card {
  background: linear-gradient(135deg, #f6ffed 0%, #fffbe6 100%);
  border: 1px solid #b7eb8f;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.score-header {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 6px;
}

.score-label {
  font-size: 12px;
  color: #666;
}

.score-value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
}

.score-value.good { color: #52c41a; }
.score-value.warning { color: #fa8c16; }
.score-value.danger { color: #ff4d4f; }

.score-max {
  font-size: 13px;
  color: #999;
}

.score-bar {
  height: 6px;
  background: #e8e8e8;
  border-radius: 3px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.score-fill.good { background: #52c41a; }
.score-fill.warning { background: #fa8c16; }
.score-fill.danger { background: #ff4d4f; }

.score-compare {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 11px;
  color: #666;
  padding-top: 6px;
  border-top: 1px dashed #d9f7be;
}

.score-compare .better { color: #52c41a; font-weight: 600; }
.score-compare .worse { color: #ff4d4f; }

.status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}

.status-card {
  background: #fafafa;
  border-radius: 6px;
  padding: 10px;
  border: 1px solid #e8e8e8;
}

.card-label {
  font-size: 11px;
  color: #888;
  margin-bottom: 4px;
}

.card-value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.card-value .unit {
  font-size: 12px;
  font-weight: 400;
  color: #888;
}

.card-value.danger {
  color: #ff4d4f;
}

.card-sub {
  font-size: 11px;
  color: #999;
  margin-top: 3px;
}

.card-sub.danger {
  color: #ff4d4f;
  font-weight: 500;
}

.card-sub.warning {
  color: #fa8c16;
  font-weight: 500;
}

.compare-sub {
  font-size: 10px;
  color: #1890ff;
  margin-top: 2px;
  font-style: italic;
}

.progress-bar {
  height: 5px;
  background: #e8e8e8;
  border-radius: 3px;
  margin-top: 6px;
  overflow: hidden;
}

.progress-bar.small {
  height: 4px;
  margin-top: 4px;
}

.progress-fill {
  height: 100%;
  background: #52c41a;
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-fill.warning {
  background: #fa8c16;
}

.progress-fill.danger {
  background: #ff4d4f;
}

.deck-loads-section {
  background: #fafafa;
  border-radius: 6px;
  padding: 10px;
  border: 1px solid #e8e8e8;
  margin-bottom: 10px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.deck-load-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.deck-load-item {
  display: flex;
  flex-direction: column;
}

.deck-load-header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 2px;
}

.deck-load-name {
  color: #555;
  font-weight: 500;
}

.deck-load-value {
  color: #52c41a;
  font-weight: 600;
}

.deck-load-value.warning { color: #fa8c16; }
.deck-load-value.danger { color: #ff4d4f; }

.balance-card {
  display: flex;
  flex-direction: column;
}

.balance-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 4px 0;
}

.balance-side {
  text-align: center;
  flex: 1;
}

.side-label {
  font-size: 10px;
  color: #888;
}

.side-weight {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-top: 1px;
}

.balance-indicator {
  width: 54px;
  height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
}

.balance-indicator.normal {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}

.balance-indicator.warning {
  background: #fff7e6;
  border: 1px solid #ffd591;
}

.balance-indicator.danger {
  background: #fff2f0;
  border: 1px solid #ffccc7;
}

.tilt-arrow {
  font-size: 18px;
  transition: transform 0.3s;
  color: #52c41a;
}

.balance-indicator.warning .tilt-arrow {
  color: #fa8c16;
}

.balance-indicator.danger .tilt-arrow {
  color: #ff4d4f;
}

.tilt-value {
  font-size: 10px;
  color: #666;
  margin-top: 1px;
}

.gravity-card {
  margin-bottom: 10px;
}

.gravity-info-3d {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.gravity-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.g-axis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: #1890ff;
  color: #fff;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
}

.g-value {
  font-weight: 600;
  color: #333;
  min-width: 70px;
}

.g-value.warning {
  color: #fa8c16;
}

.g-ideal {
  font-size: 10px;
  color: #999;
}

.hold-overload-section {
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 10px;
}

.overload-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.overload-item {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  padding: 4px 6px;
  border-radius: 3px;
  background: rgba(255,255,255,0.6);
}

.overload-item.warning {
  color: #d46b08;
}

.overload-item.danger {
  color: #cf1322;
  background: #fff2f0;
}

.overload-name {
  font-weight: 500;
}

.comparison-section {
  background: #f0f7ff;
  border: 1px solid #91d5ff;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 10px;
}

.comparison-table {
  display: flex;
  flex-direction: column;
  font-size: 11px;
}

.comp-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 0.5fr;
  gap: 4px;
  padding: 4px 2px;
  border-bottom: 1px solid #e6f4ff;
  align-items: center;
}

.comp-row:last-child {
  border-bottom: none;
}

.comp-row.header {
  font-weight: 600;
  color: #555;
  font-size: 10px;
  text-transform: uppercase;
}

.comp-metric { color: #555; }
.comp-manual { color: #333; text-align: center; }
.comp-rec { color: #1890ff; text-align: center; }
.comp-better { text-align: center; }

.comp-manual.highlight {
  color: #52c41a;
  font-weight: 600;
}

.comp-rec.highlight {
  color: #52c41a;
  font-weight: 600;
}

.tag-manual { color: #52c41a; font-weight: 700; }
.tag-rec { color: #1890ff; font-weight: 700; }
.tag-eq { color: #999; }

.warnings-section {
  margin-bottom: 10px;
}

.no-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  color: #52c41a;
  font-size: 13px;
  background: #f6ffed;
  border-radius: 6px;
  border: 1px solid #b7eb8f;
}

.ok-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #52c41a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.warnings-header {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 6px;
}

.warnings-list {
  max-height: 140px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.warning-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.5;
}

.warning-item.error {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #cf1322;
}

.warning-item.warning {
  background: #fff7e6;
  border: 1px solid #ffd591;
  color: #d46b08;
}

.warning-item.info {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  color: #0050b3;
}

.warning-icon {
  flex-shrink: 0;
  font-weight: 700;
}

.saved-plans-section {
  margin-top: auto;
}

.plans-list {
  max-height: 100px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.plan-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
  font-size: 11px;
}

.plan-name {
  font-weight: 500;
  color: #333;
  flex: 1;
}

.plan-score {
  font-weight: 600;
  font-size: 11px;
}

.plan-score.good { color: #52c41a; }
.plan-score.warning { color: #fa8c16; }
.plan-score.danger { color: #ff4d4f; }

.plan-time {
  color: #999;
  font-size: 10px;
}

.load-btn {
  padding: 2px 8px;
  font-size: 10px;
}
</style>
