import { useCallback, useEffect, useRef, useState } from 'react'
import { AxiosError } from 'axios'
import { ResponseError } from '../../types/api.types'
import { chatBotQueueStatusService } from '../../services/chat-support.services'
import { ChatBotQueueStatusResponse } from '../../types/chat-support.types'
import { buildEscalatedConversation } from './use-escalate-chat-support'

export interface UseChatBotQueuePollingOptions {
  sessionId?: string | null
  enabled?: boolean
  intervalMs?: number
  onStatusUpdate?: (data: ChatBotQueueStatusResponse) => void
  onAssigned?: (data: ChatBotQueueStatusResponse) => void
  onError?: (error: AxiosError<ResponseError>) => void
}

export const useChatBotQueuePolling = ({
  sessionId,
  enabled = false,
  intervalMs = 5000,
  onStatusUpdate,
  onAssigned,
  onError
}: UseChatBotQueuePollingOptions = {}) => {
  const [data, setData] = useState<ChatBotQueueStatusResponse | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<AxiosError<ResponseError> | null>(null)

  const isAssignedRef = useRef(false)
  const onStatusUpdateRef = useRef(onStatusUpdate)
  const onAssignedRef = useRef(onAssigned)
  const onErrorRef = useRef(onError)
  onStatusUpdateRef.current = onStatusUpdate
  onAssignedRef.current = onAssigned
  onErrorRef.current = onError

  const checkStatus = useCallback(async (): Promise<ChatBotQueueStatusResponse | null> => {
    if (!sessionId || isAssignedRef.current) return null

    try {
      setIsPolling(true)
      const response = await chatBotQueueStatusService(sessionId)
      const resData = ((response.data as any)?.data ?? response.data) as ChatBotQueueStatusResponse
      setData(resData)
      setError(null)
      onStatusUpdateRef.current?.(resData)

      const isLiveAssigned =
        resData?.status === 'escalated_live' ||
        resData?.mode === 'live_chat' ||
        Boolean(resData?.conversation_id)

      if (isLiveAssigned && !isAssignedRef.current) {
        isAssignedRef.current = true
        if (typeof window !== 'undefined' && resData?.conversation_id) {
          const conversation = buildEscalatedConversation(resData)
          window.dispatchEvent(
            new CustomEvent('messenger:conversation-created', {
              detail: {
                conversationId: String(resData.conversation_id),
                conversation,
                focus: true
              }
            })
          )
        }
        onAssignedRef.current?.(resData)
      }

      return resData
    } catch (err) {
      const axiosErr = err as AxiosError<ResponseError>
      setError(axiosErr)
      onErrorRef.current?.(axiosErr)
      return null
    } finally {
      setIsPolling(false)
    }
  }, [sessionId])

  useEffect(() => {
    isAssignedRef.current = false
  }, [sessionId])

  useEffect(() => {
    if (!enabled || !sessionId) {
      return
    }

    // Ejecutar chequeo inmediato
    void checkStatus()

    // Configurar sondeo periódico cada 5 segundos (o intervalMs)
    const timer = setInterval(() => {
      if (isAssignedRef.current) {
        clearInterval(timer)
        return
      }
      void checkStatus()
    }, intervalMs)

    return () => {
      clearInterval(timer)
    }
  }, [checkStatus, enabled, intervalMs, sessionId])

  return {
    data,
    isPolling,
    error,
    checkStatus,
    isAssigned: isAssignedRef.current
  }
}

export default useChatBotQueuePolling
