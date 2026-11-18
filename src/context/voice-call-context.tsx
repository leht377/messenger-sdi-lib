'use client'

import React, { useSyncExternalStore } from 'react'
import type { VoiceCallEndResult } from '../types/voice.types'

export interface ActiveVoiceCallSession {
  conversationId: string | number
  userId: string | number
  userAuthId?: string | number
  senderMessengerId?: string | number
  sessionId?: string
  wsUrl?: string
  onCallEnded?: (result: VoiceCallEndResult) => void
}

let currentActiveCall: ActiveVoiceCallSession | null = null
const voiceCallListeners = new Set<(call: ActiveVoiceCallSession | null) => void>()

export const voiceCallStore = {
  get: () => currentActiveCall,
  start: (session: ActiveVoiceCallSession) => {
    currentActiveCall = session
    voiceCallListeners.forEach((listener) => listener(currentActiveCall))
  },
  stop: () => {
    currentActiveCall = null
    voiceCallListeners.forEach((listener) => listener(null))
  },
  subscribe: (listener: (call: ActiveVoiceCallSession | null) => void) => {
    voiceCallListeners.add(listener)
    return () => {
      voiceCallListeners.delete(listener)
    }
  }
}

export function useActiveVoiceCall() {
  return useSyncExternalStore(
    voiceCallStore.subscribe,
    voiceCallStore.get,
    () => null
  )
}
