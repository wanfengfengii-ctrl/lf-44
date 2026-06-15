<template>
  <div class="ship-deck-container">
    <div class="deck-header">
      <div class="header-left">
        <h3>船体俯视图</h3>
        <div class="view-toggle">
          <button
            class="view-btn"
            :class="{ active: viewMode === 'single' }"
            @click="viewMode = 'single'"
          >
            单甲板
          </button>
          <button
            class="view-btn"
            :class="{ active: viewMode === 'all' }"
            @click="viewMode = 'all'"
          >
            全层叠加
          </button>
        </div>
      </div>
      <div class="scale-info">
        <span>比例尺: {{ scale.toFixed(2) }}x</span>
        <span>船首 →</span>
      </div>
    </div>

    <div class="deck-tabs" v-if="viewMode === 'single'">
      <button
        v-for="deck in ship.decks"
        :key="deck.id"
        class="deck-tab"
        :class="{ active: currentDeckLevel === deck.level }"
        @click="setCurrentDeckLevel(deck.level)"
      >
        <span class="tab-name">{{ deck.name }}</span>
        <span class="tab-count">({{ cargosByDeck[deck.level]?.length || 0 }})</span>
        <span class="tab-info">{{ deck.zStart.toFixed(1) }}-{{ deck.zEnd.toFixed(1) }}m</span>
      </button>
    </div>

    <div class="deck-canvas-wrapper" ref="wrapperRef">
      <v-stage
        :config="stageConfig"
        @click="handleStageClick"
        ref="stageRef"
      >
        <v-layer>
          <v-rect
            v-for="(zone, idx) in holdZones"
            :key="'zone-' + idx"
            :config="{
              x: zone.x * scale,
              y: zone.y * scale,
              width: zone.width * scale,
              height: zone.height * scale,
              fill: idx % 2 === 0 ? '#e8f4fd' : '#f5f9fc',
              stroke: '#b8d4e8',
              strokeWidth: 1
            }"
          />
          <v-rect
            :config="{
              x: 0,
              y: 0,
              width: ship.length * scale,
              height: ship.width * scale,
              fill: 'transparent',
              stroke: '#2c5282',
              strokeWidth: 3,
              cornerRadius: 8
            }"
          />
          <v-line
            :config="{
              points: [
                ship.length * scale / 2, 0,
                ship.length * scale / 2, ship.width * scale
              ],
              stroke: '#2c5282',
              strokeWidth: 1,
              dash: [5, 5]
            }"
          />
          <v-line
            :config="{
              points: [
                0, ship.width * scale / 2,
                ship.length * scale, ship.width * scale / 2
              ],
              stroke: '#2c5282',
              strokeWidth: 1,
              dash: [5, 5]
            }"
          />

          <template v-if="recommendedCargos && showComparison">
            <v-group
              v-for="cargo in displayRecommendedCargos"
              :key="'rec-' + cargo.id"
              :config="{
                x: cargo.position.x * scale,
                y: cargo.position.y * scale,
                listening: false
              }"
            >
              <v-rect
                :config="{
                  width: cargo.dimensions.width * scale,
                  height: cargo.dimensions.height * scale,
                  fill: cargo.color,
                  opacity: 0.25,
                  stroke: cargo.color,
                  strokeWidth: 2,
                  dash: [6, 4],
                  cornerRadius: 4
                }"
              />
              <v-text
                :config="{
                  text: cargo.name,
                  x: 5,
                  y: cargo.dimensions.height * scale / 2 - 6,
                  width: cargo.dimensions.width * scale - 10,
                  align: 'center',
                  fontSize: 10,
                  fill: cargo.color,
                  fontStyle: 'italic',
                  listening: false
                }"
              />
            </v-group>
          </template>

          <v-group
            v-for="cargo in displayCargos"
            :key="cargo.id"
            :config="{
              x: cargo.position.x * scale,
              y: cargo.position.y * scale,
              draggable: viewMode === 'single',
              rotation: cargo.rotate
            }"
            @dragstart="handleDragStart(cargo)"
            @dragmove="handleDragMove($event, cargo)"
            @dragend="handleDragEnd($event, cargo)"
            @click.stop="handleCargoClick(cargo)"
            @mouseenter="handleMouseEnter"
            @mouseleave="handleMouseLeave"
          >
            <v-rect
              :config="getCargoRectConfig(cargo)"
            />
            <v-text
              :config="{
                text: cargo.name,
                x: 5,
                y: cargo.dimensions.height * scale / 2 - 10,
                width: cargo.dimensions.width * scale - 10,
                align: 'center',
                fontSize: 11,
                fontStyle: 'bold',
                fill: '#fff',
                listening: false
              }"
            />
            <v-text
              :config="{
                text: cargo.weight + '吨',
                x: 5,
                y: cargo.dimensions.height * scale / 2 + 2,
                width: cargo.dimensions.width * scale - 10,
                align: 'center',
                fontSize: 10,
                fill: '#fff',
                listening: false
              }"
            />
            <v-text
              :config="{
                text: 'Z:' + cargo.position.z.toFixed(1) + 'm L' + (cargo.deckLevel + 1),
                x: 5,
                y: cargo.dimensions.height * scale / 2 + 14,
                width: cargo.dimensions.width * scale - 10,
                align: 'center',
                fontSize: 9,
                fill: 'rgba(255,255,255,0.85)',
                listening: false
              }"
            />
          </v-group>

          <v-circle
            v-if="displayCargos.length > 0"
            :config="{
              x: balance.centerOfGravity.x * scale,
              y: balance.centerOfGravity.y * scale,
              radius: 8,
              fill: validation.canSave ? '#52c41a' : '#ff4d4f',
              stroke: '#fff',
              strokeWidth: 2,
              shadowColor: 'black',
              shadowBlur: 5,
              shadowOpacity: 0.3
            }"
          />
          <v-text
            v-if="displayCargos.length > 0"
            :config="{
              text: '重心',
              x: balance.centerOfGravity.x * scale + 12,
              y: balance.centerOfGravity.y * scale - 6,
              fontSize: 12,
              fill: validation.canSave ? '#52c41a' : '#ff4d4f',
              fontStyle: 'bold'
            }"
          />

          <template v-if="recommendedCargos && showComparison && recommendedBalance">
            <v-circle
              :config="{
                x: recommendedBalance.centerOfGravity.x * scale,
                y: recommendedBalance.centerOfGravity.y * scale,
                radius: 6,
                fill: '#1890ff',
                stroke: '#fff',
                strokeWidth: 2,
                dash: [3, 3],
                shadowColor: 'black',
                shadowBlur: 5,
                shadowOpacity: 0.3
              }"
            />
            <v-text
              :config="{
                text: '推荐重心',
                x: recommendedBalance.centerOfGravity.x * scale + 10,
                y: recommendedBalance.centerOfGravity.y * scale + 12,
                fontSize: 11,
                fill: '#1890ff',
                fontStyle: 'italic'
              }"
            />
          </template>

          <v-text
            :config="{
              text: '船尾',
              x: 10,
              y: ship.width * scale / 2 - 8,
              fontSize: 12,
              fill: '#2c5282',
              fontStyle: 'bold'
            }"
          />
          <v-text
            :config="{
              text: '船首',
              x: ship.length * scale - 40,
              y: ship.width * scale / 2 - 8,
              fontSize: 12,
              fill: '#2c5282',
              fontStyle: 'bold'
            }"
          />
          <v-text
            :config="{
              text: '左舷',
              x: ship.length * scale / 2 - 16,
              y: 10,
              fontSize: 12,
              fill: '#2c5282',
              fontStyle: 'bold'
            }"
          />
          <v-text
            :config="{
              text: '右舷',
              x: ship.length * scale / 2 - 16,
              y: ship.width * scale - 25,
              fontSize: 12,
              fill: '#2c5282',
              fontStyle: 'bold'
            }"
          />
        </v-layer>
      </v-stage>
    </div>

    <div class="deck-legend" v-if="recommendedCargos && showComparison">
      <span class="legend-item">
        <span class="legend-box solid"></span>
        当前方案
      </span>
      <span class="legend-item">
        <span class="legend-box dashed"></span>
        推荐方案
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useShipStore } from '@/stores/shipStore'
import type { Cargo } from '@/types'
import { checkOverlapWithOthers, isCargoWithinShip } from '@/domain'

const store = useShipStore()
const {
  ship,
  cargos,
  balance,
  recommendedBalance,
  validation,
  selectedCargoId,
  currentDeckLevel,
  recommendedCargos,
  showComparison,
  cargosByDeck
} = storeToRefs(store)
const { updateCargo, selectCargo, setCurrentDeckLevel } = store

const wrapperRef = ref<HTMLDivElement | null>(null)
const stageRef = ref<any>(null)
const containerWidth = ref(800)
const scale = ref(6)
const viewMode = ref<'single' | 'all'>('single')

const stageConfig = computed(() => ({
  width: ship.value.length * scale.value,
  height: ship.value.width * scale.value
}))

const displayCargos = computed(() => {
  if (viewMode.value === 'single') {
    return cargos.value.filter((c) => c.deckLevel === currentDeckLevel.value)
  }
  return [...cargos.value].sort((a, b) => a.stackOrder - b.stackOrder)
})

const displayRecommendedCargos = computed(() => {
  if (!recommendedCargos.value) return []
  if (viewMode.value === 'single') {
    return recommendedCargos.value.filter((c) => c.deckLevel === currentDeckLevel.value)
  }
  return recommendedCargos.value
})

const holdZones = computed(() => {
  const s = ship.value
  const x1 = 0
  const x2 = s.length / 3
  const x3 = s.length * 2 / 3
  const x4 = s.length
  const y1 = 0
  const y2 = s.width / 2
  const y3 = s.width
  return [
    { name: '船首左舱', x: x3, y: y1, width: x4 - x3, height: y2 - y1 },
    { name: '船首右舱', x: x3, y: y2, width: x4 - x3, height: y3 - y2 },
    { name: '船中左舱', x: x2, y: y1, width: x3 - x2, height: y2 - y1 },
    { name: '船中右舱', x: x2, y: y2, width: x3 - x2, height: y3 - y2 },
    { name: '船尾左舱', x: x1, y: y1, width: x2 - x1, height: y2 - y1 },
    { name: '船尾右舱', x: x1, y: y2, width: x2 - x1, height: y3 - y2 }
  ]
})

function getCargoOpacity(cargo: Cargo): number {
  if (viewMode.value === 'single') return 1
  const deck = ship.value.decks.find((d) => d.level === cargo.deckLevel)
  if (!deck) return 1
  const levels = ship.value.decks.length
  const baseOpacity = 0.55 + 0.45 * (cargo.deckLevel + 1) / levels
  return Math.min(1, baseOpacity)
}

function getCargoOffset(cargo: Cargo) {
  if (viewMode.value === 'single') return { x: 0, y: 0 }
  return {
    x: cargo.deckLevel * 4,
    y: -cargo.deckLevel * 4
  }
}

function getCargoRectConfig(cargo: Cargo) {
  const isSelected = cargo.id === selectedCargoId.value
  const overlaps = checkOverlapWithOthers(cargo, cargos.value).length > 0
  const outOfBounds = !isCargoWithinShip(cargo, ship.value)
  const offset = getCargoOffset(cargo)

  let stroke = '#fff'
  let strokeWidth = 2
  if (isSelected) {
    stroke = '#ffd700'
    strokeWidth = 3
  }
  if (overlaps || outOfBounds) {
    stroke = '#ff4d4f'
    strokeWidth = 3
  }

  return {
    x: offset.x,
    y: offset.y,
    width: cargo.dimensions.width * scale.value,
    height: cargo.dimensions.height * scale.value,
    fill: cargo.color,
    stroke,
    strokeWidth,
    cornerRadius: 4,
    opacity: overlaps || outOfBounds ? 0.7 : getCargoOpacity(cargo),
    shadowColor: 'black',
    shadowBlur: isSelected ? 10 : 3 + cargo.deckLevel * 2,
    shadowOpacity: isSelected ? 0.4 : 0.2,
    shadowOffsetX: offset.x,
    shadowOffsetY: offset.y
  }
}

function handleStageClick() {
  selectCargo(null)
}

function handleCargoClick(cargo: Cargo) {
  if (viewMode.value === 'all') {
    setCurrentDeckLevel(cargo.deckLevel)
  }
  selectCargo(cargo.id)
}

function handleDragStart(cargo: Cargo) {
  selectCargo(cargo.id)
}

function handleDragMove(e: any, cargo: Cargo) {
  const node = e.target
  const newX = Math.max(0, Math.min(ship.value.length - cargo.dimensions.width, node.x() / scale.value))
  const newY = Math.max(0, Math.min(ship.value.width - cargo.dimensions.height, node.y() / scale.value))

  node.x(newX * scale.value)
  node.y(newY * scale.value)
}

function handleDragEnd(e: any, cargo: Cargo) {
  const node = e.target
  const newX = node.x() / scale.value
  const newY = node.y() / scale.value

  updateCargo(cargo.id, {
    position: {
      ...cargo.position,
      x: Math.max(0, Math.min(ship.value.length - cargo.dimensions.width, newX)),
      y: Math.max(0, Math.min(ship.value.width - cargo.dimensions.height, newY))
    }
  })
}

function handleMouseEnter() {
  document.body.style.cursor = 'pointer'
}

function handleMouseLeave() {
  document.body.style.cursor = 'default'
}

function updateScale() {
  if (wrapperRef.value) {
    const availableWidth = wrapperRef.value.clientWidth - 40
    const availableHeight = wrapperRef.value.clientHeight - 80
    const scaleX = availableWidth / ship.value.length
    const scaleY = availableHeight / ship.value.width
    scale.value = Math.max(2, Math.min(scaleX, scaleY, 10))
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  updateScale()
  if (wrapperRef.value) {
    resizeObserver = new ResizeObserver(updateScale)
    resizeObserver.observe(wrapperRef.value)
  }
  window.addEventListener('resize', updateScale)
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  window.removeEventListener('resize', updateScale)
})
</script>

<style scoped>
.ship-deck-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.deck-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.deck-header h3 {
  font-size: 16px;
  color: #333;
  margin: 0;
}

.view-toggle {
  display: flex;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  overflow: hidden;
}

.view-btn {
  padding: 4px 12px;
  font-size: 12px;
  background: #fff;
  border: none;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.view-btn:not(:last-child) {
  border-right: 1px solid #d9d9d9;
}

.view-btn.active {
  background: #1890ff;
  color: #fff;
}

.scale-info {
  display: flex;
  gap: 20px;
  font-size: 12px;
  color: #666;
}

.deck-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #e8e8e8;
}

.deck-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 8px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.deck-tab:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.deck-tab.active {
  background: #1890ff;
  color: #fff;
  border-color: #1890ff;
}

.tab-name {
  font-size: 12px;
  font-weight: 600;
}

.tab-count {
  font-size: 10px;
  opacity: 0.9;
}

.tab-info {
  font-size: 10px;
  opacity: 0.75;
}

.deck-canvas-wrapper {
  flex: 1;
  padding: 16px;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  min-height: 0;
}

.deck-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 8px 16px;
  background: #fafafa;
  border-top: 1px solid #e8e8e8;
  font-size: 12px;
  color: #555;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-box {
  width: 20px;
  height: 10px;
  border-radius: 2px;
}

.legend-box.solid {
  background: #52c41a;
}

.legend-box.dashed {
  background: repeating-linear-gradient(
    90deg,
    #1890ff,
    #1890ff 4px,
    transparent 4px,
    transparent 8px
  );
  border: 1px solid #1890ff;
}
</style>
