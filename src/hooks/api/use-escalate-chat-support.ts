import { useCallback } from 'react'
import { AxiosError } from 'axios'
import { useMutate } from '../use-mutate'
import { ResponseError } from '../../types/api.types'
import { escalateChatSupportService } from '../../services/chat-support.services'
import {
  EscalateChatSupportPayload,
  EscalateChatSupportResponse
} from '../../types/chat-support.types'

export const useEscalateChatSupport = () => {
  const escalateSupport = useCallback(async (payload: EscalateChatSupportPayload) => {
    const response = await escalateChatSupportService(payload)
    const data = (response.data as any)?.data ?? response.data
    if (typeof window !== 'undefined' && data?.conversation_id) {
      window.dispatchEvent(
        new CustomEvent('messenger:conversation-created', {
          detail: { conversationId: data.conversation_id }
        })
      )
    }
    return data as EscalateChatSupportResponse
  }, [])

  return useMutate<EscalateChatSupportResponse, AxiosError<ResponseError>, EscalateChatSupportPayload>(
    escalateSupport
  )
}

export default useEscalateChatSupport
