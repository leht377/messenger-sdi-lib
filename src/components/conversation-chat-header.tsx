'use client'

import React from 'react'
import {
  Avatar,
  Badge,
  Button,
  cn
} from '../ui'
import { Info, ArrowLeft, Lock, Sparkles } from 'lucide-react'
import type { Conversation } from '../types/conversation.types'
import {
  getConversationName,
  getConversationUser,
  isGroupConversation,
  isUserBot,
  isConversationBot
} from '../utils/conversation.util'
import { BtnCloseConversation } from './btn-close-conversation'
import { useChatContext } from '../context/chat-context'

export interface ConversationChatHeaderRenderOptions {
  customHeaderButtons?: React.ReactNode
}

export type ConversationRenderOptions = ConversationChatHeaderRenderOptions

export interface ConversationChatHeaderProps {
  conversation: Conversation
  isClosed: boolean
  isClosing?: boolean
  onCloseConversation: () => void
  isContextPanelOpen?: boolean
  onToggleContextPanel?: () => void
  onBack?: () => void
  alwaysShowBackButton?: boolean
  renderOptions?: ConversationChatHeaderRenderOptions
}

export function ConversationChatHeader({
  conversation,
  isClosed,
  isClosing = false,
  onCloseConversation,
  isContextPanelOpen = true,
  onToggleContextPanel,
  onBack,
  alwaysShowBackButton = false,
  renderOptions,
}: ConversationChatHeaderProps) {
  const { currentUserId } = useChatContext()
  const isGroup = isGroupConversation(conversation)
  const conversationName = getConversationName(conversation, currentUserId)
  const conversationUser = getConversationUser(conversation, currentUserId)
  const isBot = isConversationBot(conversation, currentUserId) || isUserBot(conversationUser)

  return (
    <div className='flex shrink-0 items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 p-2 sm:p-3 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xs min-w-0'>
      {/* Información del Cliente */}
      <div className='flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 overflow-hidden'>
        {onBack && (
          <Button
            variant='ghost'
            size='sm'
            onClick={onBack}
            title='Volver a la lista de chats'
            aria-label='Volver a la lista de chats'
            className={cn(
              'size-8 p-0 shrink-0 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 cursor-pointer',
              alwaysShowBackButton ? 'flex' : 'flex md:hidden'
            )}
          >
            <ArrowLeft className='size-4' />
          </Button>
        )}

        <Avatar
          src={conversationUser?.attributes.avatar_url}
          name={conversationName}
          isGroup={isGroup}
          isBot={isBot}
          size='md'
          className='shrink-0'
        />

        <div className='min-w-0 flex-1 overflow-hidden'>
          <div className='flex items-center gap-1.5 min-w-0'>
            <h3
              className='truncate text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 min-w-0'
              title={conversationName}
            >
              {conversationName}
            </h3>
            {isBot && (
              <span className='inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-950/70 px-1.5 py-0.2 text-[9.5px] font-semibold text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/40 shrink-0 shadow-2xs'>
                <Sparkles className='size-2.5 text-violet-600 dark:text-violet-400' />
                <span>Asistente IA</span>
              </span>
            )}
            {isClosed && (
              <Badge
                variant='destructive'
                className='inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium shrink-0 py-0 h-4.5 px-1.5'
              >
                <Lock className='size-2.5' />
                <span>Cerrada</span>
              </Badge>
            )}
          </div>

          <div className='flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 min-w-0'>
            <span className='truncate'>
              {isGroup
                ? `${conversation.relationships?.users?.length || 0} participantes`
                : isBot
                ? 'Asistente virtual automatizado'
                : 'Conversación individual'}
            </span>
          </div>
        </div>
      </div>

      {/* Acciones Rápidas del Agente */}
      <div className='flex items-center gap-1 shrink-0'>
        {renderOptions?.customHeaderButtons !== undefined ? (
          renderOptions.customHeaderButtons
        ) : (
          <BtnCloseConversation
            conversation={conversation}
            isClosed={isClosed}
            isClosing={isClosing}
            onCloseConversation={onCloseConversation}
            showResolvedBadge={false}
          />
        )}

        {onToggleContextPanel && (
          <Button
            variant='outline'
            size='icon'
            onClick={onToggleContextPanel}
            className={cn(
              'size-8 p-0',
              isContextPanelOpen
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                : ''
            )}
          >
            <Info className='size-4' />
          </Button>
        )}
      </div>
    </div>
  )
}
