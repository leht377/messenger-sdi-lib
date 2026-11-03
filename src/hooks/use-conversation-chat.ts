import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Conversation, TypingEvent } from '../types/conversation.types'
import type { ConversationMessage, Message, MessageParams } from '../types/message.types'
import { getConversationName } from '../utils/conversation.util'
import { createOptimisticMessage, mergeOlderGroups } from '../utils/message.util'
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
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [newMessagesCount, setNewMessagesCount] = useState(0)
  const [visibleDate, setVisibleDate] = useState('Hoy')
  const [typingUser, setTypingUser] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const isInitialScrollDoneRef = useRef(false)
  const isAutoScrollingRef = useRef(false)
  const previousScrollHeightRef = useRef(0)
  const previousScrollTopRef = useRef(0)
  const isFetchingNextPageRef = useRef(false)
  const hasNextPageRef = useRef(hasNextPage)
  const previousConversationIdRef = useRef(conversation.id)

  const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const outgoingTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)
  const updateConversationTypingRef = useRef(updateConversationTyping)
  const conversationName = getConversationName(conversation, currentUserId)

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
    setIsNearBottom(true)
  }, [])

  const updateScrollIndicators = useCallback(() => {
    const container = scrollRef.current
    if (!container) return

    const scrollBottomOffset =
      container.scrollHeight - container.scrollTop - container.clientHeight
    const nearBottom = scrollBottomOffset < 140

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
      isInitialScrollDoneRef.current = false
      isAutoScrollingRef.current = false
      previousScrollHeightRef.current = 0
      previousScrollTopRef.current = 0
      setOptimisticMessages([])
      setIsNearBottom(true)
      setNewMessagesCount(0)
      setVisibleDate('Hoy')
    }
  }, [conversation.id])

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
      if (markReadTimerRef.current) {
        clearTimeout(markReadTimerRef.current)
      }
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }
      if (outgoingTypingTimerRef.current) {
        clearTimeout(outgoingTypingTimerRef.current)
      }
    }
  }, [conversation.id])

  const handleNewMessage = useCallback(
    (message: Message) => {
      prependIncomingMessage(message)

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
      }

      scheduleMarkAsRead()
    },
    [currentUserId, prependIncomingMessage, scheduleMarkAsRead]
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
      typingTimerRef.current = setTimeout(() => {
        typingTimerRef.current = null
        setTypingUser(null)
      }, 2000)
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

    setOptimisticMessages((current) => [...current, optimisticMessage])
    if (typeof customText !== 'string') {
      setInputText('')
    }
    if (outgoingTypingTimerRef.current) {
      clearTimeout(outgoingTypingTimerRef.current)
      outgoingTypingTimerRef.current = null
    }
    sendTypingStatus(false)

    try {
      const message = file
        ? await uploadMessageFile({
          conversationId: conversation.id,
          file,
          sender_id: Number(currentUser.id),
          caption: caption || undefined
        })
        : await sendMessage({
          body: caption,
          conversationId: conversation.id,
          sender_id: currentUser.id
        })

      setPendingFile(null)
      await refetchMessages()
      setOptimisticMessages((current) => current.filter((item) => item.id !== optimisticId))

      scheduleMarkAsRead()
    } catch {
      setOptimisticMessages((current) =>
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
    isSending,
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
    handleCloseConversation
  }
}

export default useConversationChat
