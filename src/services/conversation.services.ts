import { chatApiUrl, httpRequest } from '../lib/http-request'
import {
  Conversation,
  ConversationTypingPayload,
  CreateConversationPayload,
  FilterConversation,
  MarkConversationAsReadPayload
} from '../types/conversation.types'
import { removeConversationSessionId } from '../utils/session-storage.util'

export const listConversationsService = (params: FilterConversation) =>
  httpRequest<Conversation[]>({
    url: `${chatApiUrl('messenger', 'v1')}/conversations`,
    method: 'GET',
    params: params
  })

export const createConversationService = (data: CreateConversationPayload) =>
  httpRequest<Conversation>({
    url: `${chatApiUrl('messenger', 'v1')}/conversations`,
    method: 'POST',
    data
  })

export const getConversationService = (conversationId: string) =>
  httpRequest<Conversation>({
    url: `${chatApiUrl('messenger', 'v1')}/conversations/${conversationId}`,
    method: 'GET'
  })

export const markConversationAsReadService = ({
  conversationId,
  read_until,
  user_id
}: MarkConversationAsReadPayload) =>
  httpRequest<Conversation>({
    url: `${chatApiUrl('messenger', 'v1')}/conversations/${conversationId}/read`,
    method: 'POST',
    data: { read_until, user_id }
  })

export const updateConversationTypingService = ({
  conversationId,
  user_id,
  is_typing
}: ConversationTypingPayload) =>
  httpRequest<Record<string, never>>({
    url: `${chatApiUrl('messenger', 'v1')}/conversations/${conversationId}/typing`,
    method: 'POST',
    data: { user_id, is_typing }
  })

    export const closeConversationService = async (conversationId: string) => {
      const response = await httpRequest<Conversation>({
        url: `${chatApiUrl('messenger', 'v1')}/conversations/${conversationId}/close`,
        method: 'POST'
      })
      removeConversationSessionId(conversationId)
      return response
    }

