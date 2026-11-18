import { chatApiUrl, helpdeskApiUrl, httpRequest } from '../lib/http-request'
import {
  ChatBotQueueStatusResponse,
  ChatBotQueueToTicketPayload,
  ChatBotQueueToTicketResponse,
  EscalateChatSupportPayload,
  EscalateChatSupportResponse,
  RequestChatSupportPayload,
  RequestChatSupportResponse,
  ResolveChatSupportPayload,
  ResolveChatSupportResponse
} from '../types/chat-support.types'

export const requestChatSupportService = (data: RequestChatSupportPayload) =>
  httpRequest<RequestChatSupportResponse>({
    url: `${helpdeskApiUrl('helpdesk', 'v1')}/requests/chat-support`,
    method: 'POST',
    data
  })

// URL provisional de preview para escalar a soporte Helpdesk (posteriormente cambiará a `${chatApiUrl('helpdesk', 'v1')}/chat-bot/escalate`)
const ESCALATE_PREVIEW_URL =
  'https://preview-sdi-services-helpdeskservice-nshtoc-ijvejp.ganebyd.com/api/v1/chat-bot/escalate'

export const escalateChatSupportService = (data: EscalateChatSupportPayload) =>
  httpRequest<EscalateChatSupportResponse>({
    url:  `${helpdeskApiUrl('helpdesk', 'v1')}/chat-bot/escalate`,
    method: 'POST',
    data
  })

// URL provisional de preview para resolver ticket desde el bot de Helpdesk (posteriormente cambiará a `${chatApiUrl('helpdesk', 'v1')}/chat-bot/resolve`)
const RESOLVE_PREVIEW_URL =
  'https://preview-sdi-services-helpdeskservice-nshtoc-ijvejp.ganebyd.com/api/v1/chat-bot/resolve'

export const resolveChatSupportService = (data: ResolveChatSupportPayload) =>
  httpRequest<ResolveChatSupportResponse>({
    url:  `${helpdeskApiUrl('helpdesk', 'v1')}/chat-bot/resolve`,
    method: 'POST',
    data
  })

// URL provisional de preview para consultar estado en cola
const QUEUE_STATUS_PREVIEW_URL =
  'https://preview-sdi-services-helpdeskservice-nshtoc-ijvejp.ganebyd.com/api/v1/chat-bot/queue-status'

export const chatBotQueueStatusService = (sessionId: string) =>
  httpRequest<ChatBotQueueStatusResponse>({
    url:  `${helpdeskApiUrl('helpdesk', 'v1')}/chat-bot/queue-status`,
    method: 'GET',
    params: {
      session_id: sessionId
    }
  })

// URL provisional de preview para convertir cola en ticket asíncrono
const QUEUE_TO_TICKET_PREVIEW_URL =
  'https://preview-sdi-services-helpdeskservice-nshtoc-ijvejp.ganebyd.com/api/v1/chat-bot/queue-to-ticket'

export const chatBotQueueToTicketService = (data: ChatBotQueueToTicketPayload) =>
  httpRequest<ChatBotQueueToTicketResponse>({
    url:  `${helpdeskApiUrl('helpdesk', 'v1')}/chat-bot/queue-to-ticket`,
    method: 'POST',
    params: {
      session_id: data.session_id
    },
    data
  })

