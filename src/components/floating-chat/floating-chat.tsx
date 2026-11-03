'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Card, cn } from '../../ui'
import { toast } from 'sonner'
import { ConversationChatPanel } from '../conversation-chat-panel'
import { SupportNoTechnicianView } from '../support-no-technician-view'
import { NewConversationDialog } from '../new-conversation-dialog'
import useConversationsPage from '../../hooks/use-conversations-page'
import useRequestChatSupport from '../../hooks/api/use-request-chat-support'
import useCreateConversation from '../../hooks/api/conversations/use-create-conversation'
import { useChatContext } from '../../context/chat-context'
import { activeConversationStore } from '../../context/active-conversation-context'
import { useCheckHasPermissionMessenger } from '../../hooks/use-check-has-permission-messenger'
import type { Conversation } from '../../types/conversation.types'
import type {
  RequestChatSupportPayload,
  RequestChatSupportResponse,
  EscalateChatSupportResponse
} from '../../types/chat-support.types'
import type { UserChat } from '../../types/user-chat.types'
import type { FloatingChatProps, FloatingChatView } from './types'
import { useFloatingChatVisibility, DEFAULT_HIDDEN_PATHS } from './hooks/use-floating-chat-visibility'
import { useFloatingChatDrag } from './hooks/use-floating-chat-drag'
import { FloatingChatButton } from './components/floating-chat-button'
import { FloatingChatHomeView } from './components/floating-chat-home-view'
import { FloatingChatFormView } from './components/floating-chat-form-view'
import { FloatingChatListView } from './components/floating-chat-list-view'
import { FloatingChatSkeleton } from './components/floating-chat-skeleton'
import { FloatingChatErrorView } from './components/floating-chat-error-view'

export function FloatingChat({
  canViewChatList = true,
  canRequestSupport = true,
  supportWithBot,
  defaultView = 'home',
  defaultCorner = 'bottom-right',
  initialConversation,
  title = 'Centro de Ayuda SDI',
  hiddenPaths = DEFAULT_HIDDEN_PATHS,
  showOnlyPaths,
  hideCondition,
  hidden = false,
  currentPath,
  showToastOnUnread = false,
  renderOptions,
  onActiveConversationChange
}: FloatingChatProps) {
  // Verificación de permisos de Messenger
  const hasReadChat = useCheckHasPermissionMessenger({
    permission: ['messenger_chat.read']
  })
  const hasRequestSupport = useCheckHasPermissionMessenger({
    permission: ['messenger_chat_support.request_support']
  })
  const hasProvideSupport = useCheckHasPermissionMessenger({
    permission: ['messenger_chat_support.provide_support']
  })
  const hasAnyPermission = useCheckHasPermissionMessenger({
    permission: [
      'messenger_chat.read',
      'messenger_chat_support.request_support',
      'messenger_chat_support.provide_support'
    ],
    operator: 'OR'
  })

  // Contextos de usuario y configuración
  const { currentUser, isLoadingUser, hasError, error: chatError, config } = useChatContext()
  const resolvedUserId = currentUser?.id
  const resolvedUserName = currentUser?.attributes?.name || 'Usuario'

  const effectiveCanViewChatList = canViewChatList && hasReadChat
  const effectiveCanRequestSupport = canRequestSupport && hasRequestSupport
  const effectiveSupportWithBot = supportWithBot ?? config.supportWithBot ?? true

  // Hook de visibilidad condicional por ruta
  const { shouldHide } = useFloatingChatVisibility({
    hiddenPaths,
    showOnlyPaths,
    hideCondition,
    hidden,
    currentPath
  })

  // Hook de arrastre y fijación a esquinas
  const {
    containerRef,
    isDragging,
    dragPos,
    wasDraggedRef,
    isTop,
    isLeft,
    cornerContainerClass,
    cardOriginClass,
    startDrag
  } = useFloatingChatDrag(defaultCorner)

  const [isOpen, setIsOpen] = useState(false)
  const [currentView, setCurrentView] = useState<FloatingChatView>(() => {
    if (!effectiveCanViewChatList && !effectiveCanRequestSupport) return 'chat'
    if (defaultView === 'list' && !effectiveCanViewChatList) return 'home'
    if (defaultView === 'support-form' && (!effectiveCanRequestSupport || effectiveSupportWithBot)) {
      return 'home'
    }
    return defaultView
  })

  // Hook para solicitar chat-support
  const {
    mutateAsync: requestChatSupport,
    isLoading: isSubmittingSupport,
    error: supportError
  } = useRequestChatSupport()

  // Hook para iniciar conversación directa con bot
  const {
    mutateAsync: createConversation,
    isLoading: isStartingBot
  } = useCreateConversation()

  const handleStartBotConversation = async () => {
    try {
      const newConv = await createConversation({
        type: 'bot',
        sender_id: resolvedUserId ? Number(resolvedUserId) : undefined,
        user_id: resolvedUserId ? Number(resolvedUserId) : undefined,
      })

      if (newConv) {
        setCustomActiveConversation(newConv)
        handleConversationCreated(newConv)
        toast.success('Conversación iniciada con el Asistente Virtual')
        setCurrentView('chat')
      }
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Error al iniciar conversación con el bot'
      toast.error(errorMsg)
    }
  }

  const handleRequestSupportAction = () => {
    if (effectiveSupportWithBot) {
      void handleStartBotConversation()
    } else {
      setCurrentView('support-form')
    }
  }

  // Estado para la respuesta cuando no hay técnico
  const [noTechResult, setNoTechResult] = useState<RequestChatSupportResponse | null>(null)
  const [customActiveConversation, setCustomActiveConversation] = useState<Conversation | null>(
    null
  )

  const {
    conversations,
    selectedId,
    selectedConversation,
    closedFilter,
    setClosedFilter,
    typeFilter,
    setTypeFilter,
    searchQuery,
    setSearchQuery,
    isNewConversationOpen,
    isLoading,
    selectConversation,
    setIsNewConversationOpen,
    handleConversationCreated
  } = useConversationsPage({
    showToastOnUnread,
    isActive: isOpen && currentView === 'chat'
  })

  // Contador total de mensajes sin leer
  const totalUnreadCount = useMemo(() => {
    if (!conversations || !Array.isArray(conversations)) return 0
    return conversations.reduce((acc, conv) => acc + (conv.attributes?.unread_count || 0), 0)
  }, [conversations])

  const activeConversation =
    (customActiveConversation
      ? selectedConversation &&
        String(selectedConversation.id) === String(customActiveConversation.id)
        ? selectedConversation
        : customActiveConversation
      : null) ||
    initialConversation ||
    selectedConversation ||
    null

  const currentChatConversation = isOpen && currentView === 'chat' ? activeConversation : null

  useEffect(() => {
    activeConversationStore.set(currentChatConversation)
    onActiveConversationChange?.(currentChatConversation)
  }, [currentChatConversation, onActiveConversationChange])

  useEffect(() => {
    return () => {
      activeConversationStore.set(null)
    }
  }, [])

  useEffect(() => {
    if (currentView === 'chat' && !activeConversation) {
      if (effectiveCanViewChatList) {
        setCurrentView('list')
      } else {
        setCurrentView('home')
      }
    }
  }, [currentView, activeConversation, effectiveCanViewChatList])

  const handleToggleOpen = () => {
    if (wasDraggedRef.current || isDragging) return

    if (!isOpen) {
      setIsOpen(true)
      if (defaultView === 'list' && !effectiveCanViewChatList) {
        setCurrentView(
          effectiveCanRequestSupport && !effectiveSupportWithBot ? 'support-form' : 'home'
        )
      } else if (
        defaultView === 'support-form' &&
        (!effectiveCanRequestSupport || effectiveSupportWithBot)
      ) {
        setCurrentView(effectiveCanViewChatList ? 'list' : 'home')
      } else if (defaultView) {
        setCurrentView(defaultView)
      } else {
        setCurrentView('home')
      }
    } else {
      setIsOpen(false)
    }
  }

  // Si la ruta lo oculta O el usuario no tiene ningún permiso de mensajería (y ya cargó)
  if (shouldHide || (!isLoadingUser && !hasError && !hasAnyPermission)) {
    return null
  }

  const handleSelectFromList = (id: string) => {
    setCustomActiveConversation(null)
    selectConversation(id)
    setCurrentView('chat')
  }

  // Manejador del envío del formulario de solicitud de asistencia
  const handleSubmitSupport = async (payload: RequestChatSupportPayload) => {
    try {
      const response = await requestChatSupport({ ...payload, direct_technician: false })

      if (response?.conversation_id && response?.technician) {
        // Hay técnico disponible: Creamos o asociamos la conversación y entramos a chat
        const convId = String(response.conversation_id)
        const techUser: UserChat = {
          id: String(response.technician.id),
          type: 'user',
          attributes: {
            user_auth_id: Number(response.technician.user_auth_id),
            name: response.technician.name,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          relationships: []
        }

        const newConv: Conversation = {
          id: convId,
          type: 'conversation',
          attributes: {
            is_group: false,
            name: response.technician.name || response.ticket?.subject || 'Soporte SDI',
            closed_at: null,
            unread_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          relationships: {
            users: [techUser]
          }
        }

        setCustomActiveConversation(newConv)
        handleConversationCreated(newConv)
        toast.success(`Asistencia iniciada con ${response.technician.name}`, {
          description: `Ticket #${response.ticket?.number || response.ticket?.id}`
        })
        setCurrentView('chat')
      } else {
        // No hay técnico disponible: Mostramos la vista informativa con el ticket
        setNoTechResult(response)
        setCurrentView('no-technician')
      }
    } catch (err: any) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Error al procesar la solicitud de asistencia'
      toast.error(apiMsg)
    }
  }

  // Manejador del resultado de escalar a un técnico desde el chat de IA
  const handleEscalateSuccess = (response: EscalateChatSupportResponse) => {
    if (response?.conversation_id) {
      const convId = String(response.conversation_id)
      const techUser: UserChat | undefined = response.technician
        ? {
            id: String(response.technician.id),
            type: 'user',
            attributes: {
              user_auth_id: Number(response.technician.user_auth_id ?? response.technician.id ?? 1),
              name: response.technician.name,
              avatar_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            relationships: []
          }
        : undefined

      const newConv: Conversation = {
        id: convId,
        type: 'conversation',
        attributes: {
          is_group: false,
          name: response.technician?.name || (response.ticket as any)?.subject || 'Soporte SDI',
          closed_at: null,
          unread_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        relationships: {
          users: techUser ? [techUser] : []
        }
      }

      setCustomActiveConversation(newConv)
      handleConversationCreated(newConv)
      setCurrentView('chat')
    } else if (response?.ticket) {
      setNoTechResult(response as any)
      setCurrentView('no-technician')
    }
  }

  if (shouldHide) {
    return null
  }

  if (hasError) return

  return (
    <div
      ref={containerRef}
      style={
        isDragging && dragPos
          ? {
            position: 'fixed',
            left: `${dragPos.x}px`,
            top: `${dragPos.y}px`,
            bottom: 'auto',
            right: 'auto',
            zIndex: 50,
            touchAction: 'none',
            transition: 'none'
          }
          : undefined
      }
      className={cn(
        'sdi-messenger-root z-50 flex pointer-events-none select-none',
        isDragging
          ? 'fixed cursor-grabbing'
          : cn('fixed duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transition-all', cornerContainerClass)
      )}
    >
      {/* Ventana Flotante del Chat */}
      {isOpen && (
        <Card
          className={cn(
            'pointer-events-auto h-[590px] max-h-[calc(100vh-120px)] w-[385px] sm:w-[425px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-0 shadow-2xl transition-all duration-300 flex flex-col',
            isTop ? 'mt-3.5' : 'mb-3.5',
            cardOriginClass
          )}
        >
          {isLoadingUser ? (
            <FloatingChatSkeleton onDragStart={startDrag} />
          ) : (
            <>
              {/* VISTA 1: HOME */}
              {currentView === 'home' && (
                <FloatingChatHomeView
                  title={title}
                  canRequestSupport={effectiveCanRequestSupport}
                  canViewChatList={effectiveCanViewChatList}
                  supportWithBot={effectiveSupportWithBot}
                  isStartingBot={isStartingBot}
                  totalUnreadCount={totalUnreadCount}
                  conversationsCount={conversations.length}
                  onRequestSupport={handleRequestSupportAction}
                  onViewChatList={() => setCurrentView('list')}
                  onClose={() => setIsOpen(false)}
                  onNewConversation={() => setIsNewConversationOpen(true)}
                  onDragStart={startDrag}
                />
              )}

              {/* VISTA 2: FORMULARIO DE SOLICITUD DE ASISTENCIA */}
              {currentView === 'support-form' && (
                <FloatingChatFormView
                  userId={resolvedUserId}
                  userName={resolvedUserName}
                  canViewChatList={effectiveCanViewChatList}
                  totalUnreadCount={totalUnreadCount}
                  isSubmitting={isSubmittingSupport}
                  error={
                    (supportError as any)?.response?.data?.message ||
                    (supportError as any)?.message
                  }
                  onHome={() => setCurrentView('home')}
                  onViewChats={() => setCurrentView('list')}
                  onClose={() => setIsOpen(false)}
                  onSubmit={handleSubmitSupport}
                  onNewConversation={() => setIsNewConversationOpen(true)}
                  onDragStart={startDrag}
                />
              )}

              {/* VISTA 3: SIN TÉCNICO ONLINE (INFORMATIVO DE TICKET) */}
              {currentView === 'no-technician' && (
                <SupportNoTechnicianView
                  message={noTechResult?.message}
                  ticket={noTechResult?.ticket}
                  onNewRequest={() => {
                    setNoTechResult(null)
                    if (effectiveSupportWithBot) {
                      setCurrentView('home')
                      void handleStartBotConversation()
                    } else {
                      setCurrentView('support-form')
                    }
                  }}
                  onViewChats={() => setCurrentView('list')}
                  onClose={() => setIsOpen(false)}
                  canViewChatList={effectiveCanViewChatList}
                />
              )}

              {/* VISTA 4: LISTA DE CONVERSACIONES */}
              {currentView === 'list' && (
                <FloatingChatListView
                  conversations={conversations}
                  selectedId={selectedId}
                  searchQuery={searchQuery}
                  closedFilter={closedFilter}
                  typeFilter={typeFilter}
                  isLoading={isLoading}
                  onHome={() => setCurrentView('home')}
                  onClose={() => setIsOpen(false)}
                  onSelectConversation={handleSelectFromList}
                  onSearchChange={setSearchQuery}
                  onClosedFilterChange={setClosedFilter}
                  onTypeFilterChange={setTypeFilter}
                  onNewConversation={() => setIsNewConversationOpen(true)}
                  onDragStart={startDrag}
                />
              )}

              {/* VISTA 5: CHAT ACTIVO */}
              {currentView === 'chat' && activeConversation && (
                <div className='flex h-full w-full flex-col min-w-0 overflow-hidden'>
                  <ConversationChatPanel
                    conversation={activeConversation}
                    isContextPanelOpen={false}
                    alwaysShowBackButton={true}
                    renderOptions={renderOptions}
                    onEscalateSuccess={handleEscalateSuccess}
                    onCloseSuccess={() => {
                      setCustomActiveConversation(null)
                      if (effectiveCanViewChatList) {
                        setCurrentView('list')
                      } else {
                        setCurrentView('home')
                      }
                    }}
                    onBack={() => {
                      setCustomActiveConversation(null)
                      if (effectiveCanViewChatList) {
                        setCurrentView('list')
                      } else {
                        setCurrentView('home')
                      }
                    }}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      )}


      {/* Botón Trigger Flotante (FAB) */}
      <FloatingChatButton
        isOpen={isOpen}
        totalUnreadCount={totalUnreadCount}
        isLeft={isLeft}
        isLoading={isLoadingUser}
        hasError={hasError}
        onToggleOpen={handleToggleOpen}
        onPointerDown={startDrag}
      />

      {/* Modal de Nueva Conversación */}
      <NewConversationDialog
        open={isNewConversationOpen}
        onOpenChange={setIsNewConversationOpen}
        onSuccess={(newConv) => {
          setCustomActiveConversation(newConv)
          handleConversationCreated(newConv)
          setCurrentView('chat')
        }}
      />
    </div>
  )
}

export default FloatingChat
