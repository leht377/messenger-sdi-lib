import { TypingEvent, TypingUser } from '../types/conversation.types'
import { Message, MessageAttachment, MessageType } from '../types/message.types'
import { UserChat } from '../types/user-chat.types'

type UnknownRecord = Record<string, unknown>

function isEnvelope(data: unknown): data is UnknownRecord {
  return (
    data != null && typeof data === 'object' && 'attributes' in (data as Record<string, unknown>)
  )
}

function toString(value: unknown): string {
  return value == null ? '' : String(value)
}

export function toUserEnvelope(data: unknown): UserChat | undefined {
  if (data == null || typeof data !== 'object') return undefined
  if (isEnvelope(data)) return data as unknown as UserChat
  const record = data as UnknownRecord
  return {
    id: toString(record.id),
    type: 'user',
    attributes: {
      user_auth_id: Number(record.user_auth_id),
      name: toString(record.name),
      avatar_url: toString(record.avatar_url),
      created_at: toString(record.created_at),
      updated_at: toString(record.updated_at)
    },
    relationships: []
  }
}

export function toAttachmentEnvelope(data: unknown): MessageAttachment | undefined {
  if (data == null || typeof data !== 'object') return undefined
  if (isEnvelope(data)) return data as unknown as MessageAttachment
  const record = data as UnknownRecord
  return {
    id: toString(record.id),
    type: 'messageAttachment',
    attributes: {
      file_url: toString(record.file_url),
      file_name: toString(record.file_name),
      file_mime_type: toString(record.file_mime_type),
      file_size: Number(record.file_size),
      created_at: toString(record.created_at)
    },
    relationships: []
  }
}

function toMessageType(data: unknown): MessageType | null {
  if (typeof data === 'string') {
    return { id: 0, name: data, icon: '' }
  }
  if (data != null && typeof data === 'object') {
    return data as unknown as MessageType
  }
  return null
}

export function toMessageEnvelope(data: unknown): Message {
  if (data == null || typeof data !== 'object') {
    return {
      id: '',
      type: 'message',
      attributes: {},
      relationships: { sender: undefined, attachments: [] }
    }
  }
  if (isEnvelope(data)) return data as unknown as Message
  const record = data as UnknownRecord

  const attachments = Array.isArray(record.attachments)
    ? record.attachments.map(toAttachmentEnvelope).filter((a): a is MessageAttachment => a != null)
    : []

  return {
    id: toString(record.id),
    type: 'message',
    attributes: {
      conversation_id: Number(record.conversation_id),
      sender_id: Number(record.sender_id),
      body: toString(record.body),
      type: toMessageType(record.type),
      metadata: (record.metadata as any) ?? undefined,
      created_at: toString(record.created_at),
      updated_at: toString(record.updated_at)
    },
    relationships: {
      sender: toUserEnvelope(record.sender),
      attachments
    }
  }
}

export function toTypingUser(event: TypingEvent): TypingUser {
  return {
    user_id: Number(event.user_id),
    name: event.user.name,
    avatar_url: event.user.avatar_url
  }
}
