import type { StepBalanceSnapshot, ShipBalanceHistory } from '@/types'

export interface PlaybackState {
  currentStepIndex: number
  totalSteps: number
  isPlaying: boolean
  speed: number
}

export function createPlaybackState(history: ShipBalanceHistory | null): PlaybackState {
  return {
    currentStepIndex: -1,
    totalSteps: history?.stepSnapshots.length ?? 0,
    isPlaying: false,
    speed: 1
  }
}

export function getStepSnapshot(
  history: ShipBalanceHistory | null,
  stepIndex: number
): StepBalanceSnapshot | null {
  if (!history || stepIndex < 0 || stepIndex >= history.stepSnapshots.length) {
    return null
  }
  return history.stepSnapshots[stepIndex] ?? null
}

export function getCurrentBalance(
  history: ShipBalanceHistory | null,
  stepIndex: number
) {
  if (!history) return null
  if (stepIndex < 0) return history.initialBalance
  if (stepIndex >= history.stepSnapshots.length) return history.finalBalance
  return history.stepSnapshots[stepIndex].balance
}

export function nextStep(state: PlaybackState): PlaybackState {
  if (state.currentStepIndex < state.totalSteps - 1) {
    return { ...state, currentStepIndex: state.currentStepIndex + 1 }
  }
  return { ...state, isPlaying: false }
}

export function prevStep(state: PlaybackState): PlaybackState {
  if (state.currentStepIndex > -1) {
    return { ...state, currentStepIndex: state.currentStepIndex - 1 }
  }
  return state
}

export function resetPlayback(state: PlaybackState): PlaybackState {
  return { ...state, currentStepIndex: -1, isPlaying: false }
}

export function goToStep(state: PlaybackState, stepIndex: number): PlaybackState {
  const clampedIndex = Math.max(-1, Math.min(state.totalSteps - 1, stepIndex))
  return { ...state, currentStepIndex: clampedIndex }
}

export function startPlayback(state: PlaybackState): PlaybackState {
  if (state.totalSteps === 0) return state
  return {
    ...state,
    isPlaying: true,
    currentStepIndex:
      state.currentStepIndex >= state.totalSteps - 1 ? -1 : state.currentStepIndex
  }
}

export function pausePlayback(state: PlaybackState): PlaybackState {
  return { ...state, isPlaying: false }
}

export function togglePlayback(state: PlaybackState): PlaybackState {
  return state.isPlaying ? pausePlayback(state) : startPlayback(state)
}

export function setPlaybackSpeed(state: PlaybackState, speed: number): PlaybackState {
  return { ...state, speed: Math.max(0.25, Math.min(4, speed)) }
}
