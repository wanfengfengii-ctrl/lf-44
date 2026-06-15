<template>
  <div class="ship-deck-container">
    <div class="deck-header">
      <h3>船体俯视图</h3>
      <div class="scale-info">
        <span>比例尺: {{ scale.toFixed(2) }}x</span>
        <span>船首 →</span>
      </div>
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
          <v-group
            v-for="cargo in cargos"
            :key="cargo.id"
            :config="{
              x: cargo.position.x * scale,
              y: cargo.position.y * scale,
              draggable: true,
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
                y: cargo.dimensions.height * scale / 2 - 8,
                width: cargo.dimensions.width * scale - 10,
                align: 'center',
                fontSize: 12,
                fontStyle: 'bold',
                fill: '#fff',
                listening: false
              }"
            />
            <v-text
              :config="{
                text: cargo.weight + '吨',
                x: 5,
                y: cargo.dimensions.height * scale / 2 + 8,
                width: cargo.dimensions.width * scale - 10,
                align: 'center',
                fontSize: 11,
                fill: '#fff',
                listening: false
              }"
            />
          </v-group>
          <v-circle
            v-if="cargos.length > 0"
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
            v-if="cargos.length > 0"
            :config="{
              text: '重心',
              x: balance.centerOfGravity.x * scale + 12,
              y: balance.centerOfGravity.y * scale - 6,
              fontSize: 12,
              fill: validation.canSave ? '#52c41a' : '#ff4d4f',
              fontStyle: 'bold'
            }"
          />
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useShipStore } from '@/stores/shipStore'
import type { Cargo } from '@/types'
import { checkOverlapWithOthers, isCargoWithinShip } from '@/utils/physics'

const store = useShipStore()
const { ship, cargos, balance, validation, selectedCargoId } = storeToRefs(store)
const { updateCargo, selectCargo } = store

const wrapperRef = ref<HTMLDivElement | null>(null)
const stageRef = ref<any>(null)
const containerWidth = ref(800)
const scale = ref(6)

const stageConfig = computed(() => ({
  width: ship.value.length * scale.value,
  height: ship.value.width * scale.value
}))

const holdZones = computed(() => {
  const s = ship.value
  return [
    { name: '船首左舱', x: s.length * 0.5, y: 0, width: s.length * 0.5, height: s.width * 0.5 },
    { name: '船首右舱', x: s.length * 0.5, y: s.width * 0.5, width: s.length * 0.5, height: s.width * 0.5 },
    { name: '船尾左舱', x: 0, y: 0, width: s.length * 0.5, height: s.width * 0.5 },
    { name: '船尾右舱', x: 0, y: s.width * 0.5, width: s.length * 0.5, height: s.width * 0.5 }
  ]
})

function getCargoRectConfig(cargo: Cargo) {
  const isSelected = cargo.id === selectedCargoId.value
  const overlaps = checkOverlapWithOthers(cargo, cargos.value).length > 0
  const outOfBounds = !isCargoWithinShip(cargo, ship.value)

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
    width: cargo.dimensions.width * scale.value,
    height: cargo.dimensions.height * scale.value,
    fill: cargo.color,
    stroke,
    strokeWidth,
    cornerRadius: 4,
    opacity: overlaps || outOfBounds ? 0.7 : 1,
    shadowColor: 'black',
    shadowBlur: isSelected ? 10 : 3,
    shadowOpacity: isSelected ? 0.4 : 0.2
  }
}

function handleStageClick() {
  selectCargo(null)
}

function handleCargoClick(cargo: Cargo) {
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
  padding: 12px 20px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.deck-header h3 {
  font-size: 16px;
  color: #333;
}

.scale-info {
  display: flex;
  gap: 20px;
  font-size: 12px;
  color: #666;
}

.deck-canvas-wrapper {
  flex: 1;
  padding: 20px;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
}
</style>
