<template>
  <div class="ships-panel">
    <div class="panel-header">
      <h3>船舶调度任务</h3>
      <button class="btn-add" @click="showShipModal = true">+ 新增船舶</button>
    </div>

    <div class="ships-scroll">
      <div v-for="ship in shipTasks" :key="ship.id" class="ship-card">
        <div class="ship-card-header">
          <div class="ship-info">
            <div class="ship-name">{{ ship.name }}</div>
            <div class="ship-meta">
              <span>到港: {{ formatMinToTime(ship.arrivalTime) }}</span>
              <span>离港: {{ formatMinToTime(ship.scheduledDepartureTime) }}</span>
            </div>
          </div>
          <div class="ship-actions">
            <button class="icon-btn" @click="editShip(ship)">编辑</button>
            <button class="icon-btn danger" @click="removeShip(ship.id)" :disabled="shipTasks.length <= 1">删除</button>
          </div>
        </div>

        <div class="cargo-tabs">
          <div class="tab-row">
            <div
              class="tab-item"
              :class="{ active: activeShipCargo.shipId === ship.id && activeShipCargo.type === 'unload' }"
              @click="setActiveTab(ship.id, 'unload')"
            >
              卸船 ({{ ship.unloadCargos.length }})
            </div>
            <div
              class="tab-item"
              :class="{ active: activeShipCargo.shipId === ship.id && activeShipCargo.type === 'load' }"
              @click="setActiveTab(ship.id, 'load')"
            >
              装船 ({{ ship.loadCargos.length }})
            </div>
            <div class="tab-spacer"></div>
            <button
              class="btn-mini-add"
              @click="openCargoModal(ship.id, activeShipCargo.type)"
            >
              + 货物
            </button>
          </div>

          <div v-if="activeShipCargo.shipId === ship.id" class="cargo-list">
            <div
              v-for="cargo in getActiveCargos(ship)"
              :key="cargo.id"
              class="cargo-item"
            >
              <div class="cargo-main">
                <div class="cargo-name">
                  {{ cargo.cargoName }}
                  <span v-if="cargo.fragile" class="fragile-tag">易碎</span>
                </div>
                <div class="cargo-tags">
                  <span class="weight-tag">{{ cargo.weight }}T</span>
                  <span class="priority-tag" :class="`p${cargo.priority}`">P{{ cargo.priority }}</span>
                </div>
              </div>
              <button
                class="icon-btn danger small"
                @click="removeCargo(ship.id, cargo.id)"
              >
                ×
              </button>
            </div>
            <div v-if="getActiveCargos(ship).length === 0" class="empty-cargos">
              暂无货物，点击右侧按钮添加
            </div>
          </div>
        </div>

        <div class="ship-summary">
          <div class="summary-chip">
            <span class="chip-label">作业总重量</span>
            <span class="chip-value">{{ getShipTotalWeight(ship) }}T</span>
          </div>
          <div class="summary-chip">
            <span class="chip-label">可用作业窗</span>
            <span class="chip-value">{{ getWorkWindow(ship) }}分</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showShipModal" class="modal-overlay" @click.self="closeShipModal">
      <div class="modal">
        <div class="modal-header">
          <h4>{{ editingShip ? '编辑船舶' : '新增船舶' }}</h4>
          <button class="close-btn" @click="closeShipModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>船舶名称</label>
            <input type="text" v-model="shipForm.name" class="form-input" placeholder="如: 和平号" />
          </div>
          <div class="form-row time-row">
            <div class="time-col">
              <label>预计到港时间</label>
              <input type="time" v-model="shipForm.arrivalTimeStr" class="form-input" />
            </div>
            <div class="time-col">
              <label>预定离港时间</label>
              <input type="time" v-model="shipForm.departureTimeStr" class="form-input" />
            </div>
          </div>
          <div class="form-row">
            <label>所需泊位容量 (吨)</label>
            <input type="number" v-model.number="shipForm.requiredBerthCapacity" class="form-input" min="1000" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-default" @click="closeShipModal">取消</button>
          <button class="btn-primary" @click="saveShip">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showCargoModal" class="modal-overlay" @click.self="closeCargoModal">
      <div class="modal">
        <div class="modal-header">
          <h4>新增{{ cargoForm.operationType === 'load' ? '装船' : '卸船' }}货物</h4>
          <button class="close-btn" @click="closeCargoModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>货物名称</label>
            <input type="text" v-model="cargoForm.cargoName" class="form-input" placeholder="如: 集装箱A" />
          </div>
          <div class="form-row param-row">
            <div class="param-col">
              <label>重量 (吨)</label>
              <input type="number" v-model.number="cargoForm.weight" class="form-input" min="0.1" step="0.1" />
            </div>
            <div class="param-col">
              <label>优先级 (1-5)</label>
              <select v-model.number="cargoForm.priority" class="form-select">
                <option :value="1">1 - 最低</option>
                <option :value="2">2 - 低</option>
                <option :value="3">3 - 普通</option>
                <option :value="4">4 - 高</option>
                <option :value="5">5 - 最高</option>
              </select>
            </div>
          </div>
          <div class="form-row checkbox-row">
            <label>
              <input type="checkbox" v-model="cargoForm.fragile" />
              易碎货物
            </label>
          </div>
          <div class="form-row">
            <label>预计可作业时间 (可选)</label>
            <input type="time" v-model="cargoForm.estimatedArrivalStr" class="form-input" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-default" @click="closeCargoModal">取消</button>
          <button class="btn-primary" @click="saveCargo">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useSchedulingStore } from '@/stores/schedulingStore'
import type { ShipTask, CargoTask, OperationType } from '@/types'

const store = useSchedulingStore()
const { shipTasks } = storeToRefs(store)

const showShipModal = ref(false)
const showCargoModal = ref(false)
const editingShip = ref<ShipTask | null>(null)

const activeShipCargo = reactive<{
  shipId: string | null
  type: OperationType
}>({
  shipId: shipTasks.value[0]?.id || null,
  type: 'unload'
})

const shipForm = reactive({
  name: '',
  arrivalTimeStr: '02:00',
  departureTimeStr: '10:00',
  requiredBerthCapacity: 8000
})

const cargoForm = reactive({
  shipId: '' as string,
  operationType: 'load' as OperationType,
  cargoId: '',
  cargoName: '',
  weight: 20,
  fragile: false,
  priority: 3,
  estimatedArrivalStr: '',
  estimatedArrival: 0
})

function formatMinToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function timeStrToMinutes(str: string): number {
  if (!str) return 0
  const [h, m] = str.split(':').map(Number)
  return h * 60 + m
}

function setActiveTab(shipId: string, type: OperationType) {
  activeShipCargo.shipId = shipId
  activeShipCargo.type = type
}

function getActiveCargos(ship: ShipTask): CargoTask[] {
  if (activeShipCargo.shipId !== ship.id) return []
  return activeShipCargo.type === 'load' ? ship.loadCargos : ship.unloadCargos
}

function getShipTotalWeight(ship: ShipTask): number {
  const all = [...ship.loadCargos, ...ship.unloadCargos]
  return all.reduce((s, c) => s + c.weight, 0)
}

function getWorkWindow(ship: ShipTask): number {
  return ship.scheduledDepartureTime - ship.arrivalTime
}

function editShip(ship: ShipTask) {
  editingShip.value = ship
  Object.assign(shipForm, {
    name: ship.name,
    arrivalTimeStr: formatMinToTime(ship.arrivalTime),
    departureTimeStr: formatMinToTime(ship.scheduledDepartureTime),
    requiredBerthCapacity: ship.requiredBerthCapacity
  })
  showShipModal.value = true
}

function closeShipModal() {
  showShipModal.value = false
  editingShip.value = null
}

function saveShip() {
  if (!shipForm.name.trim()) return
  const arrival = timeStrToMinutes(shipForm.arrivalTimeStr)
  const departure = timeStrToMinutes(shipForm.departureTimeStr)
  if (departure <= arrival) {
    alert('离港时间必须晚于到港时间')
    return
  }
  if (editingShip.value) {
    store.updateShipTask(editingShip.value.id, {
      name: shipForm.name,
      arrivalTime: arrival,
      scheduledDepartureTime: departure,
      requiredBerthCapacity: shipForm.requiredBerthCapacity
    })
  } else {
    store.addShipTask({
      name: shipForm.name,
      arrivalTime: arrival,
      scheduledDepartureTime: departure,
      requiredBerthCapacity: shipForm.requiredBerthCapacity,
      loadCargos: [],
      unloadCargos: []
    })
  }
  closeShipModal()
}

function removeShip(id: string) {
  if (confirm('确定要删除此船舶及其所有货物任务吗？')) {
    store.removeShipTask(id)
    if (activeShipCargo.shipId === id) {
      activeShipCargo.shipId = shipTasks.value[0]?.id || null
    }
  }
}

function openCargoModal(shipId: string, type: OperationType) {
  cargoForm.shipId = shipId
  cargoForm.operationType = type
  cargoForm.cargoName = ''
  cargoForm.weight = 20
  cargoForm.fragile = false
  cargoForm.priority = 3
  cargoForm.estimatedArrivalStr = ''
  cargoForm.estimatedArrival = 0
  showCargoModal.value = true
}

function closeCargoModal() {
  showCargoModal.value = false
}

function saveCargo() {
  if (!cargoForm.cargoName.trim()) return
  if (cargoForm.weight <= 0) return
  const ship = shipTasks.value.find((s) => s.id === cargoForm.shipId)
  if (!ship) return

  const arrival = cargoForm.estimatedArrivalStr
    ? timeStrToMinutes(cargoForm.estimatedArrivalStr)
    : ship.arrivalTime

  store.addCargoToShip(cargoForm.shipId, cargoForm.operationType, {
    cargoId: `c${Date.now()}`,
    cargoName: cargoForm.cargoName,
    weight: cargoForm.weight,
    fragile: cargoForm.fragile,
    priority: cargoForm.priority,
    estimatedArrival: arrival
  })
  closeCargoModal()
}

function removeCargo(shipId: string, cargoId: string) {
  store.removeCargoFromShip(shipId, cargoId)
}
</script>

<style scoped>
.ships-panel {
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

.btn-add {
  padding: 3px 10px;
  font-size: 11px;
  background: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  cursor: pointer;
}

.btn-add:hover {
  background: #bae7ff;
}

.ships-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ship-card {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  overflow: hidden;
}

.ship-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%);
  color: #fff;
}

.ship-name {
  font-size: 13px;
  font-weight: 600;
}

.ship-meta {
  font-size: 10px;
  opacity: 0.9;
  display: flex;
  gap: 10px;
  margin-top: 2px;
}

.ship-actions {
  display: flex;
  gap: 4px;
}

.ship-actions .icon-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  padding: 2px 6px;
  font-size: 10px;
}

.ship-actions .icon-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.ship-actions .icon-btn.danger {
  background: rgba(255, 77, 79, 0.3);
  border-color: rgba(255, 77, 79, 0.5);
}

.cargo-tabs {
  padding: 6px 10px 8px;
}

.tab-row {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 6px;
}

.tab-item {
  padding: 4px 10px;
  font-size: 11px;
  background: #fff;
  color: #666;
  border: 1px solid #e8e8e8;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  border-bottom: none;
}

.tab-item.active {
  background: #fff;
  color: #1890ff;
  border-color: #1890ff;
  font-weight: 600;
}

.tab-spacer {
  flex: 1;
  height: 1px;
  background: #e8e8e8;
  align-self: flex-end;
}

.btn-mini-add {
  padding: 2px 6px;
  font-size: 10px;
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
  border-radius: 3px;
  cursor: pointer;
}

.btn-mini-add:hover {
  background: #d9f7be;
}

.cargo-list {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 0 4px 4px 4px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 180px;
  overflow-y: auto;
}

.cargo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px;
  background: #fafafa;
  border-radius: 3px;
}

.cargo-main {
  flex: 1;
  min-width: 0;
}

.cargo-name {
  font-size: 11px;
  color: #333;
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

.cargo-tags {
  display: flex;
  gap: 4px;
  margin-top: 2px;
}

.weight-tag {
  font-size: 10px;
  padding: 0 4px;
  background: #e6f7ff;
  color: #1890ff;
  border-radius: 2px;
}

.priority-tag {
  font-size: 9px;
  padding: 0 4px;
  border-radius: 2px;
  font-weight: 600;
}

.priority-tag.p1 { background: #f5f5f5; color: #999; }
.priority-tag.p2 { background: #e6fffb; color: #13c2c2; }
.priority-tag.p3 { background: #e6f7ff; color: #1890ff; }
.priority-tag.p4 { background: #fff7e6; color: #fa8c16; }
.priority-tag.p5 { background: #fff1f0; color: #f5222d; }

.icon-btn {
  padding: 2px 6px;
  font-size: 10px;
  background: #fff;
  color: #1890ff;
  border: 1px solid #d9d9d9;
  border-radius: 3px;
  cursor: pointer;
}

.icon-btn.small {
  padding: 0 5px;
  font-size: 12px;
  line-height: 1.3;
}

.icon-btn.danger {
  color: #ff4d4f;
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-cargos {
  padding: 10px;
  text-align: center;
  font-size: 10px;
  color: #999;
}

.ship-summary {
  display: flex;
  gap: 6px;
  padding: 6px 10px;
  border-top: 1px solid #e8e8e8;
  background: #fff;
}

.summary-chip {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px;
  background: #f6ffed;
  border-radius: 3px;
}

.chip-label {
  font-size: 9px;
  color: #8c8c8c;
}

.chip-value {
  font-size: 12px;
  font-weight: 600;
  color: #389e0d;
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

.time-row,
.param-row {
  flex-direction: row;
  gap: 8px;
}

.time-col,
.param-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.checkbox-row {
  flex-direction: row;
  align-items: center;
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

.form-select,
.form-input {
  padding: 5px 8px;
  font-size: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.form-select:focus,
.form-input:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
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
}

.btn-primary:hover {
  background: #40a9ff;
}
</style>
