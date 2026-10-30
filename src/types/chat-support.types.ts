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
  user_auth_id: number | string
  name: string
  email: string
}

export interface RequestChatSupportResponse {
  message?: string
  ticket: ChatSupportTicket
  technician: ChatSupportTechnician | null
  conversation_id: string | null
}

export interface EscalateChatSupportPayload {
  reason: string
}

export interface EscalateChatSupportResponse {
  status?: string
  session_uuid?: string | null
  mode?: string | null
  message?: string | null
  ticket?: ChatSupportTicket | null
  technician?: ChatSupportTechnician | null
  conversation_id?: string | number | null
}

