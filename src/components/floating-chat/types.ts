import type React from 'react'
import type { Conversation } from '../../types/conversation.types'
import type { ConversationChatHeaderRenderOptions } from '../conversation-chat-header'

export type FloatingChatView = 'home' | 'support-form' | 'no-technician' | 'list' | 'chat'
export type FloatingChatCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

export interface FloatingChatProps {
  /** Permite al usuario ver y explorar su lista de chats (por defecto: true) */
  canViewChatList?: boolean
  /** Permite al usuario solicitar nuevo soporte (por defecto: true) */
  canRequestSupport?: boolean
  /**
   * Define si "Solicitar Asistencia" inicia conversación mediante el Bot (true)
   * o mediante el formulario tradicional hacia un técnico (false).
   * Si se omite, toma el valor de `ChatConfig.supportWithBot` (por defecto: true).
   */
  supportWithBot?: boolean
  /** Vista inicial al abrir el widget (por defecto: 'home') */
  defaultView?: FloatingChatView
  /** Esquina inicial donde se ubicará el widget (por defecto: 'bottom-right' o la guardada) */
  defaultCorner?: FloatingChatCorner
  /** Conversación inicial predefinida (opcional) */
  initialConversation?: Conversation
  /** Título de la cabecera en el menú principal */
  title?: string
  /**
   * Rutas o patrones de ruta donde se debe ocultar el chat flotante.
   * Por defecto: `['/messenger']`
   * Admite rutas exactas o prefijos (ej: `['/messenger', '/reports/*']`).
   */
  hiddenPaths?: string[]
  /**
   * Rutas donde únicamente debe mostrarse (opcional).
   * Si se define, el chat sólo será visible en estas rutas.
   */
  showOnlyPaths?: string[]
  /**
   * Función condicional personalizada para ocultar el chat según la ruta activa.
   */
  hideCondition?: (pathname: string) => boolean
  /**
   * Forzar ocultamiento mediante valor booleano directo.
   */
  hidden?: boolean
  /**
   * Ruta activa opcional.
   * Si usas Next.js `usePathname()`, puedes suministrarla: `currentPath={pathname}`.
   * Si se omite, se detectará automáticamente en tiempo real.
   */
  currentPath?: string
  /**
   * Muestra notificaciones toast emergentes al recibir mensajes no leídos.
   * Por defecto: false (el widget flotante ya dispone de badges e indicadores visuales).
   */
  showToastOnUnread?: boolean
  /**
   * Opciones de renderizado para los componentes internos del chat (ej: customHeaderButtons).
   */
  renderOptions?: ConversationChatHeaderRenderOptions
  /**
   * Callback que notifica cuando la conversación activa cambia (o se deselecciona / cierra).
   */
  onActiveConversationChange?: (conversation: Conversation | null) => void
}
