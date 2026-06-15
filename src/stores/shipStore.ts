import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Cargo, Ship, BalanceResult, ValidationResult } from '@/types'
import {
  calculateBalance,
  validateLoadingPlan,
  generateId,
  getCargoColor
} from '@/utils/physics'

export const useShipStore = defineStore('ship', () => {
  const ship = ref<Ship>({
    length: 100,
    width: 30,
    maxLoad: 500,
    hullDepth: 6,
    leftRightBalanceThreshold: 0.15,
    frontBackBalanceThreshold: 0.2
  })

  const cargos = ref<Cargo[]>([])
  const selectedCargoId = ref<string | null>(null)
  const savedPlans = ref<{ name: string; cargos: Cargo[]; savedAt: Date }[]>([])

  const selectedCargo = computed(() => {
    return cargos.value.find((c) => c.id === selectedCargoId.value) || null
  })

  const balance = computed<BalanceResult>(() => {
    return calculateBalance(cargos.value, ship.value)
  })

  const validation = computed<ValidationResult>(() => {
    return validateLoadingPlan(cargos.value, ship.value, balance.value)
  })

  function addCargo(partialCargo?: Partial<Cargo>) {
    const index = cargos.value.length
    const newCargo: Cargo = {
      id: generateId(),
      name: `货物 ${index + 1}`,
      weight: partialCargo?.weight ?? 50,
      position: partialCargo?.position ?? {
        x: 10 + (index % 5) * 15,
        y: 5 + Math.floor(index / 5) * 10
      },
      dimensions: partialCargo?.dimensions ?? {
        width: 10,
        height: 8,
        depth: 3
      },
      color: getCargoColor(index),
      rotate: partialCargo?.rotate ?? 0
    }
    cargos.value.push(newCargo)
    selectCargo(newCargo.id)
    return newCargo
  }

  function updateCargo(id: string, updates: Partial<Cargo>) {
    const index = cargos.value.findIndex((c) => c.id === id)
    if (index !== -1) {
      cargos.value[index] = { ...cargos.value[index], ...updates }
    }
  }

  function removeCargo(id: string) {
    cargos.value = cargos.value.filter((c) => c.id !== id)
    if (selectedCargoId.value === id) {
      selectedCargoId.value = null
    }
  }

  function selectCargo(id: string | null) {
    selectedCargoId.value = id
  }

  function clearAllCargos() {
    cargos.value = []
    selectedCargoId.value = null
  }

  function savePlan(name: string): boolean {
    if (!validation.value.canSave) {
      return false
    }
    savedPlans.value.push({
      name,
      cargos: JSON.parse(JSON.stringify(cargos.value)),
      savedAt: new Date()
    })
    return true
  }

  function loadPlan(index: number) {
    if (index >= 0 && index < savedPlans.value.length) {
      cargos.value = JSON.parse(JSON.stringify(savedPlans.value[index].cargos))
      selectedCargoId.value = null
    }
  }

  function updateShipConfig(updates: Partial<Ship>) {
    ship.value = { ...ship.value, ...updates }
  }

  return {
    ship,
    cargos,
    selectedCargoId,
    selectedCargo,
    balance,
    validation,
    savedPlans,
    addCargo,
    updateCargo,
    removeCargo,
    selectCargo,
    clearAllCargos,
    savePlan,
    loadPlan,
    updateShipConfig
  }
})
