<template>
  <div class="app-container">
    <header class="app-header">
      <div class="logo">
        <span class="logo-icon">⛵</span>
        <h1>木帆船装载模拟系统</h1>
      </div>
      <div class="header-info">
        <span class="ship-info">
          船型参数: {{ ship.length }}m × {{ ship.width }}m | 最大载重: {{ ship.maxLoad }}吨
        </span>
      </div>
    </header>

    <main class="app-main">
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
    </main>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useShipStore } from '@/stores/shipStore'
import ShipDeck from '@/components/ShipDeck.vue'
import CargoEditor from '@/components/CargoEditor.vue'
import StatusPanel from '@/components/StatusPanel.vue'
import LoadChart from '@/components/LoadChart.vue'

const store = useShipStore()
const { ship } = storeToRefs(store)
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
  padding: 12px 24px;
  background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 28px;
}

.logo h1 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  letter-spacing: 1px;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ship-info {
  font-size: 13px;
  opacity: 0.9;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}

.app-main {
  flex: 1;
  display: flex;
  gap: 12px;
  padding: 12px;
  min-height: 0;
  overflow: hidden;
}

.sidebar {
  width: 320px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.left-sidebar {
}

.right-sidebar {
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  min-width: 0;
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
  }
}
</style>
