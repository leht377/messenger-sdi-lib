import { useCallback } from 'react'
import { AxiosError } from 'axios'
import { useMutate } from '../use-mutate'
import { ResponseError } from '../../types/api.types'
import { chatBotQueueToTicketService } from '../../services/chat-support.services'
import {
  ChatBotQueueToTicketPayload,
  ChatBotQueueToTicketResponse
} from '../../types/chat-support.types'

export const useChatBotQueueToTicket = () => {
  const queueToTicket = useCallback(async (payload: ChatBotQueueToTicketPayload) => {
    const response = await chatBotQueueToTicketService(payload)
    const data = ((response.data as any)?.data ?? response.data) as ChatBotQueueToTicketResponse
    if (typeof window !== 'undefined') {
      const targetConvId = (data as any)?.conversation_id ? String((data as any).conversation_id) : undefined
      window.dispatchEvent(
        new CustomEvent('messenger:conversation-closed', {
          detail: {
            conversationId: targetConvId,
            closed_at: new Date().toISOString()
          }
        })
      )
      window.dispatchEvent(new CustomEvent('messenger:conversation-updated'))
    }
    return data
  }, [])

  return useMutate<
    ChatBotQueueToTicketResponse,
    AxiosError<ResponseError>,
    ChatBotQueueToTicketPayload
  >(queueToTicket)
}

export default useChatBotQueueToTicket

