'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getUserByUserAuthIdChatService } from '../services/user.services'
import { UserChat } from '../types/user-chat.types'
import { getPermissionsMessenger, meService } from '../services/auth-services'
import { configureChatHttp } from '../lib/http-request'

export interface ChatConfig {
  apiBaseUrl: string
  authToken: string
  applicationId: string | number
  /**
   * Define si "Solicitar Asistencia" inicia conversación con el Bot (true)
   * o abre el formulario directo a técnico (false). Por defecto: true.
   */
  supportWithBot?: boolean
  reverb: {
    key: string
    host: string
    port: number
    wsPath: string
    scheme: 'http' | 'https'
  }
}

export interface ChatContextValue {
  currentUser: UserChat | null
  currentUserId: string
  permissions: string[]
  isLoadingUser: boolean
  hasError: boolean
  error: Error | null
  config: ChatConfig
  setCurrentUser: (user: UserChat) => void
}

export interface ChatProviderProps {
  config: ChatConfig
  children: React.ReactNode
}

const ChatContext = createContext<ChatContextValue | null>(null)

/**
 * Valida la configuración estructural del chat.
 * NO valida `authToken`: un token vacío es un estado transitorio legítimo
 * (login en curso, refresh, lectura asíncrona de cookie), no un error de configuración.
 */
function getConfigError(config: ChatConfig): Error | null {
  const missingValues: string[] = []

  if (!config.apiBaseUrl?.trim()) missingValues.push('apiBaseUrl')
  if (config.applicationId === undefined || config.applicationId === null) {
    missingValues.push('applicationId')
  }

  if (!config.reverb) {
    missingValues.push('reverb')
  } else {
    if (!config.reverb.key?.trim()) missingValues.push('reverb.key')
    if (!config.reverb.host?.trim()) missingValues.push('reverb.host')
    if (!Number.isFinite(config.reverb.port) || config.reverb.port <= 0) {
      missingValues.push('reverb.port')
    }
    if (!config.reverb.wsPath?.trim()) missingValues.push('reverb.wsPath')
    if (config.reverb.scheme !== 'http' && config.reverb.scheme !== 'https') {
      missingValues.push('reverb.scheme')
    }
  }

  return missingValues.length > 0
    ? new Error(`Configuración incompleta del chat: ${missingValues.join(', ')}`)
    : null
}

export function ChatProvider({ config, children }: ChatProviderProps) {
  const { authToken, apiBaseUrl, applicationId, reverb } = config

  // Se memoiza con valores primitivos para que no se recalcule si el anfitrión
  // recrea el objeto `config` en cada render.
  const configError = useMemo(
    () => getConfigError(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      apiBaseUrl,
      applicationId,
      reverb?.key,
      reverb?.host,
      reverb?.port,
      reverb?.wsPath,
      reverb?.scheme
    ]
  )

  const [currentUser, setCurrentUserState] = useState<UserChat | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [loadedContextKey, setLoadedContextKey] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [errorContextKey, setErrorContextKey] = useState<string | null>(null)
  const contextKey = JSON.stringify([apiBaseUrl, applicationId, authToken])

  // Error de configuración: se reporta una vez en consola, sin romper la app anfitriona.
  useEffect(() => {
    if (configError) {
      console.error(`[Chat] ${configError.message}`)
    }
  }, [configError])

  useEffect(() => {
    let isMounted = true

    // Configuración inválida o token aún no disponible: no hay nada que cargar.
    if (configError || !authToken) {
      return () => {
        isMounted = false
      }
    }

    configureChatHttp({
      apiBaseUrl,
      authToken
    })

    const loadCurrentUser = async () => {
      try {
        const authUserResponse = await meService()
        const chatUserResponse = await getUserByUserAuthIdChatService(authUserResponse.data.data.id)

        const userData: UserChat = chatUserResponse.data.data

        if (!userData?.id) {
          throw new Error('La respuesta no contiene un usuario válido para el chat')
        }

        const permissionResponse = await getPermissionsMessenger({
          userId: userData.attributes.user_auth_id,
          applicationId
        })
        const permissionData = permissionResponse.data.data?.map((s) => s.attributes.name) ?? []

        if (isMounted) {
          setCurrentUserState(userData)
          setPermissions(permissionData)
          setLoadedContextKey(contextKey)
          setError(null)
          setErrorContextKey(null)
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error al cargar el usuario en ChatProvider:', err)
          setError(err instanceof Error ? err : new Error('Error al inicializar el chat'))
          setErrorContextKey(contextKey)
        }
      }
    }

    void loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [configError, authToken, apiBaseUrl, applicationId, contextKey])

  const setCurrentUser = (user: UserChat) => {
    setCurrentUserState(user)
  }

  const currentUserId = useMemo(() => {
    return currentUser?.id ? String(currentUser.id) : ''
  }, [currentUser])

  const isReady = Boolean(currentUser?.id) && loadedContextKey === contextKey
  const hasRuntimeError = errorContextKey === contextKey && error !== null
  const hasError = Boolean(configError) || hasRuntimeError
  const isLoadingUser = !configError && Boolean(authToken) && !isReady && !hasRuntimeError

  const value: ChatContextValue = {
    currentUser,
    currentUserId,
    permissions,
    isLoadingUser,
    hasError,
    error: configError ?? (hasRuntimeError ? error : null),
    config,
    setCurrentUser
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useOptionalChatContext(): ChatContextValue | null {
  return useContext(ChatContext)
}

export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext debe usarse dentro de un ChatProvider')
  }
  return context
}