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

export {
  voiceCallStore,
  useActiveVoiceCall,
  type ActiveVoiceCallSession
} from './context/voice-call-context'

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

export {
  ResolveSupportDialog,
  type ResolveSupportDialogProps
} from './components/resolve-support-dialog'

export {
  MessageRichText,
  sanitizeUrl,
  type MessageRichTextProps
} from './components/message-rich-text'

export {
  VoiceCallDialog,
  type VoiceCallDialogProps
} from './components/voice/voice-call-dialog'

export {
  VoiceCallHeader,
  type VoiceCallHeaderProps
} from './components/voice/voice-call-header'

export {
  VoiceAudioVisualizerCard,
  type VoiceAudioVisualizerCardProps
} from './components/voice/voice-audio-visualizer-card'

export {
  VoiceWaveformCanvas,
  type VoiceWaveformCanvasProps
} from './components/voice/voice-waveform-canvas'

export {
  VoiceTranscriptList,
  type VoiceTranscriptListProps
} from './components/voice/voice-transcript-list'

export {
  VoiceCallControls,
  type VoiceCallControlsProps
} from './components/voice/voice-call-controls'

export {
  VoiceCallConnecting,
  type VoiceCallConnectingProps
} from './components/voice/voice-call-connecting'

export {
  VoiceCallEndedSummary,
  type VoiceCallEndedSummaryProps
} from './components/voice/voice-call-ended-summary'

export {
  VoiceMinimizedIsland,
  type VoiceMinimizedIslandProps
} from './components/voice/voice-minimized-island'

export { RequestSupportForm, type RequestSupportFormProps } from './components/request-support-form'

// 3. Hooks Principales (para vistas embebidas personalizadas)
export {
  default as useConversationsPage,
  type UseConversationsPageOptions
} from './hooks/use-conversations-page'
export { default as useConversationChat } from './hooks/use-conversation-chat'
export { default as useEscalateChatSupport } from './hooks/api/use-escalate-chat-support'
export { default as useResolveChatSupport } from './hooks/api/use-resolve-chat-support'
export {
  default as useChatBotQueuePolling,
  type UseChatBotQueuePollingOptions
} from './hooks/api/use-chat-bot-queue-polling'
export { default as useChatBotQueueToTicket } from './hooks/api/use-chat-bot-queue-to-ticket'
export {
  default as useShowConversation,
  type UseShowConversationOptions
} from './hooks/use-show-conversation'
export { default as useCloseConversation } from './hooks/api/conversations/use-close-conversation'
export {
  useVoiceCall,
  type UseVoiceCallOptions
} from './hooks/use-voice-call'
export {
  useVoiceMicrophone,
  type UseVoiceMicrophoneOptions,
  type UseVoiceMicrophoneReturn
} from './hooks/use-voice-microphone'
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
  EscalateChatSupportResponse,
  ResolveChatSupportPayload,
  ResolveChatSupportResponse,
  ChatBotQueueStatusResponse,
  ChatBotQueueToTicketPayload,
  ChatBotQueueToTicketResponse
} from './types/chat-support.types'

export type {
  VoiceCallState,
  VoiceCallContextBadges,
  VoiceCallerTicket,
  VoiceCallerContext,
  VoiceMatchedArticle,
  VoiceToolState,
  VoiceTranscriptItem,
  VoiceCallEndResult,
  VoiceFinalizedPayload,
  VoiceClientPingCommand,
  VoiceClientMuteCommand,
  VoiceClientHangupCommand,
  VoiceClientImageCommand,
  VoiceClientTextPromptCommand,
  VoiceClientCommand,
  VoiceSessionReadyEvent,
  VoiceAssistantSpeakingEvent,
  VoiceAssistantTurnCompleteEvent,
  VoiceAssistantTranscriptEvent,
  VoiceServerEvent,
  VoiceConnectionParams,
  VoiceCallCallbacks
} from './types/voice.types'

// 5. Constantes & Utilidades
export { LIB_VERSION } from './utils/version'
export { closeConversationService } from './services/conversation.services'
export {
  requestChatSupportService,
  escalateChatSupportService,
  resolveChatSupportService,
  chatBotQueueStatusService,
  chatBotQueueToTicketService
} from './services/chat-support.services'
export {
  buildVoiceWebSocketUrl,
  VoiceCallClient,
  type VoiceCallClientOptions,
  VoiceAudioEngine,
  type VoiceAudioEngineOptions
} from './services/voice.service'
export {
  saveConversationSessionId,
  getConversationSessionId,
  removeConversationSessionId
} from './utils/session-storage.util'
export {
  playNotificationSound,
  type NotificationSoundType,
  type PlaySoundOptions
} from './utils/audio.util'
