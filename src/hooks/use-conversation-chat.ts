import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Conversation, TypingEvent } from '../types/conversation.types'
import type {
  ConversationMessage,
  Message,
  MessageMetadata,
  MessageParams
} from '../types/message.types'
import type { BotChatHistoryItem } from '../types/chat-support.types'
import type { UserChat } from '../types/user-chat.types'
import {
  getConversationName,
  getConversationUser,
  isConversationBot,
  isUserBot
} from '../utils/conversation.util'
import { createOptimisticMessage, mergeOlderGroups } from '../utils/message.util'
import { sendBotMessageStream } from '../services/bot.service'
import useListMessages from './api/messages/use-list-messages'
import useSendMessage from './api/messages/use-send-message'
import useUploadMessageFile from './api/messages/use-upload-message-file'
import useMarkConversationAsRead from './api/conversations/use-mark-conversation-as-read'
import useUpdateConversationTyping from './api/conversations/use-update-conversation-typing'
import useCloseConversation from './api/conversations/use-close-conversation'
import { toast } from 'sonner'
import { subscribeToConversation } from '../utils/reverb'
import {
  getConversationSessionId,
  removeConversationSessionId,
  saveConversationSessionId
} from '../utils/session-storage.util'
import { useChatContext } from '../context/chat-context'
import { playNotificationSound } from '../utils/audio.util'

function buildBotHistory(
  groups: ConversationMessage[],
  currentUserId?: string
): BotChatHistoryItem[] {
  const history: BotChatHistoryItem[] = []
  for (let i = groups.length - 1; i >= 0; i--) {
    const groupMessages = groups[i]?.messages
    if (!Array.isArray(groupMessages)) continue
    for (let j = groupMessages.length - 1; j >= 0; j--) {
      const msg = groupMessages[j]
      const text = (msg?.attributes?.body || '').trim()
      if (!text) continue
      const senderId = msg?.relationships?.sender?.id ?? msg?.attributes?.sender_id
      const role: 'user' | 'assistant' =
        currentUserId && String(senderId) === String(currentUserId) ? 'user' : 'assistant'
      history.push({ role, content: text })
    }
  }
  return history.slice(-20)
}

function resolveSessionIdFromChat(
  conversationId: string,
  groups: ConversationMessage[]
): string {
  const stored = getConversationSessionId(conversationId)
  if (stored) return stored

  for (let i = 0; i < groups.length; i++) {
    const groupMessages = groups[i]?.messages
    if (!Array.isArray(groupMessages)) continue
    for (let j = 0; j < groupMessages.length; j++) {
      const candidate = groupMessages[j]?.attributes?.metadata?.session_uuid
      if (candidate) return String(candidate)
    }
  }

  return `conv_${conversationId}`
}

function mergeBotMessageMetadata(
  target: Message,
  extraMeta?: Partial<MessageMetadata> | null,
  fallbackBody?: string
): Message {
  const existingMeta = target.attributes?.metadata || {}
  const mergedMeta: MessageMetadata = {
    ...existingMeta,
    ...(extraMeta
      ? {
          session_uuid: extraMeta.session_uuid ?? existingMeta.session_uuid,
          state: extraMeta.state ?? existingMeta.state,
          intent: extraMeta.intent ?? existingMeta.intent,
          confidence: extraMeta.confidence ?? existingMeta.confidence,
          solution_id: extraMeta.solution_id ?? existingMeta.solution_id,
          article: extraMeta.article ?? existingMeta.article,
          tickets: extraMeta.tickets ?? existingMeta.tickets,
          ttft_ms: extraMeta.ttft_ms ?? existingMeta.ttft_ms,
          total_ms: extraMeta.total_ms ?? existingMeta.total_ms,
          action_buttons:
            extraMeta.action_buttons && extraMeta.action_buttons.length > 0
              ? extraMeta.action_buttons
              : existingMeta.action_buttons
        }
      : {})
  }

  return {
    ...target,
    isStreaming: false,
    attributes: {
      ...target.attributes,
      body: target.attributes?.body?.trim() ? target.attributes.body : fallbackBody || target.attributes?.body || '',
      metadata: mergedMeta
    }
  }
}

export interface UseConversationChatOptions {
  onCloseSuccess?: () => void
}

export const useConversationChat = (
  conversation: Conversation,
  options?: UseConversationChatOptions
) => {
  const { config, currentUser, currentUserId } = useChatContext()

  const params = useMemo<MessageParams>(
    () => ({ conversation: conversation.id, page: { size: '20' } }),
    [conversation.id]
  )

  const {
    data: messages,
    refetch: refetchMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    prependIncomingMessage
  } = useListMessages({
    params,
    enabled: Boolean(conversation.id)
  })
  const { mutateAsync: sendMessage, isLoading: isSending } = useSendMessage()
  const { mutateAsync: uploadMessageFile, isLoading: isUploading } = useUploadMessageFile()
  const { mutateAsync: markConversationAsRead } = useMarkConversationAsRead()
  const { mutate: updateConversationTyping } = useUpdateConversationTyping()
  const { mutateAsync: closeConversation, isLoading: isClosing } = useCloseConversation()

  const [inputText, setInputText] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const isClosed = Boolean(conversation.attributes.closed_at)
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([])
  const [isBotStreaming, setIsBotStreaming] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [newMessagesCount, setNewMessagesCount] = useState(0)
  const [visibleDate, setVisibleDate] = useState('Hoy')
  const [typingUser, setTypingUser] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const isInitialScrollDoneRef = useRef(false)
  const isAutoScrollingRef = useRef(false)
  const isNearBottomRef = useRef(true)
  const previousScrollHeightRef = useRef(0)
  const previousScrollTopRef = useRef(0)
  const isFetchingNextPageRef = useRef(false)
  const hasNextPageRef = useRef(hasNextPage)
  const previousConversationIdRef = useRef(conversation.id)
  const messagesRef = useRef(messages)
  const optimisticMessagesRef = useRef<Message[]>([])
  const pendingReverbBotMessageRef = useRef<Message | null>(null)
  const latestBotSseMetaRef = useRef<{ text: string; meta: Partial<MessageMetadata> } | null>(null)
  const streamAbortControllerRef = useRef<AbortController | null>(null)

  const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const outgoingTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)
  const updateConversationTypingRef = useRef(updateConversationTyping)
  const conversationUser = getConversationUser(conversation, currentUserId)
  const isBotChat =
    isConversationBot(conversation, currentUserId) || isUserBot(conversationUser)
  const conversationName = getConversationName(conversation, currentUserId)

  messagesRef.current = messages

  const updateOptimisticMessages = useCallback(
    (updater: React.SetStateAction<Message[]>) => {
      setOptimisticMessages((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        optimisticMessagesRef.current = next
        return next
      })
    },
    []
  )

  useEffect(() => {
    updateConversationTypingRef.current = updateConversationTyping
  }, [updateConversationTyping])

  useEffect(() => {
    isFetchingNextPageRef.current = isFetchingNextPage
  }, [isFetchingNextPage])

  useEffect(() => {
    hasNextPageRef.current = hasNextPage
  }, [hasNextPage])

  const scrollToBottom = useCallback(() => {
    const container = scrollRef.current
    if (!container) return

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    })
    setNewMessagesCount(0)
    isNearBottomRef.current = true
    setIsNearBottom(true)
  }, [])

  const updateScrollIndicators = useCallback(() => {
    const container = scrollRef.current
    if (!container) return

    const scrollBottomOffset =
      container.scrollHeight - container.scrollTop - container.clientHeight
    const nearBottom = scrollBottomOffset < 140

    isNearBottomRef.current = nearBottom
    setIsNearBottom(nearBottom)
    if (nearBottom) {
      setNewMessagesCount(0)
    }

    const messageElements = container.querySelectorAll<HTMLElement>('[data-message-date]')
    if (messageElements.length === 0) {
      setVisibleDate('Hoy')
      return
    }

    const containerRect = container.getBoundingClientRect()
    const viewportTop = containerRect.top
    const viewportBottom = containerRect.bottom
    let foundDate: string | null = null

    for (let i = 0; i < messageElements.length; i++) {
      const element = messageElements[i]
      const elementRect = element.getBoundingClientRect()

      // El primer mensaje que aparece de arriba hacia abajo determina la fecha.
      if (elementRect.bottom > viewportTop && elementRect.top < viewportBottom) {
        foundDate = element.getAttribute('data-message-date')
        break
      }
    }

    setVisibleDate(foundDate || messageElements[messageElements.length - 1].getAttribute('data-message-date') || 'Hoy')
  }, [])

  // Reiniciar estados de scroll y mensajes optimistas al cambiar de conversación
  useEffect(() => {
    if (previousConversationIdRef.current !== conversation.id) {
      previousConversationIdRef.current = conversation.id
      streamAbortControllerRef.current?.abort()
      streamAbortControllerRef.current = null
      pendingReverbBotMessageRef.current = null
      latestBotSseMetaRef.current = null
      isInitialScrollDoneRef.current = false
      isAutoScrollingRef.current = false
      isNearBottomRef.current = true
      previousScrollHeightRef.current = 0
      previousScrollTopRef.current = 0
      updateOptimisticMessages([])
      setIsBotStreaming(false)
      setIsNearBottom(true)
      setNewMessagesCount(0)
      setVisibleDate('Hoy')
    }
  }, [conversation.id, updateOptimisticMessages])

  // Posicionamiento inicial directo al fondo
  useEffect(() => {
    if (isInitialScrollDoneRef.current) return
    if (isLoading || messages.length === 0) return

    const container = scrollRef.current
    if (!container) return

    container.scrollTop = container.scrollHeight
    isInitialScrollDoneRef.current = true
    setIsNearBottom(true)
    updateScrollIndicators()
  }, [conversation.id, isLoading, messages.length, updateScrollIndicators])

  // Scroll Anchoring: al cargar mensajes más antiguos arriba, preservar la posición visual
  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return

    if (previousScrollHeightRef.current > 0) {
      const newScrollHeight = container.scrollHeight
      const heightDiff = newScrollHeight - previousScrollHeightRef.current
      if (heightDiff > 0) {
        container.scrollTop = previousScrollTopRef.current + heightDiff
      }
      previousScrollHeightRef.current = 0
      previousScrollTopRef.current = 0
    }
  }, [messages])

  // Desplazamiento suave al fondo cuando el usuario envía un mensaje nuevo
  useEffect(() => {
    if (optimisticMessages.length > 0) {
      const container = scrollRef.current
      if (container) {
        isAutoScrollingRef.current = true
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        })
        const timer = setTimeout(() => {
          isAutoScrollingRef.current = false
        }, 500)
        return () => clearTimeout(timer)
      }
    }
  }, [optimisticMessages.length])

  // Detector de scroll hacia arriba para solicitar páginas anteriores
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handleScroll = () => {
      updateScrollIndicators()

      if (isAutoScrollingRef.current || !isInitialScrollDoneRef.current) {
        return
      }

      if (
        container.scrollTop < 80 &&
        hasNextPageRef.current &&
        !isFetchingNextPageRef.current &&
        !isLoading
      ) {
        isFetchingNextPageRef.current = true
        previousScrollHeightRef.current = container.scrollHeight
        previousScrollTopRef.current = container.scrollTop

        fetchNextPage()
          .finally(() => {
            isFetchingNextPageRef.current = false
          })
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [fetchNextPage, isLoading, updateScrollIndicators])

  const scheduleMarkAsRead = useCallback(() => {
    if (!conversation.id || !currentUserId) return

    if (markReadTimerRef.current) {
      clearTimeout(markReadTimerRef.current)
    }

    markReadTimerRef.current = setTimeout(() => {
      markReadTimerRef.current = null
      void markConversationAsRead({
        conversationId: conversation.id,
        read_until: new Date().toISOString(),
        user_id: currentUserId
      })
        .then(() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('messenger:conversation-read', {
                detail: { conversationId: conversation.id }
              })
            )
          }
        })
        .catch(console.error)
    }, 200)
  }, [conversation.id, currentUserId, markConversationAsRead])

  useEffect(() => {
    return () => {
      streamAbortControllerRef.current?.abort()
      streamAbortControllerRef.current = null
      if (markReadTimerRef.current) {
        clearTimeout(markReadTimerRef.current)
        markReadTimerRef.current = null
      }
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
        typingTimerRef.current = null
      }
      if (outgoingTypingTimerRef.current) {
        clearTimeout(outgoingTypingTimerRef.current)
        outgoingTypingTimerRef.current = null
      }
      setTypingUser(null)
    }
  }, [conversation.id])

  const handleNewMessage = useCallback(
    (message: Message) => {
      const incomingBodyTrimmed = (message.attributes.body || '').trim()
      const isFromCurrentUser = Boolean(
        currentUserId && String(message.attributes.sender_id) === String(currentUserId)
      )
      const isFromBot = isUserBot(message.relationships?.sender) || (!isFromCurrentUser && isBotChat)

      let messageToInsert = message

      if (isFromCurrentUser) {
        const matchedOptimisticUser = optimisticMessagesRef.current.find(
          (item) =>
            !item.id.startsWith('temp_bot_') &&
            (item.attributes.body || '').trim() === incomingBodyTrimmed
        )
        if (matchedOptimisticUser) {
          updateOptimisticMessages((current) =>
            current.filter((item) => item.id !== matchedOptimisticUser.id)
          )
        }
      } else if (isFromBot) {
        const activeTempBot = optimisticMessagesRef.current.find((item) =>
          item.id.startsWith('temp_bot_')
        )

        if (activeTempBot) {
          if (activeTempBot.isStreaming) {
            pendingReverbBotMessageRef.current = message
            if (typingTimerRef.current) {
              clearTimeout(typingTimerRef.current)
              typingTimerRef.current = null
            }
            setTypingUser(null)
            scheduleMarkAsRead()
            return
          }

          messageToInsert = mergeBotMessageMetadata(
            message,
            activeTempBot.attributes.metadata || latestBotSseMetaRef.current?.meta
          )
          updateOptimisticMessages((current) =>
            current.filter((item) => item.id !== activeTempBot.id)
          )
          latestBotSseMetaRef.current = null
        } else if (
          latestBotSseMetaRef.current &&
          (!incomingBodyTrimmed || latestBotSseMetaRef.current.text.trim() === incomingBodyTrimmed)
        ) {
          messageToInsert = mergeBotMessageMetadata(message, latestBotSseMetaRef.current.meta)
          latestBotSseMetaRef.current = null
        }
      }

      prependIncomingMessage(messageToInsert)

      const container = scrollRef.current
      if (container) {
        const isCurrentlyNearBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight < 160
        if (isCurrentlyNearBottom) {
          setTimeout(() => {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'smooth'
            })
          }, 50)
        } else {
          setNewMessagesCount((prev) => prev + 1)
        }
      }

      const isFromOtherUser =
        currentUserId && String(message.attributes.sender_id) !== String(currentUserId)

      if (isFromOtherUser) {
        playNotificationSound('focused')
        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current)
          typingTimerRef.current = null
        }
        setTypingUser(null)
      }

      scheduleMarkAsRead()
    },
    [currentUserId, isBotChat, prependIncomingMessage, scheduleMarkAsRead, updateOptimisticMessages]
  )

  const handleTyping = useCallback(
    (event: TypingEvent) => {
      if (String(event.user_id) === String(currentUserId)) return

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
        typingTimerRef.current = null
      }

      if (!event.is_typing) {
        setTypingUser(null)
        return
      }

      setTypingUser(event.user.name)
      // Mantener activo mientras is_typing sea true, con timeout de seguridad de 1 minuto (60.000 ms) para apagarlo automáticamente
      typingTimerRef.current = setTimeout(() => {
        typingTimerRef.current = null
        setTypingUser(null)
    }, 60000)
},
  [currentUserId]
  )

const sendTypingStatus = useCallback(
  (isTyping: boolean) => {
    if (!conversation.id || !currentUserId || isTypingRef.current === isTyping) {
      return
    }

    isTypingRef.current = isTyping
    updateConversationTypingRef.current({
      conversationId: conversation.id,
      user_id: Number(currentUserId),
      is_typing: isTyping
    })
  },
  [conversation.id, currentUserId]
)

const scheduleTypingStop = useCallback(() => {
  if (outgoingTypingTimerRef.current) {
    clearTimeout(outgoingTypingTimerRef.current)
  }

  outgoingTypingTimerRef.current = setTimeout(() => {
    outgoingTypingTimerRef.current = null
    sendTypingStatus(false)
  }, 2500)
}, [sendTypingStatus])

const handleInputTextChange = useCallback(
  (text: string) => {
    if (isClosed) return
    setInputText(text)
    if (!text.trim()) {
      if (outgoingTypingTimerRef.current) {
        clearTimeout(outgoingTypingTimerRef.current)
        outgoingTypingTimerRef.current = null
      }
      sendTypingStatus(false)
      return
    }

    sendTypingStatus(true)
    scheduleTypingStop()
  },
  [isClosed, scheduleTypingStop, sendTypingStatus]
)

useEffect(() => {
  return () => {
    if (outgoingTypingTimerRef.current) {
      clearTimeout(outgoingTypingTimerRef.current)
      outgoingTypingTimerRef.current = null
    }
    sendTypingStatus(false)
  }
}, [conversation.id, sendTypingStatus])

const markConversationAsReadIfNeeded = () => {
  if (!conversation.attributes.unread_count) return
  scheduleMarkAsRead()
}

useEffect(() => {
  markConversationAsReadIfNeeded()
}, [conversation, messages, scheduleMarkAsRead])

// Sincronizar o limpiar session_uuid asociado a la conversación en localStorage
useEffect(() => {
  if (!conversation.id) return

  if (isClosed) {
    removeConversationSessionId(conversation.id)
    return
  }

  if (getConversationSessionId(conversation.id)) return

  for (let i = messages.length - 1; i >= 0; i--) {
    const group = messages[i]
    if (!Array.isArray(group?.messages)) continue
    for (let j = group.messages.length - 1; j >= 0; j--) {
      const sessionUuid = group.messages[j]?.attributes?.metadata?.session_uuid
      if (sessionUuid) {
        saveConversationSessionId(conversation.id, String(sessionUuid))
        return
      }
    }
  }
}, [conversation.id, isClosed, messages])

// Suscripción a eventos en tiempo real para la conversación
useEffect(() => {
  if (!conversation.id) return
  const unsubscribe = subscribeToConversation(
    config.reverb,
    Number(conversation.id),
    handleNewMessage,
    handleTyping
  )

  return () => {
    unsubscribe()
  }
}, [config.reverb, conversation.id, handleNewMessage, handleTyping])

const handleSelectFile = useCallback(
  (file: File) => {
    if (isClosed) return
    setPendingFile(file)
  },
  [isClosed]
)

const handleSendMessage = async (customText?: string) => {
  if (isClosed) return
  const caption = (typeof customText === 'string' ? customText : inputText).trim()
  if (!caption && !pendingFile) return
  if (!currentUser) return

  const file = typeof customText === 'string' ? null : pendingFile
  const optimisticMessage = createOptimisticMessage({
    conversationId: conversation.id,
    sender: currentUser,
    body: caption,
    file
  })
  const optimisticId = optimisticMessage.id

  if (typeof customText !== 'string') {
    setInputText('')
  }
  if (outgoingTypingTimerRef.current) {
    clearTimeout(outgoingTypingTimerRef.current)
    outgoingTypingTimerRef.current = null
  }
  sendTypingStatus(false)

  // Flujo Streaming SSE en conversaciones activas con el Asistente Virtual IA
  if (isBotChat && !file && caption) {
    const sessionId = resolveSessionIdFromChat(conversation.id, messagesRef.current)
    saveConversationSessionId(conversation.id, sessionId)
    const history = buildBotHistory(messagesRef.current, currentUserId)

    const botSender: UserChat = conversationUser || {
      id: '1',
      type: 'user',
      attributes: {
        user_auth_id: 0,
        name: 'Asistente Virtual IA',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      relationships: []
    }

    const tempBotId = `temp_bot_${Date.now()}`
    const tempBotMessage: Message = {
      id: tempBotId,
      type: 'message',
      attributes: {
        conversation_id: Number(conversation.id),
        created_at: new Date().toISOString(),
        sender_id: Number(botSender.id || 1),
        body: '',
        type: { id: 0, name: 'message', icon: '' },
        metadata: {
          session_uuid: sessionId
        }
      },
      relationships: {
        sender: botSender,
        attachments: []
      },
      isStreaming: true
    }

    pendingReverbBotMessageRef.current = null
    latestBotSseMetaRef.current = null
    streamAbortControllerRef.current?.abort()
    const streamController = new AbortController()
    streamAbortControllerRef.current = streamController

    let sseMeta: Partial<MessageMetadata> = { session_uuid: sessionId }
    let accumulatedReply = ''

    updateOptimisticMessages((current) => [
      ...current,
      optimisticMessage,
      tempBotMessage
    ])
    setIsBotStreaming(true)

    try {
      await sendBotMessageStream(
        {
          session_id: sessionId,
          message: caption,
          user_id: Number(currentUser.id),
          conversation_id: Number(conversation.id),
          history
        },
        {
          onMeta: (meta) => {
            if (meta.session_uuid) {
              saveConversationSessionId(conversation.id, meta.session_uuid)
            }
            sseMeta = {
              ...sseMeta,
              session_uuid: meta.session_uuid ?? sseMeta.session_uuid,
              state: meta.state ?? sseMeta.state,
              intent: meta.intent ?? sseMeta.intent,
              confidence: meta.confidence ?? sseMeta.confidence,
              article: meta.article ?? sseMeta.article,
              tickets: meta.tickets ?? sseMeta.tickets,
              ttft_ms: meta.ttft_ms ?? sseMeta.ttft_ms
            }

            updateOptimisticMessages((current) =>
              current.map((item) => {
                if (item.id === optimisticId) {
                  return { ...item, local_status: 'sent' }
                }
                if (item.id === tempBotId) {
                  return {
                    ...item,
                    attributes: {
                      ...item.attributes,
                      metadata: {
                        ...(item.attributes.metadata || {}),
                        ...sseMeta
                      }
                    }
                  }
                }
                return item
              })
            )
          },
          onDelta: (chunk) => {
            accumulatedReply += chunk
            updateOptimisticMessages((current) =>
              current.map((item) => {
                if (item.id === optimisticId) {
                  return { ...item, local_status: 'sent' }
                }
                if (item.id === tempBotId) {
                  return {
                    ...item,
                    isStreaming: true,
                    attributes: {
                      ...item.attributes,
                      body: (item.attributes.body || '') + chunk
                    }
                  }
                }
                return item
              })
            )

            if (isNearBottomRef.current && scrollRef.current) {
              requestAnimationFrame(() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight
                }
              })
            }
          },
          onDone: (donePayload) => {
            if (donePayload.session_uuid) {
              saveConversationSessionId(conversation.id, donePayload.session_uuid)
            }
            const finalBody = donePayload.reply || donePayload.message || accumulatedReply
            sseMeta = {
              ...sseMeta,
              session_uuid: donePayload.session_uuid ?? sseMeta.session_uuid,
              state: donePayload.state ?? sseMeta.state,
              solution_id: donePayload.solution_id ?? sseMeta.solution_id,
              article: donePayload.article ?? sseMeta.article,
              action_buttons: donePayload.action_buttons ?? sseMeta.action_buttons,
              total_ms: donePayload.total_ms ?? sseMeta.total_ms
            }

            const deferredReverbMsg = pendingReverbBotMessageRef.current
            if (deferredReverbMsg) {
              pendingReverbBotMessageRef.current = null
              latestBotSseMetaRef.current = null
              const reconciledMessage = mergeBotMessageMetadata(
                deferredReverbMsg,
                sseMeta,
                finalBody
              )
              updateOptimisticMessages((current) =>
                current
                  .map((item) =>
                    item.id === optimisticId ? { ...item, local_status: 'sent' as const } : item
                  )
                  .filter((item) => item.id !== tempBotId)
              )
              prependIncomingMessage(reconciledMessage)
              playNotificationSound('focused')
              if (isNearBottomRef.current && scrollRef.current) {
                requestAnimationFrame(() => {
                  if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
                  }
                })
              }
              return
            }

            latestBotSseMetaRef.current = {
              text: finalBody,
              meta: sseMeta
            }

            updateOptimisticMessages((current) =>
              current.map((item) => {
                if (item.id === optimisticId) {
                  return { ...item, local_status: 'sent' }
                }
                if (item.id === tempBotId) {
                  return {
                    ...item,
                    isStreaming: false,
                    attributes: {
                      ...item.attributes,
                      body: finalBody,
                      metadata: {
                        ...(item.attributes.metadata || {}),
                        ...sseMeta
                      }
                    }
                  }
                }
                return item
              })
            )
          },
          onError: (err) => {
            toast.error(err.message || 'Error al obtener respuesta del asistente')
            updateOptimisticMessages((current) =>
              current
                .map((item) => {
                  if (item.id === optimisticId) {
                    return { ...item, local_status: 'error' as const }
                  }
                  if (item.id === tempBotId) {
                    return { ...item, isStreaming: false }
                  }
                  return item
                })
                .filter((item) => !(item.id === tempBotId && !(item.attributes.body || '').trim()))
            )
          }
        },
        { signal: streamController.signal }
      )
    } catch {
      // Manejado por onError si falló también el fallback síncrono
    } finally {
      if (streamAbortControllerRef.current === streamController) {
        streamAbortControllerRef.current = null
      }
      setIsBotStreaming(false)
    }
    return
  }

  updateOptimisticMessages((current) => [...current, optimisticMessage])

  try {
    await (file
      ? uploadMessageFile({
        conversationId: conversation.id,
        file,
        sender_id: Number(currentUser.id),
        caption: caption || undefined
      })
      : sendMessage({
        body: caption,
        conversationId: conversation.id,
        sender_id: currentUser.id
      }))

    setPendingFile(null)
    await refetchMessages()
    updateOptimisticMessages((current) => current.filter((item) => item.id !== optimisticId))
  } catch {
    updateOptimisticMessages((current) =>
      current.map((item) =>
        item.id === optimisticId ? { ...item, local_status: 'error' } : item
      )
    )
  }
}

const handleCloseConversation = useCallback(async () => {
  try {
    await closeConversation(conversation.id)
    toast.success('Conversación cerrada exitosamente')
    options?.onCloseSuccess?.()
  } catch (err: any) {
    const errorMsg =
      err?.response?.data?.message || err?.message || 'Error al cerrar la conversación'
    toast.error(errorMsg)
  }
}, [closeConversation, conversation.id, options])

return {
  messages,
  optimisticMessages,
  scrollRef,
  conversationName,
  inputText,
  pendingFile,
  isClosed,
  isClosing,
  isSending: isSending || isBotStreaming,
  isBotStreaming,
  isUploading,
  isFetchingNextPage,
  hasNextPage,
  isLoading,
  isNearBottom,
  newMessagesCount,
  typingUser,
  visibleDate,
  currentUser,
  currentUserId,
  scrollToBottom,
  setInputText: handleInputTextChange,
  setPendingFile,
  handleSendMessage,
  handleSelectFile,
  handleCloseConversation,
  refetchMessages
}
}

export default useConversationChat
