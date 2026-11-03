import { useCallback, useEffect, useMemo, useState } from 'react'
import useListConversations from './api/conversations/use-list-conversations'
import useMarkConversationAsRead from './api/conversations/use-mark-conversation-as-read'
import { Conversation, FilterConversation, UnreadEvent } from '../types/conversation.types'
import { subscribeToUser } from '../utils/reverb'
import { toast } from 'sonner'
import useDebounce from './use-debounce'
import { useChatContext } from '../context/chat-context'
import { useCheckHasPermissionMessenger } from './use-check-has-permission-messenger'
import { playNotificationSound } from '../utils/audio.util'

export interface UseConversationsPageOptions {
  showToastOnUnread?: boolean
  isActive?: boolean
}

export const useConversationsPage = ({
  showToastOnUnread = true,
  isActive = true
}: UseConversationsPageOptions = {}) => {
  const { config, currentUser, currentUserId } = useChatContext()
  const { mutateAsync: markConversationAsRead } = useMarkConversationAsRead()

  const hasReadPermission = useCheckHasPermissionMessenger({
    permission: ['messenger_chat.read']
  })

  const [closedFilter, setClosedFilter] = useState<'0' | '1'>('0')
  const [typeFilter, setTypeFilter] = useState<'all' | 'direct' | 'group' | 'bot'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)

  const params: FilterConversation = useMemo(() => {
    const filter: Record<string, string> = {
      closed: closedFilter
    }
    if (typeFilter !== 'all') {
      filter.type = typeFilter
    }
    if (debouncedSearch.trim()) {
      filter.name = debouncedSearch.trim()
    }

    return {
      user_id: currentUserId,
      paginate: 'false',
      ...(Object.keys(filter).length > 0 ? { filter } : {})
    }
  }, [closedFilter, typeFilter, debouncedSearch, currentUserId])

  const {
    data: rawConversations,
    isLoading,
    isFetching,
    errors,
    refetch: refetchConversations
  } = useListConversations({
    params,
    enable: Boolean(currentUserId) && hasReadPermission
  })

  const [selectedId, setSelectedId] = useState('')
  const [fallbackConversation, setFallbackConversation] = useState<Conversation | null>(null)
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false)
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false)
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false)

  // Solo si la vista está visible/activa y la conversación coincide, aseguramos unread_count: 0
  const conversations = useMemo(() => {
        let list = rawConversations
        if (
          fallbackConversation &&
          !rawConversations.some((conv) => String(conv.id) === String(fallbackConversation.id))
        ) {
          list = [fallbackConversation, ...rawConversations]
        }

        if (!isActive || !selectedId) return list
        return list.map((conv) => {
          if (String(conv.id) === String(selectedId) && conv.attributes.unread_count > 0) {
            return {
              ...conv,
              attributes: {
                ...conv.attributes,
                unread_count: 0
              }
            }
          }
          return conv
        })
  }, [fallbackConversation, isActive, rawConversations, selectedId])

  const handleUnreadUpdate = useCallback(
    (event: UnreadEvent) => {
      const isFromOtherUser =
        currentUserId && String(event.message.sender_id) !== String(currentUserId)

      const isFocused =
      isActive && String(event.conversation_id) === String(selectedId)

      if (isFromOtherUser) {
        playNotificationSound(isFocused ? 'focused' : 'unfocused')
      }

      if (showToastOnUnread && !isFocused) {
        toast.info('Nuevo mensaje', {
          id: `conversation-message-${event.message.id}`,
          description: event.message.body || 'Tienes un mensaje nuevo',
          action: {
            label: 'Abrir',
            onClick: () => {
              setSelectedId(String(event.conversation_id))
              setIsMobileChatOpen(true)
            }
          }
        })
      }

      void refetchConversations()
    },
    [currentUserId, isActive, refetchConversations, selectedId, showToastOnUnread]
  )

  const handleRealtimeConversationCreated = useCallback(() => {
    void refetchConversations()
  }, [refetchConversations])

  // Escuchar cuando una conversación es marcada como leída, cerrada o creada para sincronizar la lista
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleSync = () => {
      void refetchConversations()
    }

    const handleCreated = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          conversationId?: string | number
          conversation?: Conversation | null
          focus?: boolean
        }>
      ).detail

      if (detail?.conversationId) {
        const targetId = String(detail.conversationId)
        if (detail.conversation) {
          setFallbackConversation(detail.conversation)
        }
        setClosedFilter('0')
        setTypeFilter((prev) => (prev === 'all' || prev === 'direct' ? prev : 'all'))
        setSearchQuery('')
        setSelectedId(targetId)
        setIsMobileChatOpen(true)
      }

      void refetchConversations()
    }

    window.addEventListener('messenger:conversation-read', handleSync)
    window.addEventListener('messenger:conversation-closed', handleSync)
    window.addEventListener('messenger:conversation-created', handleCreated)
    window.addEventListener('messenger:conversation-updated', handleSync)

    return () => {
      window.removeEventListener('messenger:conversation-read', handleSync)
      window.removeEventListener('messenger:conversation-closed', handleSync)
      window.removeEventListener('messenger:conversation-created', handleCreated)
      window.removeEventListener('messenger:conversation-updated', handleSync)
    }
  }, [refetchConversations])

  useEffect(() => {
    if (!currentUserId) return

    return subscribeToUser(
      config.reverb,
      currentUserId,
      handleUnreadUpdate,
      handleRealtimeConversationCreated
    )
  }, [config.reverb, handleRealtimeConversationCreated, handleUnreadUpdate, currentUserId])

  const selectedConversation = useMemo(
      () =>
conversations.find((conversation) => String(conversation.id) === String(selectedId)) ??
  (fallbackConversation && String(fallbackConversation.id) === String(selectedId)
    ? fallbackConversation
    : undefined),
  [conversations, fallbackConversation, selectedId]
  )

const selectConversation = useCallback(
  (id: string) => {
    const normalizedId = String(id)
    setSelectedId(normalizedId)
    setIsMobileChatOpen(true)

      if (normalizedId && currentUserId) {
        void markConversationAsRead({
          conversationId: normalizedId,
          read_until: new Date().toISOString(),
          user_id: currentUserId
        })
          .then(() => {
            void refetchConversations()
          })
          .catch(console.error)
      }
    },
    [currentUserId, markConversationAsRead, refetchConversations]
  )

const unselectConversation = () => {
  setSelectedId('')
  setIsMobileChatOpen(false)
}

const goBackToConversationList = () => setIsMobileChatOpen(false)

const handleConversationCreated = (conversation: Conversation) => {
  setFallbackConversation(conversation)
  setSelectedId(String(conversation.id))
  setIsMobileChatOpen(true)
  setIsNewConversationOpen(false)
  void refetchConversations()
}

return {
  conversations,
  selectedId,
  setSelectedId,
  selectedConversation,
  closedFilter,
  setClosedFilter,
  typeFilter,
  setTypeFilter,
  searchQuery,
  setSearchQuery,
  isContextPanelOpen,
  isMobileChatOpen,
  isNewConversationOpen,
  isLoading,
  isFetching,
  errors,
  hasReadPermission,
  currentUser,
  currentUserId,
  selectConversation,
  unselectConversation,
  setIsContextPanelOpen,
  setIsNewConversationOpen,
  goBackToConversationList,
  handleConversationCreated
}
}

export default useConversationsPage
