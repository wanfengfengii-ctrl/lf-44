<template>
  <div class="status-panel">
    <div class="panel-header">
      <h3>装载状态</h3>
      <div class="actions">
        <button class="btn-default" @click="handleClearAll" :disabled="cargos.length === 0">
          清空货物
        </button>
        <button
          class="btn-success"
          @click="handleSavePlan"
          :disabled="!validation.canSave"
        >
          {{ validation.canSave ? '保存方案' : '存在严重风险' }}
        </button>
      </div>
    </div>

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
        <div class="card-sub">船深: {{ ship.hullDepth }} 米</div>
      </div>
    </div>

    <div class="status-grid">
      <div class="status-card balance-card">
        <div class="card-label">左右平衡</div>
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
          差值: {{ Math.abs(balance.leftRightDiff).toFixed(1) }} 吨
          ({{ getDiffRatio('leftRight') }}%)
        </div>
      </div>

      <div class="status-card balance-card">
        <div class="card-label">前后平衡</div>
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
          差值: {{ Math.abs(balance.frontBackDiff).toFixed(1) }} 吨
          ({{ getDiffRatio('frontBack') }}%)
        </div>
      </div>
    </div>

    <div class="status-card gravity-card">
      <div class="card-label">重心位置</div>
      <div class="gravity-info">
        <span>横向 (Y): {{ balance.centerOfGravity.y.toFixed(2) }} 米</span>
        <span class="sep">|</span>
        <span>纵向 (X): {{ balance.centerOfGravity.x.toFixed(2) }} 米</span>
      </div>
      <div class="card-sub">
        理想中心: ({{ (ship.length / 2).toFixed(1) }}, {{ (ship.width / 2).toFixed(1) }})
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
          <span class="plan-time">{{ formatDate(plan.savedAt) }}</span>
          <button class="btn-default load-btn" @click="loadPlan(idx)">加载</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useShipStore } from '@/stores/shipStore'

const store = useShipStore()
const { ship, cargos, balance, validation, savedPlans } = storeToRefs(store)
const { clearAllCargos, savePlan, loadPlan } = store

const planNameInput = ref('')

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
  padding: 12px 16px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.panel-header h3 {
  font-size: 16px;
  color: #333;
}

.actions {
  display: flex;
  gap: 8px;
}

.status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 12px 16px;
}

.status-card {
  background: #fafafa;
  border-radius: 6px;
  padding: 12px;
  border: 1px solid #e8e8e8;
}

.card-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 6px;
}

.card-value {
  font-size: 22px;
  font-weight: 600;
  color: #333;
}

.card-value .unit {
  font-size: 13px;
  font-weight: 400;
  color: #888;
}

.card-value.danger {
  color: #ff4d4f;
}

.card-sub {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.card-sub.danger {
  color: #ff4d4f;
  font-weight: 500;
}

.card-sub.warning {
  color: #fa8c16;
  font-weight: 500;
}

.progress-bar {
  height: 6px;
  background: #e8e8e8;
  border-radius: 3px;
  margin-top: 8px;
  overflow: hidden;
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

.balance-card {
  display: flex;
  flex-direction: column;
}

.balance-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0;
}

.balance-side {
  text-align: center;
  flex: 1;
}

.side-label {
  font-size: 11px;
  color: #888;
}

.side-weight {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-top: 2px;
}

.balance-indicator {
  width: 60px;
  height: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
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
  font-size: 20px;
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
  font-size: 11px;
  color: #666;
  margin-top: 2px;
}

.gravity-card {
  margin: 0 16px 12px;
}

.gravity-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.gravity-info .sep {
  color: #ccc;
}

.warnings-section {
  padding: 0 16px 12px;
}

.no-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: #52c41a;
  font-size: 14px;
}

.ok-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.warnings-header {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
}

.warnings-list {
  max-height: 150px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.warning-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  font-size: 12px;
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
  font-weight: bold;
}

.saved-plans-section {
  padding: 0 16px 12px;
  margin-top: auto;
}

.plans-list {
  max-height: 100px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.plan-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}

.plan-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  flex: 1;
}

.plan-time {
  font-size: 11px;
  color: #999;
}

.load-btn {
  padding: 4px 10px;
  font-size: 12px;
}
</style>
