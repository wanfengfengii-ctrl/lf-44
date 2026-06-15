<template>
  <div class="cargo-editor">
    <div class="editor-header">
      <h3>货物管理</h3>
      <button class="btn-primary" @click="handleAddCargo">+ 添加货物</button>
    </div>

    <div class="cargo-list" v-if="cargos.length > 0">
      <div
        v-for="cargo in cargos"
        :key="cargo.id"
        class="cargo-item"
        :class="{ active: cargo.id === selectedCargoId }"
        @click="selectCargo(cargo.id)"
      >
        <div class="cargo-color" :style="{ backgroundColor: cargo.color }"></div>
        <div class="cargo-info">
          <span class="cargo-name">{{ cargo.name }}</span>
          <span class="cargo-weight">{{ cargo.weight }} 吨</span>
        </div>
        <button
          class="btn-danger delete-btn"
          @click.stop="handleRemoveCargo(cargo.id)"
        >
          删除
        </button>
      </div>
    </div>
    <div class="empty-tip" v-else>
      <p>暂无货物</p>
      <p class="sub-tip">点击上方按钮添加货物</p>
    </div>

    <div class="editor-panel" v-if="selectedCargo">
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
        <label>重量 (吨)</label>
        <input
          type="number"
          min="0.1"
          step="0.1"
          :value="selectedCargo.weight"
          @input="handleUpdate('weight', parseFloat(($event.target as HTMLInputElement).value) || 0)"
        />
        <span v-if="selectedCargo.weight <= 0" class="error-msg">重量必须大于零</span>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>宽度 (米)</label>
          <input
            type="number"
            min="0.1"
            step="0.5"
            :value="selectedCargo.dimensions.width"
            @input="handleDimensionUpdate('width', parseFloat(($event.target as HTMLInputElement).value) || 0)"
          />
          <span v-if="selectedCargo.dimensions.width <= 0" class="error-msg">必须大于零</span>
        </div>
        <div class="form-group">
          <label>高度 (米)</label>
          <input
            type="number"
            min="0.1"
            step="0.5"
            :value="selectedCargo.dimensions.height"
            @input="handleDimensionUpdate('height', parseFloat(($event.target as HTMLInputElement).value) || 0)"
          />
          <span v-if="selectedCargo.dimensions.height <= 0" class="error-msg">必须大于零</span>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>深度 (米)</label>
          <input
            type="number"
            min="0.1"
            step="0.5"
            :value="selectedCargo.dimensions.depth"
            @input="handleDimensionUpdate('depth', parseFloat(($event.target as HTMLInputElement).value) || 0)"
          />
          <span v-if="selectedCargo.dimensions.depth <= 0" class="error-msg">必须大于零</span>
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
          <label>位置 X (米)</label>
          <input
            type="number"
            min="0"
            step="0.5"
            :value="selectedCargo.position.x"
            @input="handlePositionUpdate('x', parseFloat(($event.target as HTMLInputElement).value) || 0)"
          />
        </div>
        <div class="form-group">
          <label>位置 Y (米)</label>
          <input
            type="number"
            min="0"
            step="0.5"
            :value="selectedCargo.position.y"
            @input="handlePositionUpdate('y', parseFloat(($event.target as HTMLInputElement).value) || 0)"
          />
        </div>
      </div>
    </div>

    <div class="editor-panel no-selection" v-else-if="cargos.length > 0">
      <p class="select-tip">请选择一个货物进行编辑</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useShipStore } from '@/stores/shipStore'

const store = useShipStore()
const { cargos, selectedCargoId, selectedCargo } = storeToRefs(store)
const { addCargo, updateCargo, removeCargo, selectCargo } = store

function handleAddCargo() {
  addCargo()
}

function handleRemoveCargo(id: string) {
  removeCargo(id)
}

function handleUpdate(key: string, value: any) {
  if (selectedCargoId.value) {
    updateCargo(selectedCargoId.value, { [key]: value })
  }
}

function handleDimensionUpdate(key: string, value: number) {
  if (selectedCargoId.value && selectedCargo.value) {
    updateCargo(selectedCargoId.value, {
      dimensions: {
        ...selectedCargo.value.dimensions,
        [key]: value
      }
    })
  }
}

function handlePositionUpdate(key: string, value: number) {
  if (selectedCargoId.value && selectedCargo.value) {
    updateCargo(selectedCargoId.value, {
      position: {
        ...selectedCargo.value.position,
        [key]: Math.max(0, value)
      }
    })
  }
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

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.editor-header h3 {
  font-size: 16px;
  color: #333;
}

.cargo-list {
  max-height: 200px;
  overflow-y: auto;
  border-bottom: 1px solid #e8e8e8;
}

.cargo-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background 0.2s;
}

.cargo-item:hover {
  background: #f5faff;
}

.cargo-item.active {
  background: #e6f4ff;
}

.cargo-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  margin-right: 12px;
  flex-shrink: 0;
}

.cargo-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.cargo-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.cargo-weight {
  font-size: 12px;
  color: #999;
}

.delete-btn {
  padding: 4px 10px;
  font-size: 12px;
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
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.editor-panel.no-selection {
  display: flex;
  align-items: center;
  justify-content: center;
}

.select-tip {
  color: #999;
  font-size: 14px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.form-group {
  margin-bottom: 12px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
}

.error-msg {
  display: block;
  font-size: 11px;
  color: #ff4d4f;
  margin-top: 3px;
}

.color-input {
  height: 32px;
  padding: 2px;
  cursor: pointer;
}
</style>
