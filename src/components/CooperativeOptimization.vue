<template>
  <div class="cooperative-container">
    <div class="coop-header">
      <div class="header-left">
        <h2>船港协同装载优化</h2>
        <p class="subtitle">
          将船舶稳性约束与港口装卸调度联动，同步考虑船舶实时重心、横纵倾、甲板载荷和局部舱位超载风险
        </p>
      </div>
      <div class="header-actions">
        <button
          class="btn-generate"
          :disabled="isGenerating"
          @click="handleGenerate"
        >
          <span class="btn-icon">{{ isGenerating ? '⏳' : '⚙️' }}</span>
          {{ isGenerating ? '生成中...' : '生成协同方案' }}
        </button>
        <button
          class="btn-compare"
          :disabled="!hasPlans"
          :class="{ active: showComparison }"
          @click="toggleComparison"
        >
          <span class="btn-icon">📊</span>
          方案对比
        </button>
      </div>
    </div>

    <div v-if="showComparison && hasPlans" class="comparison-panel">
      <PlanComparison
        :comparison="comparison"
        :efficiency-plan="efficiencyPlan"
        :stability-plan="stabilityPlan"
        @close="toggleComparison"
      />
    </div>

    <div v-else class="coop-main">
      <aside class="left-panel">
        <div class="panel-section">
          <div class="section-title">
            <span class="title-icon">🎯</span>
            优化策略
          </div>
          <div class="strategy-tabs">
            <button
              class="strategy-tab"
              :class="{ active: currentStrategy === 'efficiency' }"
              :disabled="!efficiencyPlan"
              @click="setStrategy('efficiency')"
            >
              <span class="tab-icon">⚡</span>
              <div class="tab-info">
                <span class="tab-name">效率最优</span>
                <span class="tab-desc">最短作业时间</span>
              </div>
            </button>
            <button
              class="strategy-tab"
              :class="{ active: currentStrategy === 'stability' }"
              :disabled="!stabilityPlan"
              @click="setStrategy('stability')"
            >
              <span class="tab-icon">⚖️</span>
              <div class="tab-info">
                <span class="tab-name">稳性最优</span>
                <span class="tab-desc">最佳航行安全</span>
              </div>
            </button>
          </div>
        </div>

        <div class="panel-section" v-if="currentPlan">
          <div class="section-title">
            <span class="title-icon">🚢</span>
            船舶选择
          </div>
          <div class="ship-list">
            <button
              v-for="ship in allShips"
              :key="ship.id"
              class="ship-item"
              :class="{ active: selectedShipId === ship.id }"
              @click="selectShip(ship.id)"
            >
              <span class="ship-name">{{ ship.name }}</span>
              <span class="ship-tag">{{ getShipSafetyScore(ship.id).toFixed(0) }}分</span>
            </button>
          </div>
        </div>

        <div class="panel-section" v-if="currentShipHistory">
          <div class="section-title">
            <span class="title-icon">📈</span>
            本船概览
          </div>
          <div class="ship-overview">
            <div class="overview-item">
              <span class="ov-label">安全评分</span>
              <span class="ov-value good">{{ currentShipHistory.safetyScore.toFixed(0) }} 分</span>
            </div>
            <div class="overview-item">
              <span class="ov-label">最低稳性</span>
              <span class="ov-value">{{ currentShipHistory.minStabilityScore.toFixed(0) }} 分</span>
            </div>
            <div class="overview-item">
              <span class="ov-label">最大倾角</span>
              <span class="ov-value" :class="{ warning: currentShipHistory.maxTiltAngle > 5 }">
                {{ currentShipHistory.maxTiltAngle.toFixed(2) }}°
              </span>
            </div>
            <div class="overview-item">
              <span class="ov-label">操作步骤</span>
              <span class="ov-value">{{ totalSteps }} 步</span>
            </div>
          </div>
        </div>

        <div class="panel-section">
          <div class="section-title">
            <span class="title-icon">⚙️</span>
            协同配置
          </div>
          <div class="config-list">
            <div class="config-item">
              <span class="cfg-label">最低稳性阈值</span>
              <div class="cfg-control">
                <input
                  type="range"
                  min="40"
                  max="80"
                  :value="config.minStabilityThreshold"
                  @input="updateConfig('minStabilityThreshold', Number(($event.target as HTMLInputElement).value))"
                />
                <span class="cfg-value">{{ config.minStabilityThreshold }} 分</span>
              </div>
            </div>
            <div class="config-item">
              <span class="cfg-label">最大倾角阈值</span>
              <div class="cfg-control">
                <input
                  type="range"
                  min="3"
                  max="15"
                  :value="config.maxTiltThreshold"
                  @input="updateConfig('maxTiltThreshold', Number(($event.target as HTMLInputElement).value))"
                />
                <span class="cfg-value">{{ config.maxTiltThreshold }}°</span>
              </div>
            </div>
            <div class="config-item checkbox">
              <label>
                <input
                  type="checkbox"
                  :checked="config.enableBalancedLoading"
                  @change="updateConfig('enableBalancedLoading', ($event.target as HTMLInputElement).checked)"
                />
                <span>均衡装载</span>
              </label>
            </div>
            <div class="config-item checkbox">
              <label>
                <input
                  type="checkbox"
                  :checked="config.enableStabilityCheckEachStep"
                  @change="updateConfig('enableStabilityCheckEachStep', ($event.target as HTMLInputElement).checked)"
                />
                <span>每步稳性检查</span>
              </label>
            </div>
          </div>
        </div>
      </aside>

      <section class="center-panel">
        <div class="playback-controls" v-if="currentShipHistory && currentShipHistory.stepSnapshots.length > 0">
          <div class="playback-info">
            <span class="step-indicator">
              步骤 {{ currentStepIndex + 1 > 0 ? currentStepIndex + 1 : 0 }} / {{ totalSteps }}
            </span>
            <span v-if="currentStepSnapshot" class="step-cargo">
              {{ currentStepSnapshot.operationType === 'load' ? '装' : '卸' }}: {{ currentStepSnapshot.cargoName }}
              ({{ currentStepSnapshot.cargoWeight }}T)
            </span>
          </div>
          <div class="playback-buttons">
            <button class="play-btn" @click="resetStep" title="重置">
              ⏮
            </button>
            <button class="play-btn" @click="prevStep" :disabled="currentStepIndex <= -1" title="上一步">
              ◀
            </button>
            <button class="play-btn primary" @click="togglePlayback" title="播放/暂停">
              {{ playbackStatus === 'playing' ? '⏸' : '▶' }}
            </button>
            <button class="play-btn" @click="nextStep" :disabled="currentStepIndex >= totalSteps - 1" title="下一步">
              ▶
            </button>
            <button class="play-btn" @click="goToLastStep" title="跳到最后">
              ⏭
            </button>
          </div>
          <div class="playback-speed">
            <span class="speed-label">速度:</span>
            <div class="speed-options">
              <button
                v-for="speed in [0.5, 1, 2, 4]"
                :key="speed"
                class="speed-btn"
                :class="{ active: playbackSpeed === speed }"
                @click="setPlaybackSpeed(speed)"
              >
                {{ speed }}x
              </button>
            </div>
          </div>
        </div>

        <div class="timeline-section" v-if="currentShipHistory && currentShipHistory.stepSnapshots.length > 0">
          <div class="timeline-track" ref="timelineTrack">
            <div
              class="timeline-progress"
              :style="{ width: timelineProgress + '%' }"
            ></div>
            <div
              v-for="(snapshot, idx) in currentShipHistory.stepSnapshots"
              :key="idx"
              class="timeline-point"
              :class="{
                active: idx === currentStepIndex,
                passed: idx < currentStepIndex,
                load: snapshot.operationType === 'load',
                unload: snapshot.operationType === 'unload'
              }"
              :style="{ left: ((idx + 1) / totalSteps) * 100 + '%' }"
              @click="setStepIndex(idx)"
              :title="`步骤 ${idx + 1}: ${snapshot.cargoName}`"
            >
              <span class="point-icon">{{ snapshot.operationType === 'load' ? '⬆' : '⬇' }}</span>
            </div>
            <div
              class="timeline-thumb"
              :style="{ left: thumbPosition + '%' }"
            ></div>
          </div>
        </div>

        <div class="steps-section">
          <div class="section-header">
            <span class="section-title-text">装卸步骤与稳性变化</span>
            <span class="step-count">{{ totalSteps }} 个操作步骤</span>
          </div>
          <div class="steps-table" v-if="currentShipHistory">
            <div class="steps-header">
              <div class="st-col idx">序号</div>
              <div class="st-col type">类型</div>
              <div class="st-col cargo">货物</div>
              <div class="st-col weight">重量</div>
              <div class="st-col score">稳性评分</div>
              <div class="st-col delta">变化</div>
              <div class="st-col tilt">倾角</div>
            </div>
            <div class="steps-body">
              <div
                v-for="(snapshot, idx) in currentShipHistory.stepSnapshots"
                :key="idx"
                class="step-row"
                :class="{
                  active: idx === currentStepIndex,
                  load: snapshot.operationType === 'load',
                  unload: snapshot.operationType === 'unload'
                }"
                @click="setStepIndex(idx)"
              >
                <div class="st-col idx">{{ idx + 1 }}</div>
                <div class="st-col type">
                  <span class="type-tag" :class="snapshot.operationType">
                    {{ snapshot.operationType === 'load' ? '装船' : '卸船' }}
                  </span>
                </div>
                <div class="st-col cargo">{{ snapshot.cargoName }}</div>
                <div class="st-col weight">{{ snapshot.cargoWeight }}T</div>
                <div class="st-col score">
                  <div class="score-bar">
                    <div
                      class="score-fill"
                      :class="getScoreClass(snapshot.balance.stabilityScore)"
                      :style="{ width: snapshot.balance.stabilityScore + '%' }"
                    ></div>
                  </div>
                  <span class="score-text">{{ snapshot.balance.stabilityScore.toFixed(0) }}</span>
                </div>
                <div class="st-col delta">
                  <span
                    class="delta-val"
                    :class="{
                      positive: snapshot.stabilityDelta > 0,
                      negative: snapshot.stabilityDelta < 0
                    }"
                  >
                    {{ snapshot.stabilityDelta >= 0 ? '+' : '' }}{{ snapshot.stabilityDelta.toFixed(1) }}
                  </span>
                </div>
                <div class="st-col tilt">
                  {{ Math.max(Math.abs(snapshot.balance.leftRightTilt), Math.abs(snapshot.balance.frontBackTilt)).toFixed(2) }}°
                </div>
              </div>
              <div v-if="currentShipHistory.stepSnapshots.length === 0" class="empty-steps">
                暂无操作步骤
              </div>
            </div>
          </div>
        </div>

        <div v-if="!hasPlans" class="empty-center">
          <div class="empty-icon">🚢</div>
          <h3>船港协同装载优化</h3>
          <p>
            系统将同时考虑港口装卸效率与船舶稳性安全，<br>
            为您生成「作业效率最优」和「航行稳性最优」两种方案，<br>
            并支持逐步查看每一步操作对船体平衡的影响。
          </p>
          <button class="btn-start" @click="handleGenerate">
            开始生成协同方案
          </button>
        </div>
      </section>

      <aside class="right-panel">
        <StabilityMonitor
          :balance="displayBalance"
          :current-snapshot="currentStepSnapshot"
          :step-index="currentStepIndex"
          :total-steps="totalSteps"
        />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useCooperativeStore } from '@/stores/cooperativeStore'
import StabilityMonitor from '@/components/StabilityMonitor.vue'
import PlanComparison from '@/components/PlanComparison.vue'
import { useShipStore } from '@/stores/shipStore'

const store = useCooperativeStore()
const shipStore = useShipStore()

const {
  config,
  efficiencyPlan,
  stabilityPlan,
  comparison,
  currentStrategy,
  selectedShipId,
  currentStepIndex,
  isGenerating,
  showComparison,
  playbackStatus,
  playbackSpeed,
  currentPlan,
  currentShipHistory,
  currentStepSnapshot,
  totalSteps,
  allShips
} = storeToRefs(store)

const {
  setStrategy,
  selectShip,
  setStepIndex,
  nextStep,
  prevStep,
  resetStep,
  generatePlans,
  toggleComparison,
  updateConfig,
  togglePlayback,
  setPlaybackSpeed,
  goToLastStep: storeGoToLast
} = store

const timelineTrack = ref<HTMLElement | null>(null)
let playbackTimer: number | null = null

const hasPlans = computed(() => {
  return efficiencyPlan.value !== null && stabilityPlan.value !== null
})

const displayBalance = computed(() => {
  if (!currentShipHistory.value) return null
  if (currentStepIndex.value < 0) return currentShipHistory.value.initialBalance
  return currentStepSnapshot.value?.balance || null
})

const timelineProgress = computed(() => {
  if (totalSteps.value === 0) return 0
  return ((currentStepIndex.value + 1) / totalSteps.value) * 100
})

const thumbPosition = computed(() => {
  if (totalSteps.value === 0) return 0
  if (currentStepIndex.value < 0) return 0
  return ((currentStepIndex.value + 1) / totalSteps.value) * 100
})

function handleGenerate() {
  generatePlans()
}

function goToLastStep() {
  if (currentShipHistory.value) {
    setStepIndex(currentShipHistory.value.stepSnapshots.length - 1)
  }
}

function getShipSafetyScore(shipId: string): number {
  if (!currentPlan.value) return 0
  const history = currentPlan.value.balanceHistories.find(h => h.shipId === shipId)
  return history?.safetyScore || 0
}

function getScoreClass(score: number): string {
  if (score >= 80) return 'good'
  if (score >= 60) return 'medium'
  return 'poor'
}

watch(
  () => playbackStatus.value,
  (status) => {
    if (status === 'playing') {
      startPlaybackTimer()
    } else {
      stopPlaybackTimer()
    }
  }
)

watch(
  () => currentStepIndex.value,
  (idx) => {
    if (currentShipHistory.value && idx >= currentShipHistory.value.stepSnapshots.length - 1) {
      if (playbackStatus.value === 'playing') {
        togglePlayback()
      }
    }
  }
)

function startPlaybackTimer() {
  stopPlaybackTimer()
  const interval = 1000 / playbackSpeed.value
  playbackTimer = window.setInterval(() => {
    if (currentStepIndex.value < totalSteps.value - 1) {
      nextStep()
    } else {
      togglePlayback()
    }
  }, interval)
}

function stopPlaybackTimer() {
  if (playbackTimer !== null) {
    clearInterval(playbackTimer)
    playbackTimer = null
  }
}

watch(
  () => playbackSpeed.value,
  () => {
    if (playbackStatus.value === 'playing') {
      startPlaybackTimer()
    }
  }
)

onUnmounted(() => {
  stopPlaybackTimer()
})
</script>

<style scoped>
.cooperative-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #f0f2f5;
  overflow: hidden;
}

.coop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%);
  color: white;
  flex-shrink: 0;
}

.header-left h2 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  font-size: 12px;
  opacity: 0.85;
  line-height: 1.4;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-generate,
.btn-compare {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-generate {
  background: #52c41a;
  color: white;
}

.btn-generate:hover:not(:disabled) {
  background: #73d13d;
}

.btn-generate:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-compare {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-compare:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}

.btn-compare:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-compare.active {
  background: #fff;
  color: #1e3a5f;
}

.btn-icon {
  font-size: 14px;
}

.comparison-panel {
  flex: 1;
  min-height: 0;
  padding: 12px;
}

.coop-main {
  flex: 1;
  display: flex;
  gap: 10px;
  padding: 10px;
  min-height: 0;
  overflow: hidden;
}

.left-panel,
.right-panel {
  width: 280px;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  overflow-y: auto;
}

.center-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  min-width: 0;
}

.panel-section {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #1e3a5f;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.title-icon {
  font-size: 15px;
}

.strategy-tabs {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.strategy-tab {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #fafafa;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.strategy-tab:hover:not(:disabled) {
  background: #f0f5ff;
}

.strategy-tab.active {
  border-color: #1890ff;
  background: #e6f7ff;
}

.strategy-tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tab-icon {
  font-size: 20px;
}

.tab-info {
  display: flex;
  flex-direction: column;
}

.tab-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.tab-desc {
  font-size: 10px;
  color: #8c8c8c;
}

.ship-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ship-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: #fafafa;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.ship-item:hover {
  background: #f0f5ff;
}

.ship-item.active {
  border-color: #1890ff;
  background: #e6f7ff;
}

.ship-name {
  font-weight: 500;
  color: #333;
}

.ship-tag {
  padding: 2px 6px;
  background: #52c41a;
  color: white;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.ship-overview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.overview-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
}

.ov-label {
  font-size: 10px;
  color: #8c8c8c;
}

.ov-value {
  font-size: 14px;
  font-weight: 700;
  color: #1e3a5f;
}

.ov-value.good {
  color: #52c41a;
}

.ov-value.warning {
  color: #fa8c16;
}

.config-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.config-item.checkbox {
  flex-direction: row;
  align-items: center;
}

.cfg-label {
  font-size: 11px;
  color: #666;
}

.cfg-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cfg-control input[type='range'] {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  background: #e8e8e8;
  border-radius: 2px;
  outline: none;
}

.cfg-control input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: #1890ff;
  border-radius: 50%;
  cursor: pointer;
}

.cfg-value {
  font-size: 11px;
  font-weight: 600;
  color: #1e3a5f;
  min-width: 40px;
  text-align: right;
}

.config-item.checkbox label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #666;
  cursor: pointer;
}

.playback-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.playback-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 180px;
}

.step-indicator {
  font-size: 13px;
  font-weight: 600;
  color: #1e3a5f;
}

.step-cargo {
  font-size: 11px;
  color: #8c8c8c;
}

.playback-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.play-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.play-btn:hover:not(:disabled) {
  border-color: #1890ff;
  color: #1890ff;
}

.play-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.play-btn.primary {
  width: 40px;
  height: 40px;
  background: #1890ff;
  border-color: #1890ff;
  color: white;
  font-size: 14px;
}

.play-btn.primary:hover:not(:disabled) {
  background: #40a9ff;
  border-color: #40a9ff;
  color: white;
}

.playback-speed {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.speed-label {
  font-size: 11px;
  color: #8c8c8c;
}

.speed-options {
  display: flex;
  gap: 2px;
}

.speed-btn {
  padding: 3px 8px;
  font-size: 10px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
}

.speed-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.speed-btn.active {
  background: #1890ff;
  border-color: #1890ff;
  color: white;
}

.timeline-section {
  padding: 12px 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.timeline-track {
  position: relative;
  height: 40px;
  display: flex;
  align-items: center;
}

.timeline-progress {
  position: absolute;
  left: 0;
  top: 50%;
  height: 4px;
  background: #1890ff;
  transform: translateY(-50%);
  border-radius: 2px;
  transition: width 0.3s ease;
  z-index: 1;
}

.timeline-point {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #f0f0f0;
  border: 2px solid #d9d9d9;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
  transition: all 0.2s;
}

.timeline-point:hover {
  transform: translate(-50%, -50%) scale(1.2);
}

.timeline-point.passed {
  background: #bae7ff;
  border-color: #1890ff;
}

.timeline-point.active {
  background: #1890ff;
  border-color: #1890ff;
  transform: translate(-50%, -50%) scale(1.3);
  box-shadow: 0 0 0 4px rgba(24, 144, 255, 0.2);
}

.point-icon {
  font-size: 9px;
  color: #666;
  font-weight: 700;
}

.timeline-point.passed .point-icon,
.timeline-point.active .point-icon {
  color: white;
}

.timeline-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 6px;
  height: 24px;
  background: #1890ff;
  border-radius: 3px;
  z-index: 3;
  pointer-events: none;
  transition: left 0.3s ease;
}

.steps-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.section-title-text {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.step-count {
  font-size: 11px;
  color: #8c8c8c;
}

.steps-table {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.steps-header {
  display: grid;
  grid-template-columns: 50px 60px 1fr 70px 100px 70px 70px;
  gap: 8px;
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  font-size: 11px;
  font-weight: 600;
  color: #666;
  flex-shrink: 0;
}

.st-col {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.steps-body {
  flex: 1;
  overflow-y: auto;
}

.step-row {
  display: grid;
  grid-template-columns: 50px 60px 1fr 70px 100px 70px 70px;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #f5f5f5;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.2s;
  align-items: center;
}

.step-row:hover {
  background: #f5faff;
}

.step-row.active {
  background: #e6f7ff;
}

.step-row.load {
  border-left: 3px solid #1890ff;
}

.step-row.unload {
  border-left: 3px solid #fa8c16;
}

.type-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  color: white;
}

.type-tag.load {
  background: #1890ff;
}

.type-tag.unload {
  background: #fa8c16;
}

.score-bar {
  width: 60px;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.score-fill.good {
  background: #52c41a;
}

.score-fill.medium {
  background: #faad14;
}

.score-fill.poor {
  background: #ff4d4f;
}

.score-text {
  font-size: 10px;
  font-weight: 600;
  color: #666;
  margin-left: 4px;
}

.st-col.score {
  display: flex;
  align-items: center;
  gap: 4px;
}

.delta-val {
  font-weight: 600;
}

.delta-val.positive {
  color: #52c41a;
}

.delta-val.negative {
  color: #ff4d4f;
}

.empty-steps {
  padding: 40px;
  text-align: center;
  color: #bbb;
  font-size: 12px;
}

.empty-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #8c8c8c;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.empty-center .empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-center h3 {
  margin: 0 0 12px 0;
  font-size: 20px;
  color: #1e3a5f;
}

.empty-center p {
  margin: 0 0 24px 0;
  font-size: 13px;
  line-height: 1.8;
}

.btn-start {
  padding: 12px 32px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-start:hover {
  background: #40a9ff;
}

.right-panel {
  width: 320px;
  min-width: 300px;
}

@media (max-width: 1400px) {
  .left-panel,
  .right-panel {
    width: 240px;
    min-width: 220px;
  }

  .right-panel {
    width: 280px;
    min-width: 260px;
  }
}

@media (max-width: 1200px) {
  .coop-main {
    flex-wrap: wrap;
    overflow: auto;
  }

  .left-panel,
  .center-panel,
  .right-panel {
    width: 100%;
    min-width: unset;
  }

  .center-panel {
    min-height: 400px;
  }
}
</style>
