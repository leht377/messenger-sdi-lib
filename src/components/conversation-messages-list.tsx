'use client'

import React from 'react'
import { ChevronsDown, Loader2 } from 'lucide-react'
import { ScrollArea, Skeleton } from '../ui'
import type { Conversation } from '../types/conversation.types'
import type { ConversationMessage, Message, MessageActionButton } from '../types/message.types'
import { ConversationMessageItem } from './conversation-message-item'
import {
  getConversationName,
  getConversationUser,
  isGroupConversation,
  isUserBot,
  isConversationBot
} from '../utils/conversation.util'
import { formatDisplayDate } from '../utils/message.util'
import { useChatContext } from '../context/chat-context'

interface ConversationMessagesListProps {
  conversation: Conversation
  messages: ConversationMessage[]
  optimisticMessages?: Message[]
  scrollRef?: React.RefObject<HTMLDivElement | null>
  isFetchingNextPage?: boolean
  hasNextPage?: boolean
  isLoading?: boolean
  isNearBottom?: boolean
  newMessagesCount?: number
  visibleDate?: string
  disableActions?: boolean
  onScrollToBottom?: () => void
  onActionClick?: (action: MessageActionButton) => void
}

export function ConversationMessagesList({
  conversation,
  messages,
  optimisticMessages = [],
  scrollRef,
  isFetchingNextPage = false,
  hasNextPage = false,
  isLoading = false,
  isNearBottom = true,
  newMessagesCount = 0,
  visibleDate = 'Hoy',
  disableActions = false,
  onScrollToBottom,
  onActionClick
}: ConversationMessagesListProps) {
  const { currentUserId } = useChatContext()
  const isGroup = isGroupConversation(conversation)
  const conversationName = getConversationName(conversation, currentUserId)
  const conversationUser = getConversationUser(conversation, currentUserId)
  const isBotConversation = isConversationBot(conversation, currentUserId) || isUserBot(conversationUser)
  const isConversationClosed = Boolean(conversation.attributes.closed_at)
  const historyMessageIds = new Set(
    messages.flatMap((messageGroup) => messageGroup.messages.map((message) => message.id))
  )
  const visibleOptimisticMessages = optimisticMessages.filter(
    (message) => !historyMessageIds.has(message.id)
  )
  const lastMessageId =
    visibleOptimisticMessages.length > 0
      ? visibleOptimisticMessages[visibleOptimisticMessages.length - 1]?.id
      : messages[0]?.messages?.[0]?.id

  const isToday =
    visibleDate.toLowerCase() === 'hoy' ||
    visibleDate.toLowerCase() === 'today' ||
    formatDisplayDate(visibleDate) === 'Hoy'

  return (
    <div className='flex-1 min-h-0 relative w-full overflow-hidden'>
      <ScrollArea ref={scrollRef as any} className='relative z-10 h-full w-full'>
        <div className='space-y-4 p-3 sm:p-4 text-sm w-full min-w-0'>
          {/* Indicador de carga de mensajes anteriores al hacer scroll hacia arriba */}
          {isFetchingNextPage && (
            <div className='flex items-center justify-center py-2 gap-2 text-xs text-neutral-500 animate-in fade-in duration-200'>
              <Loader2 className='size-3.5 animate-spin text-blue-600' />
              <span>Cargando mensajes anteriores...</span>
            </div>
          )}

          {/* Indicador de inicio de historial cuando no hay más mensajes anteriores */}
          {!hasNextPage && messages.length > 0 && (
            <div className='flex items-center justify-center py-1'>
              <span className='rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:text-neutral-400'>
                Inicio de la conversación
              </span>
            </div>
          )}

          {/* Skeleton durante la carga inicial */}
          {isLoading && messages.length === 0 && (
            <div className='space-y-4 py-2 animate-in fade-in duration-300'>
              <div className='flex items-end gap-2.5 max-w-[75%]'>
                <Skeleton className='size-8 rounded-full shrink-0' />
                <div className='space-y-1.5 flex-1'>
                  <Skeleton className='h-3 w-20 rounded' />
                  <Skeleton className='h-12 w-48 sm:w-64 rounded-2xl rounded-bl-none' />
                </div>
              </div>

              <div className='flex items-end justify-end gap-2.5 ml-auto max-w-[75%]'>
                <div className='space-y-1.5 flex flex-col items-end flex-1'>
                  <Skeleton className='h-14 w-52 sm:w-64 rounded-2xl rounded-br-none bg-blue-100/70 dark:bg-blue-950/40' />
                </div>
              </div>

              <div className='flex items-end gap-2.5 max-w-[75%]'>
                <Skeleton className='size-8 rounded-full shrink-0' />
                <div className='space-y-1.5 flex-1'>
                  <Skeleton className='h-3 w-16 rounded' />
                  <Skeleton className='h-16 w-56 sm:w-72 rounded-2xl rounded-bl-none' />
                </div>
              </div>

              <div className='flex items-end justify-end gap-2.5 ml-auto max-w-[75%]'>
                <div className='space-y-1.5 flex flex-col items-end flex-1'>
                  <Skeleton className='h-10 w-36 sm:w-44 rounded-2xl rounded-br-none bg-blue-100/70 dark:bg-blue-950/40' />
                </div>
              </div>
            </div>
          )}

          {/* Indicador flotante superior de fecha actual en la vista */}
          {messages.length > 0 && (
            <div className='sticky top-1 z-20 flex justify-center pointer-events-none mb-2 transition-all duration-200'>
              <div className='pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 px-3 py-0.5 text-[11px] font-medium text-neutral-800 dark:text-neutral-200 shadow-xs'>
                <span>{isToday ? 'Hoy' : formatDisplayDate(visibleDate)}</span>
              </div>
            </div>
          )}

          {[...(messages ?? [])].reverse().map((messageGroup) => (
            <div
              key={messageGroup.date}
              data-date-group={messageGroup.date}
              className='space-y-4'
            >
              <div className='flex items-center justify-center py-1'>
                <span className='rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 shadow-xs'>
                  {formatDisplayDate(messageGroup.date)}
                </span>
              </div>

              {[...messageGroup.messages].reverse().map((message) => {
                const isOwnMessage =
                  String(message?.relationships?.sender?.id) === String(currentUserId)
                const isLastMessage = message.id === lastMessageId

                return (
                  <div
                    key={message.id}
                    data-message-date={messageGroup.date}
                    className='w-full'
                  >
                    <ConversationMessageItem
                      message={isOwnMessage ? { ...message, local_status: 'sent' } : message}
                      isOwnMessage={isOwnMessage}
                      isGroup={isGroup}
                      conversationName={conversationName}
                      conversationAvatarUrl={conversationUser?.attributes.avatar_url || undefined}
                      isBot={isBotConversation}
                      disableActions={disableActions || isConversationClosed || !isLastMessage}
                      onActionClick={onActionClick}
                    />
                  </div>
                )
              })}
            </div>
          ))}

          {visibleOptimisticMessages.length > 0 && (
            <div data-date-group='Hoy' className='space-y-4'>
              <div className='flex items-center justify-center'>
                <span className='rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-0.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 shadow-xs'>
                  Hoy
                </span>
              </div>
              {[...visibleOptimisticMessages].map((message) => {
                const isLastMessage = message.id === lastMessageId
                return (
                  <div
                    key={message.id}
                    data-message-date={message.attributes.created_at?.slice(0, 10) || 'Hoy'}
                    className='w-full'
                  >
                    <ConversationMessageItem
                      message={message}
                      isOwnMessage
                      isGroup={isGroup}
                      conversationName={conversationName}
                      conversationAvatarUrl={conversationUser?.attributes.avatar_url || undefined}
                      isBot={isBotConversation}
                      disableActions={disableActions || isConversationClosed || !isLastMessage}
                      onActionClick={onActionClick}
                    />
                  </div>
                )
              })}
            </div>
          )}

          {/* Botón flotante para volver a los mensajes recientes */}
          {!isNearBottom && onScrollToBottom && (
            <div className='sticky bottom-2 z-30 flex justify-center pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200'>
              <button
                type='button'
                onClick={onScrollToBottom}
                className='pointer-events-auto relative flex size-9 items-center justify-center rounded-full border border-blue-500/20 bg-blue-600 text-white shadow-md transition-colors hover:bg-blue-700 active:scale-95 cursor-pointer'
                aria-label='Desplazar a mensajes recientes'
                title='Desplazar a mensajes recientes'
              >
                <ChevronsDown className='size-4' />
                {newMessagesCount > 0 && (
                  <span
                    className='absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white'
                    aria-label={`${newMessagesCount} mensajes nuevos`}
                  >
                    {newMessagesCount > 99 ? '99+' : newMessagesCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
