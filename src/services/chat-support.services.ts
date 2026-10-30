import { chatApiUrl, httpRequest } from '../lib/http-request'
import {
  EscalateChatSupportPayload,
  EscalateChatSupportResponse,
  RequestChatSupportPayload,
  RequestChatSupportResponse
} from '../types/chat-support.types'

export const requestChatSupportService = (data: RequestChatSupportPayload) =>
  httpRequest<RequestChatSupportResponse>({
    url: `${chatApiUrl('helpdesk', 'v1')}/requests/chat-support`,
    method: 'POST',
    data
  })

// URL provisional de preview para escalar a soporte Helpdesk (posteriormente cambiará a `${chatApiUrl('helpdesk', 'v1')}/chat/escalate`)
const ESCALATE_PREVIEW_URL =
  'https://preview-sdi-services-helpdeskservice-nshtoc-ijvejp.ganebyd.com/api/internal/chat/escalate'

export const escalateChatSupportService = (data: EscalateChatSupportPayload) =>
  httpRequest<EscalateChatSupportResponse>({
    url: ESCALATE_PREVIEW_URL,
    method: 'POST',
    data
  })

