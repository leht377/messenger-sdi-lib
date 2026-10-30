import './styles/index.css'

// 1. Context & Provider
export {
  ChatProvider,
  useChatContext,
  useOptionalChatContext,
  type ChatConfig,
  type ChatContextValue,
  type ChatProviderProps
} from './context/chat-context'

export {
  ActiveConversationProvider,
  useActiveConversation,
  useRequiredActiveConversation,
  activeConversationStore,
  type ActiveConversationContextValue,
  type ActiveConversationProviderProps
} from './context/active-conversation-context'

// 2. Componentes Principales
export {
  FloatingChat,
  type FloatingChatProps,
  type FloatingChatView,
  type FloatingChatCorner
} from './components/floating-chat'

export {
  ConversationChatPanel,
  type ConversationChatPanelProps
} from './components/conversation-chat-panel'

export {
  ConversationChatHeader,
  type ConversationChatHeaderProps,
  type ConversationChatHeaderRenderOptions,
  type ConversationRenderOptions
} from './components/conversation-chat-header'

export { ConversationEmptyState } from './components/conversation-empty-state'
export { ConversationContextPanel } from './components/conversation-context-panel'

export {
  ConversationsSidebarList,
  type ConversationsSidebarListProps
} from './components/conversations-sidebar-list'

export {
  NewConversationDialog,
  type NewConversationDialogProps
} from './components/new-conversation-dialog'

export {
  EscalateSupportDialog,
  type EscalateSupportDialogProps
} from './components/escalate-support-dialog'

export { RequestSupportForm, type RequestSupportFormProps } from './components/request-support-form'

// 3. Hooks Principales (para vistas embebidas personalizadas)
export {
  default as useConversationsPage,
  type UseConversationsPageOptions
} from './hooks/use-conversations-page'
export { default as useConversationChat } from './hooks/use-conversation-chat'
export { default as useEscalateChatSupport } from './hooks/api/use-escalate-chat-support'
export {
  default as useShowConversation,
  type UseShowConversationOptions
} from './hooks/use-show-conversation'
export { default as useCloseConversation } from './hooks/api/conversations/use-close-conversation'
export {
  useCheckHasPermissionMessenger,
  hasMessengerPermission,
  type CheckMessengerPermissionParams,
  type PermissionOperator
} from './hooks/use-check-has-permission-messenger'
export type { PermissionsMessenger } from './types/permission.types'

// 4. Tipos de Dominio Esenciales
export type {
  Conversation,
  ConversationType,
  CreateConversationPayload,
  TypingEvent,
  UnreadEvent
} from './types/conversation.types'

export type {
  Message,
  MessageAttachment,
  MessageType,
  MessageActionButton,
  MessageMetadata,
  CreateMessagePayload,
  UploadMessageFilePayload
} from './types/message.types'

export type { UserChat } from './types/user-chat.types'

export type {
  RequestChatSupportPayload,
  RequestChatSupportResponse,
  EscalateChatSupportPayload,
  EscalateChatSupportResponse
} from './types/chat-support.types'

// 5. Constantes & Utilidades
export { LIB_VERSION } from './utils/version'
export { closeConversationService } from './services/conversation.services'
export {
  playNotificationSound,
  type NotificationSoundType,
  type PlaySoundOptions
} from './utils/audio.util'
