import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ScheduleConfig,
  ShipTask,
  CargoTask,
  ScheduleResult,
  SimulationStatus,
  Berth,
  Crane,
  WorkShift,
  LoadingOrderStrategy
} from '@/types'
import {
  getDefaultScheduleConfig,
  getDefaultShipTasks,
  runSimulation
} from '@/utils/scheduling'

export const useSchedulingStore = defineStore('scheduling', () => {
  const config = ref<ScheduleConfig>(getDefaultScheduleConfig())
  const shipTasks = ref<ShipTask[]>(getDefaultShipTasks())
  const simulationResult = ref<ScheduleResult | null>(null)
  const simulationStatus = ref<SimulationStatus>('idle')
  const currentSimulationTime = ref(0)
  const playbackSpeed = ref(1)

  const totalBerths = computed(() => config.value.berths.length)
  const totalCranes = computed(() => config.value.cranes.length)
  const totalShips = computed(() => shipTasks.value.length)
  const totalCargos = computed(() =>
    shipTasks.value.reduce(
      (sum, s) => sum + s.loadCargos.length + s.unloadCargos.length,
      0
    )
  )

  function addBerth(berth: Omit<Berth, 'id'>) {
    const newBerth: Berth = {
      ...berth,
      id: `b${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    }
    config.value.berths.push(newBerth)
  }

  function updateBerth(id: string, updates: Partial<Berth>) {
    const idx = config.value.berths.findIndex((b) => b.id === id)
    if (idx >= 0) {
      config.value.berths[idx] = { ...config.value.berths[idx], ...updates }
    }
  }

  function removeBerth(id: string) {
    config.value.berths = config.value.berths.filter((b) => b.id !== id)
  }

  function addCrane(crane: Omit<Crane, 'id'>) {
    const newCrane: Crane = {
      ...crane,
      id: `c${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    }
    config.value.cranes.push(newCrane)
  }

  function updateCrane(id: string, updates: Partial<Crane>) {
    const idx = config.value.cranes.findIndex((c) => c.id === id)
    if (idx >= 0) {
      config.value.cranes[idx] = { ...config.value.cranes[idx], ...updates }
    }
  }

  function removeCrane(id: string) {
    config.value.cranes = config.value.cranes.filter((c) => c.id !== id)
  }

  function addShift(shift: Omit<WorkShift, 'id'>) {
    const newShift: WorkShift = {
      ...shift,
      id: `s${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    }
    config.value.shifts.push(newShift)
  }

  function updateShift(id: string, updates: Partial<WorkShift>) {
    const idx = config.value.shifts.findIndex((s) => s.id === id)
    if (idx >= 0) {
      config.value.shifts[idx] = { ...config.value.shifts[idx], ...updates }
    }
  }

  function removeShift(id: string) {
    config.value.shifts = config.value.shifts.filter((s) => s.id !== id)
  }

  function updateConfigParam(key: keyof ScheduleConfig, value: any) {
    ;(config.value as any)[key] = value
  }

  function setLoadingOrderStrategy(strategy: LoadingOrderStrategy) {
    config.value.loadingOrderStrategy = strategy
  }

  function setUnloadingOrderStrategy(strategy: LoadingOrderStrategy) {
    config.value.unloadingOrderStrategy = strategy
  }

  function addShipTask(ship: Omit<ShipTask, 'id'>) {
    const newShip: ShipTask = {
      ...ship,
      id: `ship${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    }
    shipTasks.value.push(newShip)
  }

  function updateShipTask(id: string, updates: Partial<ShipTask>) {
    const idx = shipTasks.value.findIndex((s) => s.id === id)
    if (idx >= 0) {
      shipTasks.value[idx] = { ...shipTasks.value[idx], ...updates }
    }
  }

  function removeShipTask(id: string) {
    shipTasks.value = shipTasks.value.filter((s) => s.id !== id)
  }

  function addCargoToShip(
    shipId: string,
    operationType: 'load' | 'unload',
    cargo: Omit<CargoTask, 'id' | 'operationType' | 'shipId'>
  ) {
    const ship = shipTasks.value.find((s) => s.id === shipId)
    if (!ship) return
    const newCargo: CargoTask = {
      ...cargo,
      id: `${operationType[0]}${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      operationType,
      shipId
    }
    if (operationType === 'load') {
      ship.loadCargos.push(newCargo)
    } else {
      ship.unloadCargos.push(newCargo)
    }
  }

  function removeCargoFromShip(shipId: string, cargoId: string) {
    const ship = shipTasks.value.find((s) => s.id === shipId)
    if (!ship) return
    ship.loadCargos = ship.loadCargos.filter((c) => c.id !== cargoId)
    ship.unloadCargos = ship.unloadCargos.filter((c) => c.id !== cargoId)
  }

  function runScheduleSimulation() {
    simulationStatus.value = 'running'
    try {
      simulationResult.value = runSimulation(config.value, shipTasks.value)
      simulationStatus.value = 'completed'
      currentSimulationTime.value = 0
    } catch (e) {
      console.error('Simulation failed:', e)
      simulationStatus.value = 'idle'
    }
  }

  function resetSimulation() {
    simulationResult.value = null
    simulationStatus.value = 'idle'
    currentSimulationTime.value = 0
  }

  function setPlaybackSpeed(speed: number) {
    playbackSpeed.value = speed
  }

  function resetToDefaults() {
    config.value = getDefaultScheduleConfig()
    shipTasks.value = getDefaultShipTasks()
    resetSimulation()
  }

  return {
    config,
    shipTasks,
    simulationResult,
    simulationStatus,
    currentSimulationTime,
    playbackSpeed,
    totalBerths,
    totalCranes,
    totalShips,
    totalCargos,
    addBerth,
    updateBerth,
    removeBerth,
    addCrane,
    updateCrane,
    removeCrane,
    addShift,
    updateShift,
    removeShift,
    updateConfigParam,
    setLoadingOrderStrategy,
    setUnloadingOrderStrategy,
    addShipTask,
    updateShipTask,
    removeShipTask,
    addCargoToShip,
    removeCargoFromShip,
    runScheduleSimulation,
    resetSimulation,
    setPlaybackSpeed,
    resetToDefaults
  }
})
