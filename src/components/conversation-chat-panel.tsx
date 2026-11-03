import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Conversation } from '../types/conversation.types'
import type { MessageActionButton } from '../types/message.types'
import type {
  EscalateChatSupportResponse,
  ResolveChatSupportResponse
} from '../types/chat-support.types'
import useConversationChat from '../hooks/use-conversation-chat'
import useEscalateChatSupport from '../hooks/api/use-escalate-chat-support'
import useResolveChatSupport from '../hooks/api/use-resolve-chat-support'
import {
  ConversationChatHeader,
  type ConversationChatHeaderRenderOptions
} from './conversation-chat-header'
import { ActiveConversationProvider, activeConversationStore } from '../context/active-conversation-context'
import { ConversationMessagesList } from './conversation-messages-list'
import { ConversationComposer } from './conversation-composer'
import { ChatWallpaper } from './chat-wallpaper'
import { EscalateSupportDialog } from './escalate-support-dialog'
import { ResolveSupportDialog } from './resolve-support-dialog'
import {
  getConversationSessionId,
  removeConversationSessionId,
  saveConversationSessionId
} from '../utils/session-storage.util'
import { UploadCloud } from 'lucide-react'
import { toast } from 'sonner'

export interface ConversationChatPanelProps {
  conversation: Conversation
  onToggleContextPanel?: () => void
  isContextPanelOpen?: boolean
  onBack?: () => void
  alwaysShowBackButton?: boolean
  onCloseSuccess?: () => void
  onEscalateSuccess?: (response: EscalateChatSupportResponse) => void
  onResolveSuccess?: (response: ResolveChatSupportResponse) => void
  showHeader?: boolean
  showWallpaper?: boolean
  readOnly?: boolean
  readOnlyMessage?: string
  showComposer?: boolean
  renderOptions?: ConversationChatHeaderRenderOptions
}

export function ConversationChatPanel({
  conversation,
  onToggleContextPanel,
  isContextPanelOpen = true,
  onBack,
  alwaysShowBackButton = false,
  onCloseSuccess,
  onEscalateSuccess,
  onResolveSuccess,
  showHeader = true,
  showWallpaper = true,
  readOnly = false,
  readOnlyMessage,
  showComposer = true,
  renderOptions
}: ConversationChatPanelProps) {
  const [isEscalateOpen, setIsEscalateOpen] = useState(false)
  const [isResolveOpen, setIsResolveOpen] = useState(false)
  const [isResolvedLocal, setIsResolvedLocal] = useState(false)
  const [queueResponse, setQueueResponse] = useState<EscalateChatSupportResponse | null>(null)
  const {
    mutateAsync: escalateSupport,
    isLoading: isEscalating,
    error: escalateError
  } = useEscalateChatSupport()
  const {
    mutateAsync: resolveSupport,
    isLoading: isResolving,
    error: resolveError
  } = useResolveChatSupport()

  const chat = useConversationChat(conversation, {
    onCloseSuccess: () => {
      onCloseSuccess?.()
      onBack?.()
    }
  })

  useEffect(() => {
    setIsResolvedLocal(false)
  }, [conversation.id])

  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const dragCounterRef = useRef(0)

  const effectiveIsClosed = chat.isClosed || isResolvedLocal
  const isActionDisabled = readOnly || effectiveIsClosed || chat.isSending || chat.isUploading

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (isActionDisabled) return

    const hasFiles = e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')
    if (hasFiles) {
      dragCounterRef.current += 1
      setIsDraggingOver(true)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (isActionDisabled) return
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDraggingOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDraggingOver(false)

    if (isActionDisabled) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        chat.handleSelectFile(file)
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (isActionDisabled) return
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          chat.handleSelectFile(file)
          return
        }
      }
    }
  }

  const activeConversationValue = useMemo(
    () => ({
      conversation,
      isClosed: effectiveIsClosed,
      isClosing: chat.isClosing,
      handleCloseConversation: chat.handleCloseConversation
    }),
    [conversation, effectiveIsClosed, chat.isClosing, chat.handleCloseConversation]
  )

  useEffect(() => {
    activeConversationStore.set(conversation)
    return () => {
      activeConversationStore.set(null)
    }
  }, [conversation])

  const resolveCurrentSessionId = () => {
    let sessionId = getConversationSessionId(conversation.id)

    if (!sessionId) {
      for (let i = chat.messages.length - 1; i >= 0; i--) {
        const group = chat.messages[i]
        if (!Array.isArray(group?.messages)) continue
        for (let j = group.messages.length - 1; j >= 0; j--) {
          const candidate = group.messages[j]?.attributes?.metadata?.session_uuid
          if (candidate) {
            sessionId = String(candidate)
            break
          }
        }
        if (sessionId) break
      }
    }

    return sessionId || ''
  }

  const handleActionClick = (action: MessageActionButton) => {
    if (action.action === 'escalate' || action.id === 'escalate') {
      setQueueResponse(null)
      setIsEscalateOpen(true)
      return
    }

    const normalizedLabel = (action.label || '').toLowerCase()
    const isResolveAction =
      action.action === 'resolve' ||
      action.id === 'resolve' ||
      action.action === 'resolved' ||
      action.id === 'resolved' ||
      action.action === 'confirm_solution' ||
      action.id === 'confirm_solution' ||
      normalizedLabel.includes('solucionó mi problema') ||
      normalizedLabel.includes('soluciono mi problema')

    if (isResolveAction) {
      setIsResolveOpen(true)
      return
    }

    chat.handleSendMessage(action.label || action.action)
  }

  const handleEscalateSubmit = async (reason: string) => {
    try {
      const sessionId = resolveCurrentSessionId()

      const response = await escalateSupport({
        session_id: sessionId,
        reason
      })

      if (response?.session_uuid) {
        saveConversationSessionId(conversation.id, String(response.session_uuid))
      }

      if (response?.conversation_id) {
        setIsEscalateOpen(false)
        setQueueResponse(null)
        toast.success(
          response.message ||
          (response.technician
            ? `Asistencia iniciada con ${response.technician.name}`
            : 'Conversación con técnico iniciada'),
          response.ticket
            ? {
                description: `Ticket #${response.ticket.number || response.ticket.id}`
              }
            : undefined
        )
} else if (response?.status === 'in_queue' || (response?.message && !response?.ticket)) {
  setQueueResponse(response)
} else {
  setIsEscalateOpen(false)
  setQueueResponse(null)
  if (response?.ticket) {
    toast.info(response.message || 'Ticket de soporte registrado', {
      description: `Ticket #${response.ticket.number || response.ticket.id}`
    })
  }
}

onEscalateSuccess?.(response)
    } catch (err: any) {
  const errorMsg =
    err?.response?.data?.message ||
    err?.message ||
    'Error al procesar la solicitud con el técnico'
  toast.error(errorMsg)
}
  }

const handleResolveSubmit = async ({
  rating,
  comment,
  helpful
}: {
  rating: number
  comment: string
  helpful: boolean
}) => {
  try {
    const sessionId = resolveCurrentSessionId()

    const response = await resolveSupport({
      session_id: sessionId,
      helpful,
      comment,
      rating
    })

    removeConversationSessionId(conversation.id)
    setIsResolveOpen(false)
    setIsResolvedLocal(true)

    toast.success(
      response?.message || '¡Gracias por tu calificación! El caso ha sido marcado como resuelto.',
      response?.ticket
        ? {
          description: `Ticket #${response.ticket.number || response.ticket.id}`
        }
        : undefined
    )

    onResolveSuccess?.(response)
  } catch (err: any) {
    const errorMsg =
      err?.response?.data?.message ||
      err?.message ||
      'Error al finalizar y calificar la atención'
    toast.error(errorMsg)
  }
}

return (
  <ActiveConversationProvider value={activeConversationValue}>
    <div
      className='sdi-messenger-root relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs'
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* Cabecera del Chat Activo */}
      {showHeader && (
        <ConversationChatHeader
          conversation={conversation}
          isClosed={effectiveIsClosed}
          isClosing={chat.isClosing}
          onCloseConversation={chat.handleCloseConversation}
          isContextPanelOpen={isContextPanelOpen}
          onToggleContextPanel={onToggleContextPanel}
          onBack={onBack}
          alwaysShowBackButton={alwaysShowBackButton}
          renderOptions={renderOptions}
        />
      )}

      {/* Cuerpo del Chat con Wallpaper continuo (Mensajes + Typing + Composer flotante) */}
      <div className='relative flex flex-1 min-h-0 w-full flex-col overflow-hidden bg-[#f4f6f8]/70 dark:bg-[#0a0f1d]'>
        {/* Fondo estilo Wallpaper Corporativo SDI continuo */}
        {showWallpaper && <ChatWallpaper />}

        {/* Overlay visual al arrastrar imágenes */}
        {isDraggingOver && (
          <div className='absolute inset-0 z-50 flex flex-col items-center justify-center bg-blue-500/10 dark:bg-blue-600/20 backdrop-blur-xs border-2 border-dashed border-blue-500/70 dark:border-blue-400/70 rounded-2xl m-2 pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95'>
            <div className='flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/95 dark:bg-neutral-900/95 shadow-xl border border-blue-500/20 text-center max-w-xs mx-4'>
              <div className='flex size-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shadow-inner'>
                <UploadCloud className='size-7 animate-bounce' />
              </div>
              <div>
                <p className='text-sm font-semibold text-neutral-800 dark:text-neutral-100'>
                  Suelta tu imagen aquí
                </p>
                <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'>
                  Se adjuntará para que puedas enviarla
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Área Principal de Mensajes */}
        <ConversationMessagesList
          conversation={conversation}
          messages={chat.messages}
          optimisticMessages={chat.optimisticMessages}
          scrollRef={chat.scrollRef}
          isFetchingNextPage={chat.isFetchingNextPage}
          hasNextPage={chat.hasNextPage}
          isLoading={chat.isLoading}
          isNearBottom={chat.isNearBottom}
          newMessagesCount={chat.newMessagesCount}
          visibleDate={chat.visibleDate}
          disableActions={isActionDisabled || isEscalating || isResolving}
          onScrollToBottom={chat.scrollToBottom}
          onActionClick={handleActionClick}
        />

        {chat.typingUser && !readOnly && (
          <div className='relative z-10 flex shrink-0 items-center gap-1.5 px-4 py-1 text-xs text-neutral-500 dark:text-neutral-400 animate-in fade-in duration-150'>
            <span className='font-medium'>{chat.typingUser} está escribiendo</span>
            <span className='inline-flex gap-0.5' aria-hidden='true'>
              <span className='size-1 rounded-full bg-neutral-400 animate-pulse' />
              <span className='size-1 rounded-full bg-neutral-400 animate-pulse delay-75' />
              <span className='size-1 rounded-full bg-neutral-400 animate-pulse delay-150' />
            </span>
          </div>
        )}

        {/* Barra de escritura flotante integrada en el chat */}
        {showComposer && (
          <div className='relative z-10 w-full'>
            <ConversationComposer
              inputText={chat.inputText}
              setInputText={chat.setInputText}
              onSendMessage={chat.handleSendMessage}
              onSelectFile={chat.handleSelectFile}
              pendingFile={chat.pendingFile}
              onRemoveFile={() => chat.setPendingFile(null)}
              isSending={chat.isSending}
              isUploading={chat.isUploading}
              conversationName={chat.conversationName}
              isClosed={effectiveIsClosed}
              readOnly={readOnly}
              readOnlyMessage={readOnlyMessage}
            />
          </div>
        )}
      </div>
    </div>

    <EscalateSupportDialog
      open={isEscalateOpen}
      onOpenChange={(open) => {
        setIsEscalateOpen(open)
        if (!open) {
          setQueueResponse(null)
        }
      }}
      onSubmit={handleEscalateSubmit}
      isSubmitting={isEscalating}
      queueData={queueResponse}
      onActionSelect={(action) => {
        setIsEscalateOpen(false)
        setQueueResponse(null)
        handleActionClick(action)
      }}
      error={
        (escalateError as any)?.response?.data?.message ||
        (escalateError as any)?.message
      }
    />

    <ResolveSupportDialog
      open={isResolveOpen}
      onOpenChange={setIsResolveOpen}
      onSubmit={handleResolveSubmit}
      isSubmitting={isResolving}
      error={
        (resolveError as any)?.response?.data?.message ||
        (resolveError as any)?.message
      }
    />
  </ActiveConversationProvider>
)
}
