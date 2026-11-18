'use client'

import React, { createContext, useContext, useSyncExternalStore } from 'react'
import type { Conversation } from '../types/conversation.types'
import { closeConversationService } from '../services/conversation.services'

export interface ActiveConversationContextValue {
  /** Conversación activa actual */
  conversation: Conversation
  /** Indica si la conversación está cerrada */
  isClosed: boolean
  /** Indica si el cierre de la conversación está en proceso */
  isClosing: boolean
  /** Función para cerrar la conversación activa */
  handleCloseConversation: () => Promise<void>
}

const ActiveConversationContext = createContext<ActiveConversationContextValue | null>(null)

// Store reactivo para suscriptores fuera de ConversationChatPanel (usando useSyncExternalStore)
type ActiveConversationListener = (conversation: Conversation | null) => void

let currentGlobalConversation: Conversation | null = null
const storeListeners = new Set<ActiveConversationListener>()

export const activeConversationStore = {
  get: () => currentGlobalConversation,
  set: (conversation: Conversation | null) => {
    if (currentGlobalConversation?.id === conversation?.id) return
    currentGlobalConversation = conversation
    storeListeners.forEach((listener) => listener(conversation))
  },
  subscribe: (listener: ActiveConversationListener) => {
    storeListeners.add(listener)
    return () => {
      storeListeners.delete(listener)
    }
  }
}

export interface ActiveConversationProviderProps {
  value: ActiveConversationContextValue
  children: React.ReactNode
}

export function ActiveConversationProvider({
  value,
  children
}: ActiveConversationProviderProps) {
  return (
    <ActiveConversationContext.Provider value={value}>
      {children}
    </ActiveConversationContext.Provider>
  )
}

/**
 * Hook para acceder a la conversación activa actual y a sus acciones (por ejemplo, cerrarla).
 * Funciona tanto dentro del chat (en botones de header / customHeaderButtons) como desde componentes externos.
 * Devuelve `null` si no hay ninguna conversación activa seleccionada en ese momento.
 */
export function useActiveConversation(): ActiveConversationContextValue | null {
  const localContext = useContext(ActiveConversationContext)
  const globalConversation = useSyncExternalStore(
    activeConversationStore.subscribe,
    activeConversationStore.get,
    () => null
  )

  if (localContext) {
    return localContext
  }

  if (globalConversation) {
    return {
      conversation: globalConversation,
      isClosed: Boolean(globalConversation.attributes?.closed_at),
      isClosing: false,
      handleCloseConversation: async () => {
        await closeConversationService(globalConversation.id)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('messenger:conversation-closed', {
              detail: {
                conversationId: String(globalConversation.id),
                closed_at: new Date().toISOString()
              }
            })
          )
        }
      }
    }
  }

  return null
}

/**
 * Hook que garantiza la presencia del contexto de conversación activa, lanzando un error si no se encuentra.
 */
export function useRequiredActiveConversation(): ActiveConversationContextValue {
  const context = useActiveConversation()
  if (!context) {
    throw new Error('useRequiredActiveConversation debe utilizarse cuando haya una conversación activa')
  }
  return context
}
