<template>
  <div class="scheduling-container">
    <div class="scheduling-header">
      <div class="header-stats">
        <div class="stat-chip">
          <span class="stat-icon">⚓</span>
          <span class="stat-label">泊位</span>
          <span class="stat-value">{{ totalBerths }}</span>
        </div>
        <div class="stat-chip">
          <span class="stat-icon">🏗️</span>
          <span class="stat-label">吊机</span>
          <span class="stat-value">{{ totalCranes }}</span>
        </div>
        <div class="stat-chip">
          <span class="stat-icon">🚢</span>
          <span class="stat-label">船舶</span>
          <span class="stat-value">{{ totalShips }}</span>
        </div>
        <div class="stat-chip">
          <span class="stat-icon">📦</span>
          <span class="stat-label">货物</span>
          <span class="stat-value">{{ totalCargos }}</span>
        </div>
      </div>
      <div class="header-hint">
        <span class="hint-icon">💡</span>
        <span>配置泊位、吊机、班次和船舶任务后，点击「开始模拟」进行调度计算</span>
      </div>
    </div>

    <div class="scheduling-main">
      <aside class="config-col">
        <SchedulingConfig
          @simulate="handleSimulate"
          @reset="handleReset"
        />
      </aside>

      <section class="center-col">
        <div class="ships-row">
          <SchedulingShips />
        </div>
        <div class="viz-row">
          <SchedulingViz />
        </div>
      </section>

      <aside class="result-col">
        <SchedulingResult />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSchedulingStore } from '@/stores/schedulingStore'
import SchedulingConfig from '@/components/SchedulingConfig.vue'
import SchedulingShips from '@/components/SchedulingShips.vue'
import SchedulingViz from '@/components/SchedulingViz.vue'
import SchedulingResult from '@/components/SchedulingResult.vue'

const store = useSchedulingStore()
const {
  totalBerths,
  totalCranes,
  totalShips,
  totalCargos
} = storeToRefs(store)

function handleSimulate() {
  store.runScheduleSimulation()
}

function handleReset() {
  if (confirm('确定要重置所有调度配置到默认值吗？')) {
    store.resetToDefaults()
  }
}
</script>

<style scoped>
.scheduling-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #f0f2f5;
}

.scheduling-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 8px;
}

.header-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: linear-gradient(135deg, #f0f5ff 0%, #fff 100%);
  border: 1px solid #d6e4ff;
  border-radius: 16px;
  font-size: 12px;
}

.stat-icon {
  font-size: 14px;
}

.stat-label {
  color: #8c8c8c;
}

.stat-value {
  font-weight: 700;
  color: #1e3a5f;
}

.header-hint {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #8c8c8c;
  padding: 4px 10px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 4px;
}

.hint-icon {
  font-size: 13px;
}

.scheduling-main {
  flex: 1;
  display: flex;
  gap: 10px;
  padding: 10px;
  min-height: 0;
  overflow: hidden;
}

.config-col {
  width: 300px;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.center-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  min-width: 0;
}

.ships-row {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.viz-row {
  flex: 1.2;
  min-height: 0;
  overflow: hidden;
}

.result-col {
  width: 360px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

@media (max-width: 1600px) {
  .config-col {
    width: 260px;
    min-width: 260px;
  }
  .result-col {
    width: 320px;
    min-width: 280px;
  }
}

@media (max-width: 1400px) {
  .scheduling-main {
    flex-wrap: wrap;
    overflow: auto;
  }
  .config-col {
    width: 100%;
    min-width: unset;
    height: 380px;
  }
  .center-col {
    width: 100%;
    min-height: 600px;
  }
  .result-col {
    width: 100%;
    min-width: unset;
    height: 500px;
  }
}
</style>
