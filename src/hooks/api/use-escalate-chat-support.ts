import { useCallback } from 'react'
import { AxiosError } from 'axios'
import { useMutate } from '../use-mutate'
import { ResponseError } from '../../types/api.types'
import { escalateChatSupportService } from '../../services/chat-support.services'
import {
  EscalateChatSupportPayload,
  EscalateChatSupportResponse
} from '../../types/chat-support.types'
import type { Conversation } from '../../types/conversation.types'
import type { UserChat } from '../../types/user-chat.types'

export function buildEscalatedConversation(
  data: EscalateChatSupportResponse
): Conversation | null {
  if (!data?.conversation_id) return null

  const convId = String(data.conversation_id)
  const users: UserChat[] = data.technician
    ? [
        {
          id: String(data.technician.id),
          type: 'user',
          attributes: {
            user_auth_id: Number(data.technician.user_auth_id ?? data.technician.id ?? 1),
            name: data.technician.name,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          relationships: []
        }
      ]
    : []

  return {
    id: convId,
    type: 'conversation',
    attributes: {
      is_group: false,
      name: data.technician?.name || data.ticket?.subject || 'Soporte SDI',
      closed_at: null,
      unread_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    relationships: {
      users
    }
  }
}

export const useEscalateChatSupport = () => {
  const escalateSupport = useCallback(async (payload: EscalateChatSupportPayload) => {
    const response = await escalateChatSupportService(payload)
    const data = ((response.data as any)?.data ?? response.data) as EscalateChatSupportResponse
    if (typeof window !== 'undefined' && data?.conversation_id) {
      const conversation = buildEscalatedConversation(data)
      window.dispatchEvent(
        new CustomEvent('messenger:conversation-created', {
          detail: {
            conversationId: String(data.conversation_id),
            conversation,
            focus: true
          }
        })
      )
    }
    return data
  }, [])

  return useMutate<EscalateChatSupportResponse, AxiosError<ResponseError>, EscalateChatSupportPayload>(
    escalateSupport
  )
}

export default useEscalateChatSupport
