import { Conversation } from '../types/conversation.types'
import { UserChat } from '../types/user-chat.types'

export const mockGetUserLogged = (): UserChat => {
  return {
    id: '8',
    type: 'user',
    attributes: {
      user_auth_id: 5,
      name: 'Luis eduardo Hernandez tenorio',
      avatar_url: null,
      created_at: '2026-09-15T09:29:30-05:00',
      updated_at: '2026-09-15T09:29:30-05:00'
    },
    relationships: []
  }
}

export const capitalizeWords = (str?: string | null): string => {
  if (!str) return ''
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export const isGroupConversation = (conversation: Conversation) =>
  Boolean(conversation.attributes.is_group)

export const getConversationUser = (
  conversation: Conversation,
  currentUserId?: string | number
): UserChat | undefined => {
  const users = conversation.relationships?.users || []
  if (!currentUserId) {
    return users[0]
  }
  const loggedIdStr = String(currentUserId)
  return users.find((user) => String(user.id) !== loggedIdStr) || users[0]
}

export const getConversationName = (
  conversation: Conversation,
  currentUserId?: string | number
): string => {
  if (isGroupConversation(conversation)) {
    return conversation.attributes.name || 'Grupo'
  }

  const otherUser = getConversationUser(conversation, currentUserId)
  const rawName = otherUser?.attributes?.name || conversation.attributes.name || 'Usuario'
  return capitalizeWords(rawName)
}

export const isUserBot = (user?: UserChat | null): boolean => {
  if (!user?.attributes) return false
  return Number(user.attributes.user_auth_id) === 0
}

export const isConversationBot = (
  conversation: Conversation,
  currentUserId?: string | number
): boolean => {
  if (conversation.attributes?.is_group) return false
  const otherUser = getConversationUser(conversation, currentUserId)
  return isUserBot(otherUser)
}

