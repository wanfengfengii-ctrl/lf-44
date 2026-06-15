<template>
  <div class="config-panel">
    <div class="panel-header">
      <h3>调度配置</h3>
      <div class="header-actions">
        <button class="btn-default" @click="$emit('reset')">重置默认</button>
        <button class="btn-primary" @click="$emit('simulate')">开始模拟</button>
      </div>
    </div>

    <div class="config-scroll">
      <section class="config-section">
        <div class="section-title-row">
          <span class="section-title">码头泊位配置</span>
          <button class="btn-add" @click="showBerthModal = true">+ 新增泊位</button>
        </div>
        <div class="list-container">
          <div v-for="berth in config.berths" :key="berth.id" class="list-item">
            <div class="item-main">
              <div class="item-name">{{ berth.name }}</div>
              <div class="item-tags">
                <span class="tag">容量: {{ formatNumber(berth.capacity) }}T</span>
                <span class="tag">吊机数: {{ berth.craneCount }}</span>
                <span class="tag" :class="{ active: berth.available, inactive: !berth.available }">
                  {{ berth.available ? '启用' : '停用' }}
                </span>
              </div>
            </div>
            <div class="item-actions">
              <button class="icon-btn" @click="editBerth(berth)">编辑</button>
              <button class="icon-btn danger" @click="removeBerth(berth.id)" :disabled="config.berths.length <= 1">删除</button>
            </div>
          </div>
        </div>
      </section>

      <section class="config-section">
        <div class="section-title-row">
          <span class="section-title">吊机设备配置</span>
          <span class="section-sub">单件起吊上限 (吨)</span>
          <button class="btn-add" @click="showCraneModal = true">+ 新增吊机</button>
        </div>
        <div class="list-container">
          <div v-for="crane in config.cranes" :key="crane.id" class="list-item">
            <div class="item-main">
              <div class="item-name">{{ crane.name }}</div>
              <div class="item-tags">
                <span class="tag">上限: {{ crane.maxLiftWeight }}T</span>
                <span class="tag">效率: {{ (crane.efficiency * 100).toFixed(0) }}%</span>
                <span v-if="crane.currentBerthId" class="tag blue">
                  泊位: {{ getBerthName(crane.currentBerthId) }}
                </span>
              </div>
            </div>
            <div class="item-actions">
              <button class="icon-btn" @click="editCrane(crane)">编辑</button>
              <button class="icon-btn danger" @click="removeCrane(crane.id)" :disabled="config.cranes.length <= 1">删除</button>
            </div>
          </div>
        </div>
      </section>

      <section class="config-section">
        <div class="section-title-row">
          <span class="section-title">作业班次配置</span>
          <button class="btn-add" @click="showShiftModal = true">+ 新增班次</button>
        </div>
        <div class="list-container">
          <div v-for="shift in config.shifts" :key="shift.id" class="list-item">
            <div class="item-main">
              <div class="item-name">{{ shift.name }}</div>
              <div class="item-tags">
                <span class="tag">{{ formatMinToTime(shift.startTime) }} - {{ formatMinToTime(shift.endTime) }}</span>
                <span class="tag">工人数: {{ shift.workerCount }}</span>
                <span class="tag green">效率: {{ (shift.efficiencyMultiplier * 100).toFixed(0) }}%</span>
              </div>
            </div>
            <div class="item-actions">
              <button class="icon-btn" @click="editShift(shift)">编辑</button>
              <button class="icon-btn danger" @click="removeShift(shift.id)" :disabled="config.shifts.length <= 1">删除</button>
            </div>
          </div>
        </div>
      </section>

      <section class="config-section">
        <div class="section-title-row">
          <span class="section-title">装卸顺序策略</span>
        </div>
        <div class="strategy-grid">
          <div class="strategy-col">
            <label class="strategy-label">装船顺序</label>
            <select v-model="localLoadStrategy" class="form-select" @change="updateLoadStrategy">
              <option value="fifo">先进先出 (FIFO)</option>
              <option value="weight_desc">优先重货</option>
              <option value="weight_asc">优先轻货</option>
              <option value="priority">按优先级</option>
              <option value="fragile_last">易碎品最后</option>
            </select>
          </div>
          <div class="strategy-col">
            <label class="strategy-label">卸船顺序</label>
            <select v-model="localUnloadStrategy" class="form-select" @change="updateUnloadStrategy">
              <option value="fifo">先进先出 (FIFO)</option>
              <option value="weight_desc">优先重货</option>
              <option value="weight_asc">优先轻货</option>
              <option value="priority">按优先级</option>
              <option value="fragile_last">易碎品最后</option>
            </select>
          </div>
        </div>
      </section>

      <section class="config-section">
        <div class="section-title-row">
          <span class="section-title">时间参数设置</span>
        </div>
        <div class="param-grid">
          <div class="param-item">
            <label>平均吊装时长 (分钟)</label>
            <input
              type="number"
              v-model.number="config.averageLiftTime"
              class="form-input"
              min="1"
              max="60"
              @change="updateParam('averageLiftTime', config.averageLiftTime)"
            />
          </div>
          <div class="param-item">
            <label>队列缓冲时间 (分钟)</label>
            <input
              type="number"
              v-model.number="config.queueBufferTime"
              class="form-input"
              min="0"
              max="60"
              @change="updateParam('queueBufferTime', config.queueBufferTime)"
            />
          </div>
          <div class="param-item">
            <label>船舶准备时间 (分钟)</label>
            <input
              type="number"
              v-model.number="config.shipPreparationTime"
              class="form-input"
              min="5"
              max="240"
              @change="updateParam('shipPreparationTime', config.shipPreparationTime)"
            />
          </div>
        </div>
      </section>
    </div>

    <div v-if="showBerthModal" class="modal-overlay" @click.self="closeBerthModal">
      <div class="modal">
        <div class="modal-header">
          <h4>{{ editingBerth ? '编辑泊位' : '新增泊位' }}</h4>
          <button class="close-btn" @click="closeBerthModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>泊位名称</label>
            <input type="text" v-model="berthForm.name" class="form-input" placeholder="如: 4号泊位" />
          </div>
          <div class="form-row">
            <label>容量吨位 (吨)</label>
            <input type="number" v-model.number="berthForm.capacity" class="form-input" min="1000" />
          </div>
          <div class="form-row">
            <label>可停靠吊机数量</label>
            <input type="number" v-model.number="berthForm.craneCount" class="form-input" min="1" max="10" />
          </div>
          <div class="form-row checkbox-row">
            <label>
              <input type="checkbox" v-model="berthForm.available" />
              启用此泊位
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-default" @click="closeBerthModal">取消</button>
          <button class="btn-primary" @click="saveBerth">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showCraneModal" class="modal-overlay" @click.self="closeCraneModal">
      <div class="modal">
        <div class="modal-header">
          <h4>{{ editingCrane ? '编辑吊机' : '新增吊机' }}</h4>
          <button class="close-btn" @click="closeCraneModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>吊机名称</label>
            <input type="text" v-model="craneForm.name" class="form-input" placeholder="如: 吊机E" />
          </div>
          <div class="form-row">
            <label>单件起吊上限 (吨)</label>
            <input type="number" v-model.number="craneForm.maxLiftWeight" class="form-input" min="5" />
          </div>
          <div class="form-row">
            <label>工作效率 (0.5 - 1.5)</label>
            <input type="number" v-model.number="craneForm.efficiency" class="form-input" min="0.5" max="1.5" step="0.05" />
          </div>
          <div class="form-row">
            <label>分配到泊位 (可选)</label>
            <select v-model="craneForm.currentBerthId" class="form-select">
              <option :value="null">自动分配</option>
              <option v-for="b in config.berths" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-default" @click="closeCraneModal">取消</button>
          <button class="btn-primary" @click="saveCrane">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showShiftModal" class="modal-overlay" @click.self="closeShiftModal">
      <div class="modal">
        <div class="modal-header">
          <h4>{{ editingShift ? '编辑班次' : '新增班次' }}</h4>
          <button class="close-btn" @click="closeShiftModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>班次名称</label>
            <input type="text" v-model="shiftForm.name" class="form-input" placeholder="如: 凌晨班" />
          </div>
          <div class="form-row time-row">
            <div class="time-col">
              <label>开始时间</label>
              <input type="time" v-model="shiftForm.startTimeStr" class="form-input" @change="updateShiftTime" />
            </div>
            <div class="time-col">
              <label>结束时间</label>
              <input type="time" v-model="shiftForm.endTimeStr" class="form-input" @change="updateShiftTime" />
            </div>
          </div>
          <div class="form-row">
            <label>工人数量</label>
            <input type="number" v-model.number="shiftForm.workerCount" class="form-input" min="1" />
          </div>
          <div class="form-row">
            <label>效率系数 (0.5 - 1.5)</label>
            <input type="number" v-model.number="shiftForm.efficiencyMultiplier" class="form-input" min="0.5" max="1.5" step="0.05" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-default" @click="closeShiftModal">取消</button>
          <button class="btn-primary" @click="saveShift">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSchedulingStore } from '@/stores/schedulingStore'
import type { Berth, Crane, WorkShift, LoadingOrderStrategy } from '@/types'

defineEmits<{
  (e: 'simulate'): void
  (e: 'reset'): void
}>()

const store = useSchedulingStore()
const { config } = storeToRefs(store)

const showBerthModal = ref(false)
const showCraneModal = ref(false)
const showShiftModal = ref(false)

const editingBerth = ref<Berth | null>(null)
const editingCrane = ref<Crane | null>(null)
const editingShift = ref<WorkShift | null>(null)

const berthForm = reactive({
  name: '',
  capacity: 8000,
  craneCount: 2,
  available: true
})

const craneForm = reactive({
  name: '',
  maxLiftWeight: 50,
  efficiency: 1.0,
  currentBerthId: null as string | null
})

const shiftForm = reactive({
  name: '',
  startTimeStr: '08:00',
  endTimeStr: '16:00',
  startTime: 480,
  endTime: 960,
  workerCount: 15,
  efficiencyMultiplier: 1.0
})

const localLoadStrategy = ref<LoadingOrderStrategy>(config.value.loadingOrderStrategy)
const localUnloadStrategy = ref<LoadingOrderStrategy>(config.value.unloadingOrderStrategy)

watch(
  () => config.value.loadingOrderStrategy,
  (v) => (localLoadStrategy.value = v)
)
watch(
  () => config.value.unloadingOrderStrategy,
  (v) => (localUnloadStrategy.value = v)
)

function formatNumber(n: number): string {
  return n.toLocaleString()
}

function formatMinToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function timeStrToMinutes(str: string): number {
  const [h, m] = str.split(':').map(Number)
  return h * 60 + m
}

function getBerthName(id: string): string {
  return config.value.berths.find((b) => b.id === id)?.name || '未知'
}

function editBerth(berth: Berth) {
  editingBerth.value = berth
  Object.assign(berthForm, {
    name: berth.name,
    capacity: berth.capacity,
    craneCount: berth.craneCount,
    available: berth.available
  })
  showBerthModal.value = true
}

function closeBerthModal() {
  showBerthModal.value = false
  editingBerth.value = null
}

function saveBerth() {
  if (!berthForm.name.trim()) return
  if (editingBerth.value) {
    store.updateBerth(editingBerth.value.id, { ...berthForm })
  } else {
    store.addBerth({ ...berthForm })
  }
  closeBerthModal()
}

function removeBerth(id: string) {
  if (confirm('确定要删除此泊位吗？')) {
    store.removeBerth(id)
  }
}

function editCrane(crane: Crane) {
  editingCrane.value = crane
  Object.assign(craneForm, {
    name: crane.name,
    maxLiftWeight: crane.maxLiftWeight,
    efficiency: crane.efficiency,
    currentBerthId: crane.currentBerthId
  })
  showCraneModal.value = true
}

function closeCraneModal() {
  showCraneModal.value = false
  editingCrane.value = null
}

function saveCrane() {
  if (!craneForm.name.trim()) return
  if (editingCrane.value) {
    store.updateCrane(editingCrane.value.id, { ...craneForm })
  } else {
    store.addCrane({ ...craneForm })
  }
  closeCraneModal()
}

function removeCrane(id: string) {
  if (confirm('确定要删除此吊机吗？')) {
    store.removeCrane(id)
  }
}

function editShift(shift: WorkShift) {
  editingShift.value = shift
  Object.assign(shiftForm, {
    name: shift.name,
    startTimeStr: formatMinToTime(shift.startTime),
    endTimeStr: formatMinToTime(shift.endTime),
    startTime: shift.startTime,
    endTime: shift.endTime,
    workerCount: shift.workerCount,
    efficiencyMultiplier: shift.efficiencyMultiplier
  })
  showShiftModal.value = true
}

function closeShiftModal() {
  showShiftModal.value = false
  editingShift.value = null
}

function updateShiftTime() {
  shiftForm.startTime = timeStrToMinutes(shiftForm.startTimeStr)
  shiftForm.endTime = timeStrToMinutes(shiftForm.endTimeStr)
}

function saveShift() {
  if (!shiftForm.name.trim()) return
  updateShiftTime()
  if (editingShift.value) {
    store.updateShift(editingShift.value.id, {
      name: shiftForm.name,
      startTime: shiftForm.startTime,
      endTime: shiftForm.endTime,
      workerCount: shiftForm.workerCount,
      efficiencyMultiplier: shiftForm.efficiencyMultiplier
    })
  } else {
    store.addShift({
      name: shiftForm.name,
      startTime: shiftForm.startTime,
      endTime: shiftForm.endTime,
      workerCount: shiftForm.workerCount,
      efficiencyMultiplier: shiftForm.efficiencyMultiplier
    })
  }
  closeShiftModal()
}

function removeShift(id: string) {
  if (confirm('确定要删除此班次吗？')) {
    store.removeShift(id)
  }
}

function updateLoadStrategy() {
  store.setLoadingOrderStrategy(localLoadStrategy.value)
}

function updateUnloadStrategy() {
  store.setUnloadingOrderStrategy(localUnloadStrategy.value)
}

function updateParam(key: string, value: any) {
  store.updateConfigParam(key as any, value)
}
</script>

<style scoped>
.config-panel {
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

.header-actions {
  display: flex;
  gap: 6px;
}

.config-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
}

.config-section {
  margin-bottom: 16px;
  padding: 10px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 8px;
  flex-wrap: wrap;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.section-sub {
  font-size: 11px;
  color: #999;
}

.btn-add {
  padding: 3px 10px;
  font-size: 11px;
  background: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add:hover {
  background: #bae7ff;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  margin-bottom: 3px;
}

.item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag {
  font-size: 10px;
  padding: 1px 6px;
  background: #f0f0f0;
  color: #666;
  border-radius: 3px;
}

.tag.active {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.tag.inactive {
  background: #f5f5f5;
  color: #999;
  border: 1px solid #d9d9d9;
}

.tag.blue {
  background: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
}

.tag.green {
  background: #f6ffed;
  color: #52c41a;
}

.item-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.icon-btn {
  padding: 2px 8px;
  font-size: 10px;
  background: #fafafa;
  color: #1890ff;
  border: 1px solid #d9d9d9;
  border-radius: 3px;
  cursor: pointer;
}

.icon-btn:hover:not(:disabled) {
  background: #e6f7ff;
}

.icon-btn.danger {
  color: #ff4d4f;
}

.icon-btn.danger:hover:not(:disabled) {
  background: #fff2f0;
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.strategy-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.strategy-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.strategy-label {
  font-size: 11px;
  color: #666;
}

.form-select,
.form-input {
  padding: 5px 8px;
  font-size: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  outline: none;
  transition: border-color 0.2s;
  width: 100%;
  box-sizing: border-box;
}

.form-select:focus,
.form-input:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.param-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.param-item label {
  font-size: 10px;
  color: #666;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  border-radius: 8px;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.modal-header h4 {
  margin: 0;
  font-size: 14px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
}

.close-btn:hover {
  color: #666;
}

.modal-body {
  padding: 14px 16px;
}

.form-row {
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-row label {
  font-size: 11px;
  color: #666;
  font-weight: 500;
}

.checkbox-row {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.checkbox-row label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #333;
  font-weight: 400;
}

.time-row {
  flex-direction: row;
  gap: 8px;
}

.time-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e8e8e8;
  background: #fafafa;
}

.btn-default {
  padding: 5px 14px;
  font-size: 12px;
  background: #fff;
  color: #666;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-default:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.btn-primary {
  padding: 5px 14px;
  font-size: 12px;
  background: #1890ff;
  color: #fff;
  border: 1px solid #1890ff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #40a9ff;
  border-color: #40a9ff;
}
</style>
