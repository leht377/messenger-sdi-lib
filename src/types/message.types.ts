import { ApiMessengerParams } from './api.types'
import { UserChat } from './user-chat.types'
export interface MessageAttachment {
  id: string
  type: 'messageAttachment'
  attributes: {
    file_url: string
    file_name: string
    file_mime_type: string
    file_size: number
    created_at: string
  }
  relationships: []
}

export interface MessageActionButton {
  id: string
  label: string
  action: string
}

export interface BotWikiArticle {
  id: number | string
  title: string
  excerpt?: string | null
  slug?: string | null
  url?: string | null
}

export interface MessageMetadata {
  session_uuid?: string | null
  state?: string
  intent?: string | null
  confidence?: number | null
  solution_id?: number | string | null
  article?: BotWikiArticle | null
  tickets?: Array<Record<string, unknown>> | null
  ttft_ms?: number | null
  total_ms?: number | null
  action_buttons?: MessageActionButton[]
  [key: string]: unknown
}

export interface MessageType {
  id: number
  name: string
  icon: string
}
export interface Message {
  id: string
  type: 'message'
  attributes: Partial<{
    conversation_id: number
    created_at: string
    sender_id: number
    body: string
    type: MessageType | null
    metadata?: MessageMetadata
    updated_at: string
  }>
  relationships: {
    sender?: UserChat
    attachments: MessageAttachment[]
  }
  local_status?: 'sending' | 'sent' | 'error'
  isStreaming?: boolean
}

export interface MessageParams extends ApiMessengerParams {
  conversation: string
  cursor?: string
}

export interface ConversationMessage {
  date: string
  messages: Message[]
}

export interface CreateMessagePayload {
  body: string
  sender_id: string | number
}

export interface UploadMessageFilePayload {
  file: File
  sender_id: number
  caption?: string
}
