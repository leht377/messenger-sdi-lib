import { chatApiUrl, httpRequest } from '../lib/http-request'
import {
  EscalateChatSupportPayload,
  EscalateChatSupportResponse,
  RequestChatSupportPayload,
  RequestChatSupportResponse,
  ResolveChatSupportPayload,
  ResolveChatSupportResponse
} from '../types/chat-support.types'

export const requestChatSupportService = (data: RequestChatSupportPayload) =>
  httpRequest<RequestChatSupportResponse>({
    url: `${chatApiUrl('helpdesk', 'v1')}/requests/chat-support`,
    method: 'POST',
    data
  })

// URL provisional de preview para escalar a soporte Helpdesk (posteriormente cambiará a `${chatApiUrl('helpdesk', 'v1')}/chat-bot/escalate`)
const ESCALATE_PREVIEW_URL =
  'https://preview-sdi-services-helpdeskservice-nshtoc-ijvejp.ganebyd.com/api/v1/chat-bot/escalate'

export const escalateChatSupportService = (data: EscalateChatSupportPayload) =>
  httpRequest<EscalateChatSupportResponse>({
    url: ESCALATE_PREVIEW_URL,
    method: 'POST',
    data
  })

// URL provisional de preview para resolver ticket desde el bot de Helpdesk (posteriormente cambiará a `${chatApiUrl('helpdesk', 'v1')}/chat-bot/resolve`)
const RESOLVE_PREVIEW_URL =
  'https://preview-sdi-services-helpdeskservice-nshtoc-ijvejp.ganebyd.com/api/v1/chat-bot/resolve'

export const resolveChatSupportService = (data: ResolveChatSupportPayload) =>
  httpRequest<ResolveChatSupportResponse>({
    url: RESOLVE_PREVIEW_URL,
    method: 'POST',
    data
  })

