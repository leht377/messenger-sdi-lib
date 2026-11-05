import type { MessageActionButton } from './message.types'

export interface RequestChatSupportPayload {
  subject: string
  message: string
  user_id: number | string
  direct_technician?: boolean
}

export interface ChatSupportTicket {
  id: number | string
  number: number | string
  subject?: string
  status?: string
  request_source?: string
  chat_session_id?: string | null
}

export interface ChatSupportTechnician {
  id: number | string
  user_auth_id?: number | string
  name: string
  email?: string
}

export interface RequestChatSupportResponse {
  message?: string
  ticket: ChatSupportTicket
  technician: ChatSupportTechnician | null
  conversation_id: string | null
}

export interface EscalateChatSupportPayload {
  session_id: string
  reason: string
}

export interface EscalateChatSupportResponse {
  status?: string
  session_uuid?: string | null
  mode?: string | null
  queue_position?: number | null
  estimated_wait_minutes?: number | null
  message?: string | null
  action_buttons?: MessageActionButton[] | null
  ticket?: ChatSupportTicket | null
  technician?: ChatSupportTechnician | null
  conversation_id?: string | number | null
}

export interface ResolveChatSupportPayload {
  session_id: string
  helpful: boolean
  comment: string
  rating: number
}

export interface ResolveChatSupportResponse {
  status?: string
  session_uuid?: string | null
  message?: string | null
  ticket?: ChatSupportTicket | null
  [key: string]: unknown
}

export interface ChatBotQueueStatusResponse {
  status?: string // 'in_queue' | 'escalated_live' | 'resolved' | string
  session_uuid?: string | null
  mode?: string | null // 'waiting_queue' | 'live_chat' | string
  queue_position?: number | null
  estimated_wait_minutes?: number | null
  message?: string | null
  action_buttons?: MessageActionButton[] | null
  ticket?: ChatSupportTicket | null
  technician?: ChatSupportTechnician | null
  conversation_id?: string | number | null
  [key: string]: unknown
}

export interface ChatBotQueueToTicketPayload {
  session_id: string
}

export interface ChatBotQueueToTicketResponse {
  status?: string
  session_uuid?: string | null
  message?: string | null
  ticket?: ChatSupportTicket | null
  [key: string]: unknown
}

