<template>
  <div class="app-container">
    <header class="app-header">
      <div class="logo">
        <span class="logo-icon">⛵</span>
        <h1>木帆船装载模拟与港口调度系统</h1>
      </div>

      <div class="module-switcher">
        <button
          class="module-btn"
          :class="{ active: activeModule === 'stowage' }"
          @click="activeModule = 'stowage'"
        >
          <span class="m-icon">📦</span>
          装载模拟
        </button>
        <button
          class="module-btn"
          :class="{ active: activeModule === 'scheduling' }"
          @click="activeModule = 'scheduling'"
        >
          <span class="m-icon">⚓</span>
          港口调度
        </button>
      </div>

      <div class="header-info">
        <template v-if="activeModule === 'stowage'">
          <span class="ship-info">
            船型参数: {{ ship.length }}m × {{ ship.width }}m | 最大载重: {{ ship.maxLoad }}吨
          </span>
        </template>
        <template v-else>
          <span class="ship-info">
            泊位: {{ schedulingStats.totalBerths }} | 吊机: {{ schedulingStats.totalCranes }} | 船舶: {{ schedulingStats.totalShips }}
          </span>
        </template>
      </div>
    </header>

    <main class="app-main">
      <template v-if="activeModule === 'stowage'">
        <aside class="sidebar left-sidebar">
          <CargoEditor />
        </aside>

        <section class="main-content">
          <div class="top-row">
            <ShipDeck />
          </div>
          <div class="bottom-row">
            <LoadChart />
          </div>
        </section>

        <aside class="sidebar right-sidebar">
          <StatusPanel />
        </aside>
      </template>

      <template v-else>
        <PortScheduling />
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useShipStore } from '@/stores/shipStore'
import { useSchedulingStore } from '@/stores/schedulingStore'
import ShipDeck from '@/components/ShipDeck.vue'
import CargoEditor from '@/components/CargoEditor.vue'
import StatusPanel from '@/components/StatusPanel.vue'
import LoadChart from '@/components/LoadChart.vue'
import PortScheduling from '@/components/PortScheduling.vue'

const activeModule = ref<'stowage' | 'scheduling'>('scheduling')

const shipStore = useShipStore()
const schedulingStore = useSchedulingStore()
const { ship } = storeToRefs(shipStore)

const schedulingStats = computed(() => ({
  totalBerths: schedulingStore.totalBerths,
  totalCranes: schedulingStore.totalCranes,
  totalShips: schedulingStore.totalShips
}))
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #f0f2f5;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 24px;
  background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
  gap: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 26px;
}

.logo h1 {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
  letter-spacing: 1px;
}

.module-switcher {
  display: flex;
  gap: 0;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 3px;
}

.module-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  font-size: 13px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.25s;
}

.module-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.module-btn.active {
  background: #fff;
  color: #1e3a5f;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.m-icon {
  font-size: 15px;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ship-info {
  font-size: 12px;
  opacity: 0.9;
  padding: 5px 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  white-space: nowrap;
}

.app-main {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.app-main > .sidebar,
.app-main > .main-content,
.app-main > :deep(.scheduling-container) {
  width: 100%;
}

.sidebar {
  width: 320px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.left-sidebar,
.right-sidebar {
  padding: 12px;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  min-width: 0;
  padding: 12px 0;
}

.top-row {
  flex: 1.2;
  min-height: 0;
}

.bottom-row {
  flex: 0.8;
  min-height: 0;
}

@media (max-width: 1400px) {
  .app-header {
    padding: 10px 16px;
    flex-wrap: wrap;
  }
  .logo h1 {
    font-size: 15px;
  }
  .sidebar {
    width: 280px;
    min-width: 280px;
  }
}

@media (max-width: 1200px) {
  .app-main {
    flex-wrap: wrap;
    overflow: auto;
  }
  .sidebar {
    width: 100%;
    min-width: unset;
    height: 400px;
    max-height: 50vh;
  }
  .main-content {
    width: 100%;
    min-height: 600px;
    padding: 12px;
  }
}

@media (max-width: 900px) {
  .module-btn {
    padding: 5px 10px;
    font-size: 12px;
  }
  .m-icon {
    display: none;
  }
}
</style>
