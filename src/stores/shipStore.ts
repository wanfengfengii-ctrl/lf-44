import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Cargo, PendingCargo, AutoStowageOptions } from '@/types'
import {
  calculateBalance,
  validateLoadingPlan,
  generateAutoStowage,
  comparePlans,
  generateId,
  getCargoColor,
  createDefaultShip
} from '@/domain'
import type { Ship, BalanceResult, ValidationResult, PlanComparison } from '@/types'

export const useShipStore = defineStore('ship', () => {
  const ship = ref<Ship>(createDefaultShip())

  const cargos = ref<Cargo[]>([])
  const pendingCargos = ref<PendingCargo[]>([])
  const selectedCargoId = ref<string | null>(null)
  const selectedPendingCargoId = ref<string | null>(null)
  const savedPlans = ref<{ name: string; cargos: Cargo[]; savedAt: Date; score: number }[]>([])
  const currentDeckLevel = ref<number>(0)
  const recommendedCargos = ref<Cargo[] | null>(null)
  const showComparison = ref(false)
  const autoStowageOptions = ref<AutoStowageOptions>({
    priority: 'balance',
    allowStacking: true,
    maxStackLayers: 3
  })

  const selectedCargo = computed(() => {
    return cargos.value.find((c) => c.id === selectedCargoId.value) || null
  })

  const selectedPendingCargo = computed(() => {
    return pendingCargos.value.find((c) => c.id === selectedPendingCargoId.value) || null
  })

  const balance = computed<BalanceResult>(() => {
    return calculateBalance(cargos.value, ship.value)
  })

  const recommendedBalance = computed<BalanceResult | null>(() => {
    if (!recommendedCargos.value) return null
    return calculateBalance(recommendedCargos.value, ship.value)
  })

  const validation = computed<ValidationResult>(() => {
    return validateLoadingPlan(cargos.value, ship.value, balance.value)
  })

  const planComparison = computed<PlanComparison | null>(() => {
    if (!recommendedBalance.value) return null
    return comparePlans(balance.value, recommendedBalance.value)
  })

  const cargosByDeck = computed(() => {
    const grouped: Record<number, Cargo[]> = {}
    ship.value.decks.forEach((d) => {
      grouped[d.level] = []
    })
    cargos.value.forEach((c) => {
      if (!grouped[c.deckLevel]) grouped[c.deckLevel] = []
      grouped[c.deckLevel].push(c)
    })
    return grouped
  })

  function addCargo(partialCargo?: Partial<Cargo>) {
    const index = cargos.value.length
    const deck = ship.value.decks[currentDeckLevel.value] || ship.value.decks[0]
    const newCargo: Cargo = {
      id: generateId(),
      name: `货物 ${index + 1}`,
      weight: partialCargo?.weight ?? 50,
      position: partialCargo?.position ?? {
        x: 10 + (index % 5) * 15,
        y: 5 + Math.floor(index / 5) * 10,
        z: deck.zStart
      },
      dimensions: partialCargo?.dimensions ?? {
        width: 10,
        height: 8,
        depth: Math.min(3, deck.zEnd - deck.zStart - 0.5)
      },
      color: getCargoColor(index),
      rotate: partialCargo?.rotate ?? 0,
      stackOrder: partialCargo?.stackOrder ?? index,
      deckLevel: partialCargo?.deckLevel ?? currentDeckLevel.value,
      fragile: partialCargo?.fragile ?? false,
      priority: partialCargo?.priority ?? 1
    }
    cargos.value.push(newCargo)
    selectCargo(newCargo.id)
    return newCargo
  }

  function addPendingCargo(partial?: Partial<PendingCargo>) {
    const index = pendingCargos.value.length
    const pc: PendingCargo = {
      id: generateId(),
      name: `待装货物 ${index + 1}`,
      weight: partial?.weight ?? 50,
      dimensions: partial?.dimensions ?? { width: 10, height: 8, depth: 3 },
      color: getCargoColor(index + cargos.value.length),
      fragile: partial?.fragile ?? false,
      priority: partial?.priority ?? 1
    }
    pendingCargos.value.push(pc)
    return pc
  }

  function removePendingCargo(id: string) {
    pendingCargos.value = pendingCargos.value.filter((c) => c.id !== id)
    if (selectedPendingCargoId.value === id) {
      selectedPendingCargoId.value = null
    }
  }

  function updatePendingCargo(id: string, updates: Partial<PendingCargo>) {
    const idx = pendingCargos.value.findIndex((c) => c.id === id)
    if (idx !== -1) {
      pendingCargos.value[idx] = { ...pendingCargos.value[idx], ...updates }
    }
  }

  function selectPendingCargo(id: string | null) {
    selectedPendingCargoId.value = id
  }

  function clearPendingCargos() {
    pendingCargos.value = []
    selectedPendingCargoId.value = null
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
    recommendedCargos.value = null
    showComparison.value = false
  }

  function setCurrentDeckLevel(level: number) {
    currentDeckLevel.value = level
    selectCargo(null)
  }

  function generateRecommendedPlan() {
    if (pendingCargos.value.length === 0 && cargos.value.length === 0) {
      return null
    }
    recommendedCargos.value = generateAutoStowage(
      pendingCargos.value,
      ship.value,
      autoStowageOptions.value,
      cargos.value
    )
    showComparison.value = true
    return recommendedCargos.value
  }

  function applyRecommendedPlan() {
    if (recommendedCargos.value) {
      cargos.value = JSON.parse(JSON.stringify(recommendedCargos.value))
      pendingCargos.value = []
      showComparison.value = false
    }
  }

  function clearRecommendedPlan() {
    recommendedCargos.value = null
    showComparison.value = false
  }

  function toggleComparison() {
    showComparison.value = !showComparison.value
  }

  function moveCargoToDeck(cargoId: string, targetDeckLevel: number) {
    const deck = ship.value.decks.find((d) => d.level === targetDeckLevel)
    if (!deck) return
    const idx = cargos.value.findIndex((c) => c.id === cargoId)
    if (idx !== -1) {
      const cargo = cargos.value[idx]
      const newZ = Math.min(
        deck.zStart,
        Math.max(deck.zStart, deck.zEnd - cargo.dimensions.depth)
      )
      cargos.value[idx] = {
        ...cargo,
        deckLevel: targetDeckLevel,
        position: { ...cargo.position, z: newZ }
      }
    }
  }

  function movePendingToCargo(pendingId: string) {
    const pending = pendingCargos.value.find((c) => c.id === pendingId)
    if (!pending) return
    addCargo({
      name: pending.name,
      weight: pending.weight,
      dimensions: pending.dimensions,
      color: pending.color,
      fragile: pending.fragile,
      priority: pending.priority
    })
    removePendingCargo(pendingId)
  }

  function savePlan(name: string): boolean {
    if (!validation.value.canSave) {
      return false
    }
    savedPlans.value.push({
      name,
      cargos: JSON.parse(JSON.stringify(cargos.value)),
      savedAt: new Date(),
      score: balance.value.stabilityScore
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
    pendingCargos,
    selectedCargoId,
    selectedCargo,
    selectedPendingCargoId,
    selectedPendingCargo,
    balance,
    recommendedBalance,
    validation,
    savedPlans,
    currentDeckLevel,
    recommendedCargos,
    showComparison,
    autoStowageOptions,
    planComparison,
    cargosByDeck,
    addCargo,
    updateCargo,
    removeCargo,
    selectCargo,
    clearAllCargos,
    savePlan,
    loadPlan,
    updateShipConfig,
    addPendingCargo,
    removePendingCargo,
    updatePendingCargo,
    selectPendingCargo,
    clearPendingCargos,
    setCurrentDeckLevel,
    generateRecommendedPlan,
    applyRecommendedPlan,
    clearRecommendedPlan,
    toggleComparison,
    moveCargoToDeck,
    movePendingToCargo
  }
})
