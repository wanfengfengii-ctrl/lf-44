<template>
  <div class="result-panel">
    <div class="panel-header">
      <h3>调度结果</h3>
      <div v-if="simulationResult" class="header-result" :class="{ pass: simulationResult.canMeetDepartureDeadline, fail: !simulationResult.canMeetDepartureDeadline }">
        <span class="result-icon">{{ simulationResult.canMeetDepartureDeadline ? '✓' : '⚠' }}</span>
        {{ simulationResult.canMeetDepartureDeadline ? '全部准点' : '存在延误' }}
      </div>
    </div>

    <div v-if="!simulationResult" class="no-result">
      <div class="empty-icon">📋</div>
      <p>等待模拟计算结果...</p>
    </div>

    <div v-else class="result-scroll">
      <div class="summary-grid">
        <div class="summary-card">
          <div class="card-icon">🚢</div>
          <div class="card-info">
            <div class="card-value">{{ summary.totalShips }}</div>
            <div class="card-label">作业船舶</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon">📦</div>
          <div class="card-info">
            <div class="card-value">{{ summary.totalUnloadCargos }} / {{ summary.totalLoadCargos }}</div>
            <div class="card-label">卸/装件数</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon">⚖️</div>
          <div class="card-info">
            <div class="card-value">{{ summary.totalWeight.toFixed(0) }}T</div>
            <div class="card-label">总作业量</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon">⏱️</div>
          <div class="card-info">
            <div class="card-value">{{ formatDuration(summary.totalSimulationTime || simulationResult.totalSimulationTime) }}</div>
            <div class="card-label">总耗时</div>
          </div>
        </div>
      </div>

      <section class="result-section">
        <div class="section-title">
          <span class="title-text">🚨 离港时间评估</span>
        </div>
        <div class="delay-list">
          <div
            v-for="risk in simulationResult.delayRisks"
            :key="risk.shipId"
            class="delay-item"
            :class="risk.riskLevel"
          >
            <div class="delay-header">
              <span class="ship-name">{{ risk.shipName }}</span>
              <span class="risk-badge" :class="risk.riskLevel">
                {{ riskLevelText(risk.riskLevel) }}
              </span>
            </div>
            <div class="delay-detail">
              <div class="detail-row">
                <span class="detail-label">预定离港:</span>
                <span class="detail-value">{{ formatTime(risk.scheduledDeparture) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">预计完成:</span>
                <span class="detail-value">{{ formatTime(risk.actualFinishTime) }}</span>
              </div>
              <div class="detail-row" v-if="risk.delayMinutes > 0">
                <span class="detail-label">延误时长:</span>
                <span class="detail-value delay">{{ formatDuration(risk.delayMinutes) }}</span>
              </div>
              <div v-else class="detail-row">
                <span class="detail-label">提前量:</span>
                <span class="detail-value early">{{ formatDuration(risk.scheduledDeparture - risk.actualFinishTime) }}</span>
              </div>
            </div>
            <div class="delay-reason">{{ risk.reason }}</div>
          </div>
        </div>
      </section>

      <div class="result-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="result-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <section v-if="activeTab === 'berth'" class="result-section">
        <div class="section-title"><span class="title-text">⚓ 泊位占用计划</span></div>
        <div class="berth-plans">
          <div
            v-for="bo in simulationResult.berthOccupancies"
            :key="bo.berthId"
            class="berth-plan"
          >
            <div class="berth-title">{{ bo.berthName }}</div>
            <div class="intervals-list">
              <div
                v-for="(iv, idx) in bo.intervals"
                :key="idx"
                class="interval-item"
                :class="iv.operationType"
              >
                <div class="interval-badge">{{ opTypeText(iv.operationType) }}</div>
                <div class="interval-content">
                  <div class="iv-ship">{{ iv.shipName }}</div>
                  <div class="iv-time">
                    {{ formatTime(iv.startTime) }} — {{ formatTime(iv.endTime) }}
                    <span class="iv-duration">({{ formatDuration(iv.endTime - iv.startTime) }})</span>
                  </div>
                </div>
              </div>
              <div v-if="bo.intervals.length === 0" class="empty-intervals">
                该泊位暂无作业安排
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="activeTab === 'order'" class="result-section">
        <div class="section-title"><span class="title-text">📦 最优装卸顺序</span></div>

        <div class="order-subtitle">卸船顺序 ({{ simulationResult.optimalUnloadingOrder.length }} 件)</div>
        <div class="order-list">
          <div
            v-for="(cargo, idx) in simulationResult.optimalUnloadingOrder"
            :key="cargo.id"
            class="order-item"
          >
            <span class="order-idx unload">{{ idx + 1 }}</span>
            <div class="order-main">
              <div class="order-name">
                {{ cargo.cargoName }}
                <span v-if="cargo.fragile" class="fragile-tag">易碎</span>
              </div>
              <div class="order-meta">
                <span class="meta-tag weight">{{ cargo.weight }}T</span>
                <span class="meta-tag">P{{ cargo.priority }}</span>
                <span class="meta-tag ship">{{ getShipNameById(cargo.shipId) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="order-subtitle">装船顺序 ({{ simulationResult.optimalLoadingOrder.length }} 件)</div>
        <div class="order-list">
          <div
            v-for="(cargo, idx) in simulationResult.optimalLoadingOrder"
            :key="cargo.id"
            class="order-item"
          >
            <span class="order-idx load">{{ idx + 1 }}</span>
            <div class="order-main">
              <div class="order-name">
                {{ cargo.cargoName }}
                <span v-if="cargo.fragile" class="fragile-tag">易碎</span>
              </div>
              <div class="order-meta">
                <span class="meta-tag weight">{{ cargo.weight }}T</span>
                <span class="meta-tag">P{{ cargo.priority }}</span>
                <span class="meta-tag ship">{{ getShipNameById(cargo.shipId) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="activeTab === 'steps'" class="result-section">
        <div class="section-title"><span class="title-text">📋 作业步骤明细</span></div>
        <div class="steps-header">
          <div class="st-col time">时间</div>
          <div class="st-col ship">船舶</div>
          <div class="st-col cargo">货物</div>
          <div class="st-col op">操作</div>
          <div class="st-col equip">设备</div>
          <div class="st-col dur">时长</div>
        </div>
        <div class="steps-list">
          <div
            v-for="step in sortedSteps"
            :key="step.id"
            class="step-item"
            :class="step.operationType"
          >
            <div class="st-col time">
              {{ formatTime(step.startTime) }}
              <span class="time-sep">~</span>
              {{ formatTime(step.endTime) }}
            </div>
            <div class="st-col ship">{{ step.shipName }}</div>
            <div class="st-col cargo">
              {{ step.cargoName }}
              <span class="w-tag">({{ step.weight }}T)</span>
            </div>
            <div class="st-col op">
              <span class="op-tag" :class="step.operationType">
                {{ step.operationType === 'load' ? '装船' : '卸船' }}
              </span>
            </div>
            <div class="st-col equip">{{ step.craneName }}@{{ step.berthName }}</div>
            <div class="st-col dur">{{ step.duration }}分</div>
          </div>
          <div v-if="sortedSteps.length === 0" class="empty-steps">
            暂无作业步骤
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSchedulingStore } from '@/stores/schedulingStore'
import { useShipStore } from '@/stores/shipStore'
import { formatTime, formatDuration } from '@/utils/scheduling'
import type { OperationType } from '@/types'

const store = useSchedulingStore()
const shipStore = useShipStore()
const { simulationResult, shipTasks } = storeToRefs(store)

const tabs = [
  { key: 'berth', label: '泊位计划' },
  { key: 'order', label: '装卸顺序' },
  { key: 'steps', label: '步骤明细' }
]

const activeTab = ref('berth')

const summary = computed(() => {
  if (!simulationResult.value) {
    return {
      totalShips: 0,
      totalLoadCargos: 0,
      totalUnloadCargos: 0,
      totalWeight: 0,
      totalSimulationTime: 0
    }
  }
  return simulationResult.value.summary
})

const sortedSteps = computed(() => {
  if (!simulationResult.value) return []
  return [...simulationResult.value.operationSteps].sort((a, b) => a.startTime - b.startTime)
})

function getShipNameById(shipId: string): string {
  return shipTasks.value.find((s) => s.id === shipId)?.name || shipId
}

function riskLevelText(level: string): string {
  return { none: '无风险', low: '低风险', medium: '中风险', high: '高风险' }[level] || level
}

function opTypeText(type: string): string {
  return { berthing: '靠泊', unloading: '卸船', loading: '装船', departure: '离港' }[type] || type
}
</script>

<style scoped>
.result-panel {
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

.header-result {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.header-result.pass {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.header-result.fail {
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

.result-icon {
  font-weight: 700;
}

.no-result {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  padding: 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.no-result p {
  margin: 2px 0;
  font-size: 13px;
}

.result-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: linear-gradient(135deg, #fafafa 0%, #f0f5ff 100%);
  border: 1px solid #e8e8e8;
  border-radius: 6px;
}

.card-icon {
  font-size: 26px;
}

.card-info {
  display: flex;
  flex-direction: column;
}

.card-value {
  font-size: 17px;
  font-weight: 700;
  color: #1e3a5f;
  line-height: 1.2;
}

.card-label {
  font-size: 10px;
  color: #999;
  margin-top: 2px;
}

.result-section {
  margin-bottom: 14px;
}

.section-title {
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0f0f0;
}

.title-text {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.delay-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.delay-item {
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid;
}

.delay-item.none {
  background: #f6ffed;
  border-color: #b7eb8f;
}

.delay-item.low {
  background: #fffbe6;
  border-color: #ffe58f;
}

.delay-item.medium {
  background: #fff7e6;
  border-color: #ffd591;
}

.delay-item.high {
  background: #fff2f0;
  border-color: #ffccc7;
}

.delay-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.ship-name {
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.risk-badge {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.risk-badge.none {
  background: #b7eb8f;
  color: #389e0d;
}

.risk-badge.low {
  background: #ffe58f;
  color: #d48806;
}

.risk-badge.medium {
  background: #ffd591;
  color: #d46b08;
}

.risk-badge.high {
  background: #ffccc7;
  color: #cf1322;
}

.delay-detail {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 12px;
  font-size: 11px;
  margin-bottom: 4px;
}

.detail-row {
  display: flex;
  gap: 6px;
}

.detail-label {
  color: #8c8c8c;
}

.detail-value {
  color: #333;
  font-weight: 500;
}

.detail-value.delay {
  color: #ff4d4f;
  font-weight: 600;
}

.detail-value.early {
  color: #52c41a;
  font-weight: 600;
}

.delay-reason {
  font-size: 10px;
  color: #666;
  font-style: italic;
  padding-top: 4px;
  border-top: 1px dashed rgba(0, 0, 0, 0.08);
}

.result-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 8px;
  border-bottom: 1px solid #e8e8e8;
}

.result-tab {
  padding: 6px 14px;
  font-size: 12px;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.result-tab.active {
  color: #1890ff;
  border-bottom-color: #1890ff;
  font-weight: 600;
}

.berth-plans {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
}

.berth-plan {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 8px 10px;
}

.berth-title {
  font-size: 12px;
  font-weight: 600;
  color: #1e3a5f;
  padding-bottom: 6px;
  margin-bottom: 6px;
  border-bottom: 1px dashed #e8e8e8;
}

.intervals-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.interval-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 4px 6px;
  background: #fff;
  border-radius: 4px;
  font-size: 10px;
}

.interval-badge {
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 600;
  color: #fff;
}

.interval-item.berthing .interval-badge { background: #1e3a5f; }
.interval-item.unloading .interval-badge { background: #fa8c16; }
.interval-item.loading .interval-badge { background: #1890ff; }
.interval-item.departure .interval-badge { background: #52c41a; }

.interval-content {
  flex: 1;
  min-width: 0;
}

.iv-ship {
  font-weight: 600;
  color: #333;
  margin-bottom: 1px;
}

.iv-time {
  color: #8c8c8c;
}

.iv-duration {
  color: #52c41a;
  font-size: 9px;
}

.empty-intervals {
  padding: 8px;
  text-align: center;
  font-size: 10px;
  color: #bbb;
}

.order-subtitle {
  font-size: 11px;
  color: #666;
  font-weight: 600;
  margin: 6px 0 4px;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 10px;
  max-height: 180px;
  overflow-y: auto;
  padding-right: 4px;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.order-idx {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.order-idx.unload {
  background: #fa8c16;
}

.order-idx.load {
  background: #1890ff;
}

.order-main {
  flex: 1;
  min-width: 0;
}

.order-name {
  font-size: 11px;
  color: #333;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.fragile-tag {
  font-size: 9px;
  padding: 0 4px;
  background: #fff2e8;
  color: #fa541c;
  border-radius: 2px;
}

.order-meta {
  display: flex;
  gap: 4px;
  margin-top: 2px;
  flex-wrap: wrap;
}

.meta-tag {
  font-size: 9px;
  padding: 0 4px;
  background: #f0f0f0;
  color: #666;
  border-radius: 2px;
}

.meta-tag.weight {
  background: #e6f7ff;
  color: #1890ff;
}

.meta-tag.ship {
  background: #e6fffb;
  color: #13c2c2;
}

.steps-header {
  display: grid;
  grid-template-columns: 2fr 1.2fr 2fr 1fr 1.5fr 0.8fr;
  gap: 4px;
  padding: 5px 8px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 4px 4px 0 0;
  font-size: 10px;
  font-weight: 600;
  color: #666;
}

.steps-list {
  border: 1px solid #e8e8e8;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 260px;
  overflow-y: auto;
}

.step-item {
  display: grid;
  grid-template-columns: 2fr 1.2fr 2fr 1fr 1.5fr 0.8fr;
  gap: 4px;
  padding: 5px 8px;
  font-size: 10px;
  color: #555;
  border-bottom: 1px solid #f5f5f5;
  align-items: center;
}

.step-item:last-child {
  border-bottom: none;
}

.step-item.load {
  background: rgba(24, 144, 255, 0.03);
}

.step-item.unload {
  background: rgba(250, 140, 22, 0.03);
}

.st-col {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.st-col.time {
  color: #8c8c8c;
}

.time-sep {
  margin: 0 2px;
  color: #bbb;
}

.w-tag {
  color: #1890ff;
  font-size: 9px;
}

.op-tag {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 600;
  color: #fff;
}

.op-tag.load {
  background: #1890ff;
}

.op-tag.unload {
  background: #fa8c16;
}

.st-col.dur {
  text-align: right;
  font-weight: 600;
  color: #52c41a;
}

.empty-steps {
  padding: 20px;
  text-align: center;
  font-size: 11px;
  color: #bbb;
}

@media (max-width: 1400px) {
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
