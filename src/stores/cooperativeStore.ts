import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  CooperativePlan,
  CooperativeComparison,
  CooperativeConfig,
  OptimizationStrategy,
  StepBalanceSnapshot,
  ShipBalanceHistory
} from '@/types'
import {
  generateCooperativePlan,
  compareCooperativePlans,
  getDefaultCooperativeConfig
} from '@/utils/scheduling'
import { useSchedulingStore } from '@/stores/schedulingStore'
import { useShipStore } from '@/stores/shipStore'

export const useCooperativeStore = defineStore('cooperative', () => {
  const config = ref<CooperativeConfig>(getDefaultCooperativeConfig())
  const efficiencyPlan = ref<CooperativePlan | null>(null)
  const stabilityPlan = ref<CooperativePlan | null>(null)
  const comparison = ref<CooperativeComparison | null>(null)
  const currentStrategy = ref<OptimizationStrategy>('efficiency')
  const selectedShipId = ref<string | null>(null)
  const currentStepIndex = ref<number>(-1)
  const isGenerating = ref(false)
  const showComparison = ref(false)
  const playbackStatus = ref<'idle' | 'playing' | 'paused'>('idle')
  const playbackSpeed = ref(1)

  const currentPlan = computed(() => {
    return currentStrategy.value === 'efficiency' ? efficiencyPlan.value : stabilityPlan.value
  })

  const currentShipHistory = computed((): ShipBalanceHistory | null => {
    if (!currentPlan.value || !selectedShipId.value) return null
    return currentPlan.value.balanceHistories.find(h => h.shipId === selectedShipId.value) || null
  })

  const currentStepSnapshot = computed((): StepBalanceSnapshot | null => {
    if (!currentShipHistory.value || currentStepIndex.value < 0) return null
    return currentShipHistory.value.stepSnapshots[currentStepIndex.value] || null
  })

  const totalSteps = computed(() => {
    if (!currentShipHistory.value) return 0
    return currentShipHistory.value.stepSnapshots.length
  })

  const allShips = computed(() => {
    const schedulingStore = useSchedulingStore()
    return schedulingStore.shipTasks
  })

  function setStrategy(strategy: OptimizationStrategy) {
    currentStrategy.value = strategy
    currentStepIndex.value = -1
  }

  function selectShip(shipId: string | null) {
    selectedShipId.value = shipId
    currentStepIndex.value = -1
  }

  function setStepIndex(index: number) {
    if (!currentShipHistory.value) return
    currentStepIndex.value = Math.max(-1, Math.min(currentShipHistory.value.stepSnapshots.length - 1, index))
  }

  function nextStep() {
    if (!currentShipHistory.value) return
    if (currentStepIndex.value < currentShipHistory.value.stepSnapshots.length - 1) {
      currentStepIndex.value++
    }
  }

  function prevStep() {
    if (currentStepIndex.value > -1) {
      currentStepIndex.value--
    }
  }

  function resetStep() {
    currentStepIndex.value = -1
  }

  function generatePlans() {
    isGenerating.value = true
    try {
      const schedulingStore = useSchedulingStore()
      const shipStore = useShipStore()

      efficiencyPlan.value = generateCooperativePlan(
        schedulingStore.config,
        schedulingStore.shipTasks,
        'efficiency',
        shipStore.ship
      )

      stabilityPlan.value = generateCooperativePlan(
        schedulingStore.config,
        schedulingStore.shipTasks,
        'stability',
        shipStore.ship
      )

      if (efficiencyPlan.value && stabilityPlan.value) {
        comparison.value = compareCooperativePlans(efficiencyPlan.value, stabilityPlan.value)
      }

      if (allShips.value.length > 0) {
        selectedShipId.value = allShips.value[0].id
      }

      showComparison.value = true
    } finally {
      isGenerating.value = false
    }
  }

  function toggleComparison() {
    showComparison.value = !showComparison.value
  }

  function updateConfig(key: keyof CooperativeConfig, value: any) {
    ;(config.value as any)[key] = value
  }

  function resetPlayback() {
    playbackStatus.value = 'idle'
    currentStepIndex.value = -1
  }

  function startPlayback() {
    if (!currentShipHistory.value || currentShipHistory.value.stepSnapshots.length === 0) return
    playbackStatus.value = 'playing'
    if (currentStepIndex.value >= currentShipHistory.value.stepSnapshots.length - 1) {
      currentStepIndex.value = -1
    }
  }

  function pausePlayback() {
    playbackStatus.value = 'paused'
  }

  function togglePlayback() {
    if (playbackStatus.value === 'playing') {
      pausePlayback()
    } else {
      startPlayback()
    }
  }

  function setPlaybackSpeed(speed: number) {
    playbackSpeed.value = speed
  }

  function resetPlans() {
    efficiencyPlan.value = null
    stabilityPlan.value = null
    comparison.value = null
    currentStepIndex.value = -1
    selectedShipId.value = null
    showComparison.value = false
    playbackStatus.value = 'idle'
  }

  return {
    config,
    efficiencyPlan,
    stabilityPlan,
    comparison,
    currentStrategy,
    selectedShipId,
    currentStepIndex,
    isGenerating,
    showComparison,
    playbackStatus,
    playbackSpeed,
    currentPlan,
    currentShipHistory,
    currentStepSnapshot,
    totalSteps,
    allShips,
    setStrategy,
    selectShip,
    setStepIndex,
    nextStep,
    prevStep,
    resetStep,
    generatePlans,
    toggleComparison,
    updateConfig,
    resetPlayback,
    startPlayback,
    pausePlayback,
    togglePlayback,
    setPlaybackSpeed,
    resetPlans
  }
})
