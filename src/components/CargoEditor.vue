<template>
  <div class="cargo-editor">
    <div class="editor-tabs">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'loaded' }"
        @click="activeTab = 'loaded'"
      >
        已装载 ({{ cargos.length }})
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'pending' }"
        @click="activeTab = 'pending'"
      >
        待装队列 ({{ pendingCargos.length }})
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'auto' }"
        @click="activeTab = 'auto'"
      >
        智能配载
      </button>
    </div>

    <div class="editor-body">
      <div class="deck-selector" v-if="activeTab === 'loaded'">
        <span class="selector-label">当前甲板:</span>
        <div class="deck-buttons">
          <button
            v-for="deck in ship.decks"
            :key="deck.id"
            class="deck-btn"
            :class="{ active: currentDeckLevel === deck.level }"
            @click="setCurrentDeckLevel(deck.level)"
          >
            {{ deck.name }}
          </button>
        </div>
      </div>

      <div v-if="activeTab === 'loaded'" class="editor-section">
        <div class="section-header">
          <h3>已装载货物</h3>
          <button class="btn-primary" @click="handleAddCargo">+ 添加货物</button>
        </div>

        <div class="cargo-list" v-if="currentDeckCargos.length > 0">
          <div
            v-for="cargo in currentDeckCargos"
            :key="cargo.id"
            class="cargo-item"
            :class="{ active: cargo.id === selectedCargoId }"
            @click="selectCargo(cargo.id)"
          >
            <div class="cargo-color" :style="{ backgroundColor: cargo.color }"></div>
            <div class="cargo-info">
              <span class="cargo-name">
                {{ cargo.name }}
                <span v-if="cargo.fragile" class="fragile-tag">易碎</span>
              </span>
              <span class="cargo-weight">{{ cargo.weight }} 吨 | L{{ cargo.deckLevel + 1 }}</span>
            </div>
            <div class="cargo-actions">
              <select
                class="deck-select"
                :value="cargo.deckLevel"
                @click.stop
                @change="(e) => moveCargoToDeck(cargo.id, parseInt((e.target as HTMLSelectElement).value))"
              >
                <option v-for="d in ship.decks" :key="d.level" :value="d.level">{{ d.name }}</option>
              </select>
              <button
                class="btn-danger delete-btn"
                @click.stop="handleRemoveCargo(cargo.id)"
              >
                删除
              </button>
            </div>
          </div>
        </div>
        <div class="empty-tip" v-else>
          <p>当前甲板暂无货物</p>
          <p class="sub-tip">点击上方按钮添加货物</p>
        </div>
      </div>

      <div v-if="activeTab === 'pending'" class="editor-section">
        <div class="section-header">
          <h3>待装货物队列</h3>
          <div class="header-actions">
            <button class="btn-default" @click="handleAddPending">+ 添加待装</button>
            <button class="btn-default" @click="handleClearPending" :disabled="pendingCargos.length === 0">清空</button>
          </div>
        </div>

        <div class="cargo-list" v-if="pendingCargos.length > 0">
          <div
            v-for="cargo in pendingCargos"
            :key="cargo.id"
            class="cargo-item pending-item"
            :class="{ active: cargo.id === selectedPendingCargoId }"
            @click="selectPendingCargo(cargo.id)"
          >
            <div class="cargo-color" :style="{ backgroundColor: cargo.color }"></div>
            <div class="cargo-info">
              <span class="cargo-name">
                {{ cargo.name }}
                <span v-if="cargo.fragile" class="fragile-tag">易碎</span>
                <span v-if="cargo.priority && cargo.priority > 1" class="priority-tag">P{{ cargo.priority }}</span>
              </span>
              <span class="cargo-weight">{{ cargo.weight }} 吨 | {{ cargo.dimensions.width }}×{{ cargo.dimensions.height }}×{{ cargo.dimensions.depth }}m</span>
            </div>
            <div class="cargo-actions">
              <button class="btn-success small-btn" @click.stop="movePendingToCargo(cargo.id)" title="手动装载">
                → 装
              </button>
              <button
                class="btn-danger delete-btn"
                @click.stop="removePendingCargo(cargo.id)"
              >
                删除
              </button>
            </div>
          </div>
        </div>
        <div class="empty-tip" v-else>
          <p>暂无待装货物</p>
          <p class="sub-tip">添加货物到待装队列，或使用智能配载</p>
        </div>

        <div class="editor-panel" v-if="selectedPendingCargo">
          <div class="panel-title">编辑待装货物</div>
          <div class="form-group">
            <label>货物名称</label>
            <input
              type="text"
              :value="selectedPendingCargo.name"
              @input="(e) => updatePendingCargo(selectedPendingCargo!.id, { name: (e.target as HTMLInputElement).value })"
            />
          </div>
          <div class="form-group">
            <label>重量 (吨)</label>
            <input
              type="number"
              min="0.1"
              :max="ship.maxLoad"
              step="0.1"
              :value="selectedPendingCargo.weight"
              @input="(e) => updatePendingCargo(selectedPendingCargo!.id, { weight: parseFloat((e.target as HTMLInputElement).value) || 0 })"
            />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>宽 (m)</label>
              <input
                type="number" min="0.1" step="0.5"
                :value="selectedPendingCargo.dimensions.width"
                @input="(e) => updatePendingDim('width', parseFloat((e.target as HTMLInputElement).value) || 0)"
              />
            </div>
            <div class="form-group">
              <label>高 (m)</label>
              <input
                type="number" min="0.1" step="0.5"
                :value="selectedPendingCargo.dimensions.height"
                @input="(e) => updatePendingDim('height', parseFloat((e.target as HTMLInputElement).value) || 0)"
              />
            </div>
            <div class="form-group">
              <label>深 (m)</label>
              <input
                type="number" min="0.1" step="0.5"
                :value="selectedPendingCargo.dimensions.depth"
                @input="(e) => updatePendingDim('depth', parseFloat((e.target as HTMLInputElement).value) || 0)"
              />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>颜色</label>
              <input
                type="color"
                :value="selectedPendingCargo.color"
                @input="(e) => updatePendingCargo(selectedPendingCargo!.id, { color: (e.target as HTMLInputElement).value })"
                class="color-input"
              />
            </div>
            <div class="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  :checked="selectedPendingCargo.fragile"
                  @change="(e) => updatePendingCargo(selectedPendingCargo!.id, { fragile: (e.target as HTMLInputElement).checked })"
                />
                易碎货物
              </label>
            </div>
            <div class="form-group">
              <label>优先级</label>
              <select
                :value="selectedPendingCargo.priority || 1"
                @change="(e) => updatePendingCargo(selectedPendingCargo!.id, { priority: parseInt((e.target as HTMLSelectElement).value) })"
              >
                <option :value="1">普通</option>
                <option :value="2">优先</option>
                <option :value="3">紧急</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'auto'" class="editor-section auto-stowage-section">
        <div class="section-header">
          <h3>智能配载建议</h3>
        </div>

        <div class="auto-options">
          <div class="form-group">
            <label>优化目标</label>
            <select
              :value="autoStowageOptions.priority"
              @change="(e) => autoStowageOptions.priority = (e.target as HTMLSelectElement).value as any"
            >
              <option value="balance">平衡性优先</option>
              <option value="stability">稳性优先</option>
              <option value="space">空间利用优先</option>
              <option value="speed">装卸效率优先</option>
            </select>
          </div>
          <div class="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                v-model="autoStowageOptions.allowStacking"
              />
              允许堆叠
            </label>
          </div>
        </div>

        <div class="auto-stats">
          <div class="stat-item">
            <span class="stat-label">已装载</span>
            <span class="stat-value">{{ cargos.length }} 件 / {{ balance.totalWeight.toFixed(1) }} 吨</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">待装载</span>
            <span class="stat-value">{{ pendingCargos.length }} 件 / {{ pendingTotalWeight.toFixed(1) }} 吨</span>
          </div>
        </div>

        <div class="auto-actions">
          <button
            class="btn-primary full-width"
            @click="handleGeneratePlan"
            :disabled="pendingCargos.length === 0 && cargos.length === 0"
          >
            🤖 生成推荐装载方案
          </button>
          <div class="action-row" v-if="recommendedCargos">
            <button class="btn-success" @click="applyRecommendedPlan">
              ✓ 应用推荐方案
            </button>
            <button class="btn-default" @click="clearRecommendedPlan">
              取消
            </button>
          </div>
        </div>

        <div class="auto-preview" v-if="recommendedCargos">
          <div class="preview-title">推荐方案预览 ({{ recommendedCargos.length }} 件)</div>
          <div class="preview-list">
            <div v-for="(deck, level) in previewByDeck" :key="level" class="preview-deck">
              <div class="preview-deck-name">
                {{ ship.decks[Number(level)]?.name || '甲板' + (Number(level) + 1) }}
                <span class="deck-count">{{ deck.length }} 件</span>
              </div>
              <div class="preview-items">
                <span
                  v-for="c in deck"
                  :key="c.id"
                  class="preview-chip"
                  :style="{ borderColor: c.color }"
                >
                  {{ c.name }} ({{ c.weight }}t)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="editor-panel" v-if="selectedCargo && activeTab === 'loaded'">
        <div class="panel-title">编辑货物属性</div>

        <div class="form-group">
          <label>货物名称</label>
          <input
            type="text"
            :value="selectedCargo.name"
            @input="handleUpdate('name', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div class="form-group">
          <label>重量 (吨) <span class="range-hint">(0.1 ~ {{ ship.maxLoad }})</span></label>
          <input
            type="number"
            min="0.1"
            :max="ship.maxLoad"
            step="0.1"
            :value="selectedCargo.weight"
            @input="handleWeightUpdate(parseFloat(($event.target as HTMLInputElement).value) || 0)"
          />
          <span v-if="selectedCargo.weight <= 0" class="error-msg">重量必须大于零</span>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>宽度 (m)</label>
            <input
              type="number"
              min="0.1"
              :max="ship.length"
              step="0.5"
              :value="selectedCargo.dimensions.width"
              @input="handleDimensionUpdate('width', parseFloat(($event.target as HTMLInputElement).value) || 0)"
            />
          </div>
          <div class="form-group">
            <label>高度 (m)</label>
            <input
              type="number"
              min="0.1"
              :max="ship.width"
              step="0.5"
              :value="selectedCargo.dimensions.height"
              @input="handleDimensionUpdate('height', parseFloat(($event.target as HTMLInputElement).value) || 0)"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>深度 (m) <span class="range-hint">Z轴堆叠</span></label>
            <input
              type="number"
              min="0.1"
              :max="ship.hullDepth"
              step="0.5"
              :value="selectedCargo.dimensions.depth"
              @input="handleDimensionUpdate('depth', parseFloat(($event.target as HTMLInputElement).value) || 0)"
            />
          </div>
          <div class="form-group">
            <label>颜色</label>
            <input
              type="color"
              :value="selectedCargo.color"
              @input="handleUpdate('color', ($event.target as HTMLInputElement).value)"
              class="color-input"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>位置 X (m) <span class="range-hint">(0 ~ {{ maxX.toFixed(1) }})</span></label>
            <input
              type="number"
              min="0"
              :max="maxX"
              step="0.5"
              :value="selectedCargo.position.x"
              @input="handlePositionUpdate('x', parseFloat(($event.target as HTMLInputElement).value) || 0)"
            />
          </div>
          <div class="form-group">
            <label>位置 Y (m) <span class="range-hint">(0 ~ {{ maxY.toFixed(1) }})</span></label>
            <input
              type="number"
              min="0"
              :max="maxY"
              step="0.5"
              :value="selectedCargo.position.y"
              @input="handlePositionUpdate('y', parseFloat(($event.target as HTMLInputElement).value) || 0)"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>位置 Z (m) <span class="range-hint">({{ currentDeck?.zStart.toFixed(1) }} ~ {{ maxZ.toFixed(1) }})</span></label>
            <input
              type="number"
              :min="currentDeck?.zStart || 0"
              :max="maxZ"
              step="0.5"
              :value="selectedCargo.position.z"
              @input="handlePositionUpdate('z', parseFloat(($event.target as HTMLInputElement).value) || 0)"
            />
          </div>
          <div class="form-group">
            <label>堆叠顺序</label>
            <input
              type="number"
              min="0"
              step="1"
              :value="selectedCargo.stackOrder"
              @input="handleUpdate('stackOrder', parseInt(($event.target as HTMLInputElement).value) || 0)"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>所在甲板</label>
            <select
              :value="selectedCargo.deckLevel"
              @change="(e) => updateCargo(selectedCargo!.id, { deckLevel: parseInt((e.target as HTMLSelectElement).value) })"
            >
              <option v-for="d in ship.decks" :key="d.level" :value="d.level">
                {{ d.name }} ({{ d.zStart.toFixed(1) }}-{{ d.zEnd.toFixed(1) }}m)
              </option>
            </select>
          </div>
          <div class="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                :checked="selectedCargo.fragile"
                @change="handleUpdate('fragile', ($event.target as HTMLInputElement).checked)"
              />
              易碎货物
            </label>
          </div>
        </div>
      </div>

      <div class="editor-panel no-selection" v-else-if="cargos.length > 0 && activeTab === 'loaded' && currentDeckCargos.length > 0">
        <p class="select-tip">请选择一个货物进行编辑</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useShipStore } from '@/stores/shipStore'

const store = useShipStore()
const {
  ship,
  cargos,
  pendingCargos,
  selectedCargoId,
  selectedCargo,
  selectedPendingCargoId,
  selectedPendingCargo,
  currentDeckLevel,
  recommendedCargos,
  autoStowageOptions,
  balance,
  cargosByDeck
} = storeToRefs(store)

const {
  addCargo,
  updateCargo,
  removeCargo,
  selectCargo,
  addPendingCargo,
  removePendingCargo,
  updatePendingCargo,
  selectPendingCargo,
  clearPendingCargos,
  setCurrentDeckLevel,
  generateRecommendedPlan,
  applyRecommendedPlan,
  clearRecommendedPlan,
  moveCargoToDeck,
  movePendingToCargo
} = store

const activeTab = ref<'loaded' | 'pending' | 'auto'>('loaded')

const currentDeck = computed(() => ship.value.decks.find((d) => d.level === currentDeckLevel.value))
const currentDeckCargos = computed(() => cargosByDeck.value[currentDeckLevel.value] || [])

const pendingTotalWeight = computed(() =>
  pendingCargos.value.reduce((sum, c) => sum + c.weight, 0)
)

const previewByDeck = computed(() => {
  const result: Record<number, typeof recommendedCargos.value> = {}
  if (!recommendedCargos.value) return result
  recommendedCargos.value.forEach((c) => {
    if (!result[c.deckLevel]) result[c.deckLevel] = []
    result[c.deckLevel].push(c)
  })
  return result
})

const maxX = computed(() => {
  if (!selectedCargo.value) return ship.value.length
  return Math.max(0, ship.value.length - selectedCargo.value.dimensions.width)
})

const maxY = computed(() => {
  if (!selectedCargo.value) return ship.value.width
  return Math.max(0, ship.value.width - selectedCargo.value.dimensions.height)
})

const maxZ = computed(() => {
  if (!selectedCargo.value || !currentDeck.value) return ship.value.hullDepth
  return Math.max(currentDeck.value.zStart, currentDeck.value.zEnd - selectedCargo.value.dimensions.depth)
})

function handleAddCargo() {
  addCargo()
}

function handleAddPending() {
  addPendingCargo()
}

function handleClearPending() {
  if (confirm('确定清空所有待装货物？')) clearPendingCargos()
}

function handleRemoveCargo(id: string) {
  removeCargo(id)
}

function handleUpdate(key: string, value: any) {
  if (selectedCargoId.value) {
    updateCargo(selectedCargoId.value, { [key]: value })
  }
}

function handleWeightUpdate(value: number) {
  if (selectedCargoId.value) {
    const safeValue = Math.min(Math.max(0.1, value), ship.value.maxLoad)
    updateCargo(selectedCargoId.value, { weight: safeValue })
  }
}

function handleDimensionUpdate(key: 'width' | 'height' | 'depth', value: number) {
  if (selectedCargoId.value && selectedCargo.value) {
    const safeValue = Math.max(0.1, value)
    const newDimensions = {
      ...selectedCargo.value.dimensions,
      [key]: safeValue
    }
    const deck = ship.value.decks.find((d) => d.level === selectedCargo.value!.deckLevel) || ship.value.decks[0]
    const newMaxX = Math.max(0, ship.value.length - newDimensions.width)
    const newMaxY = Math.max(0, ship.value.width - newDimensions.height)
    const newMaxZ = Math.max(deck.zStart, deck.zEnd - newDimensions.depth)
    const newPosition = {
      x: Math.min(Math.max(0, selectedCargo.value.position.x), newMaxX),
      y: Math.min(Math.max(0, selectedCargo.value.position.y), newMaxY),
      z: Math.min(Math.max(deck.zStart, selectedCargo.value.position.z), newMaxZ)
    }
    updateCargo(selectedCargoId.value, {
      dimensions: newDimensions,
      position: newPosition
    })
  }
}

function handlePositionUpdate(key: 'x' | 'y' | 'z', value: number) {
  if (selectedCargoId.value && selectedCargo.value) {
    let safeValue = value
    if (key === 'x') safeValue = Math.min(Math.max(0, value), maxX.value)
    if (key === 'y') safeValue = Math.min(Math.max(0, value), maxY.value)
    if (key === 'z') {
      const deck = currentDeck.value || ship.value.decks[0]
      safeValue = Math.min(Math.max(deck.zStart, value), maxZ.value)
    }
    updateCargo(selectedCargoId.value, {
      position: {
        ...selectedCargo.value.position,
        [key]: safeValue
      }
    })
  }
}

function updatePendingDim(key: 'width' | 'height' | 'depth', value: number) {
  if (!selectedPendingCargo.value) return
  const safeValue = Math.max(0.1, value)
  updatePendingCargo(selectedPendingCargo.value.id, {
    dimensions: {
      ...selectedPendingCargo.value.dimensions,
      [key]: safeValue
    }
  })
}

function handleGeneratePlan() {
  generateRecommendedPlan()
}
</script>

<style scoped>
.cargo-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.editor-tabs {
  display: flex;
  border-bottom: 2px solid #e8e8e8;
  background: #fafafa;
}

.tab-btn {
  flex: 1;
  padding: 10px 8px;
  font-size: 13px;
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}

.tab-btn:hover {
  color: #1890ff;
  background: #f5faff;
}

.tab-btn.active {
  color: #1890ff;
  font-weight: 600;
  border-bottom-color: #1890ff;
  background: #fff;
}

.editor-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.deck-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #e8e8e8;
}

.selector-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.deck-buttons {
  display: flex;
  gap: 4px;
  flex: 1;
}

.deck-btn {
  flex: 1;
  padding: 5px 8px;
  font-size: 12px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.deck-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.deck-btn.active {
  background: #1890ff;
  color: #fff;
  border-color: #1890ff;
}

.editor-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #e8e8e8;
}

.section-header h3 {
  font-size: 14px;
  color: #333;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 6px;
}

.cargo-list {
  flex: 1;
  overflow-y: auto;
  min-height: 100px;
}

.cargo-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background 0.2s;
  gap: 8px;
}

.cargo-item:hover {
  background: #f5faff;
}

.cargo-item.active {
  background: #e6f4ff;
}

.cargo-color {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
}

.cargo-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cargo-name {
  font-size: 13px;
  color: #333;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.cargo-weight {
  font-size: 11px;
  color: #999;
}

.fragile-tag {
  display: inline-block;
  padding: 0 4px;
  font-size: 10px;
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
  border-radius: 2px;
  font-weight: normal;
}

.priority-tag {
  display: inline-block;
  padding: 0 4px;
  font-size: 10px;
  background: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
  border-radius: 2px;
  font-weight: normal;
}

.cargo-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  align-items: center;
}

.deck-select {
  padding: 2px 4px;
  font-size: 11px;
  border: 1px solid #d9d9d9;
  border-radius: 3px;
  background: #fff;
}

.small-btn {
  padding: 2px 6px !important;
  font-size: 11px !important;
}

.empty-tip {
  padding: 30px 16px;
  text-align: center;
  color: #999;
  border-bottom: 1px solid #e8e8e8;
}

.empty-tip .sub-tip {
  font-size: 12px;
  margin-top: 4px;
}

.editor-panel {
  padding: 12px;
  border-top: 1px solid #e8e8e8;
  overflow-y: auto;
  max-height: 50%;
  background: #fafafa;
}

.editor-panel.no-selection {
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 100px;
}

.select-tip {
  color: #999;
  font-size: 13px;
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0f0f0;
}

.form-group {
  margin-bottom: 10px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: #555;
  margin-bottom: 4px;
  font-weight: 500;
}

.form-group input[type='text'],
.form-group input[type='number'],
.form-group select {
  width: 100%;
  padding: 5px 8px;
  font-size: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  box-sizing: border-box;
  transition: border 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #1890ff;
}

.form-row {
  display: flex;
  gap: 8px;
}

.form-row .form-group {
  flex: 1;
  min-width: 0;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: normal;
  cursor: pointer;
  padding-top: 2px;
}

.checkbox-group input[type='checkbox'] {
  width: auto;
}

.range-hint {
  font-size: 10px;
  color: #999;
  font-weight: normal;
}

.error-msg {
  display: block;
  font-size: 11px;
  color: #ff4d4f;
  margin-top: 2px;
}

.color-input {
  height: 28px;
  padding: 2px;
  cursor: pointer;
  width: 100%;
}

.auto-stowage-section {
  padding: 12px;
  overflow-y: auto;
}

.auto-options {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.auto-options .form-group {
  flex: 1;
}

.auto-stats {
  display: flex;
  gap: 12px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 12px;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: #888;
  margin-bottom: 2px;
}

.stat-value {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.auto-actions {
  margin-bottom: 12px;
}

.full-width {
  width: 100%;
  padding: 10px;
  font-size: 14px;
}

.action-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.action-row .btn-success,
.action-row .btn-default {
  flex: 1;
}

.auto-preview {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 10px;
}

.preview-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #eee;
}

.preview-deck {
  margin-bottom: 8px;
}

.preview-deck:last-child {
  margin-bottom: 0;
}

.preview-deck-name {
  font-size: 12px;
  font-weight: 500;
  color: #555;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.deck-count {
  font-size: 10px;
  color: #999;
  font-weight: normal;
}

.preview-items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.preview-chip {
  display: inline-block;
  padding: 2px 6px;
  font-size: 11px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-left-width: 3px;
  border-radius: 3px;
  color: #555;
}

.pending-item {
  background: #fffbe6;
}

.pending-item:hover {
  background: #fff7cc;
}
</style>
