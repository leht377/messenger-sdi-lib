'use client'

import React from 'react'
import { Avatar, cn } from '../ui'
import { CheckCheck, Clock, Download, FileText, Sparkles } from 'lucide-react'
import type { Message, MessageAttachment, MessageActionButton } from '../types/message.types'
import { capitalizeWords } from '../utils/conversation.util'

interface ConversationMessageItemProps {
  message: Message
  isOwnMessage: boolean
  isGroup: boolean
  conversationName: string
  conversationAvatarUrl?: string
  isBot?: boolean
  disableActions?: boolean
  onActionClick?: (action: MessageActionButton) => void
}

function formatMessageTime(dateStr?: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return ''
  }
}

export function ConversationMessageItem({
  message,
  isOwnMessage,
  isGroup,
  conversationName,
  conversationAvatarUrl,
  isBot = false,
  disableActions = false,
  onActionClick
}: ConversationMessageItemProps) {
  const isSenderBot =
    Boolean(isBot) ||
    Number(message.relationships?.sender?.attributes?.user_auth_id) === 0
  const actionButtons = message.attributes?.metadata?.action_buttons ?? []
  const senderName = capitalizeWords(message.relationships?.sender?.attributes?.name || conversationName)
  const senderAvatar = message.relationships?.sender?.attributes?.avatar_url || undefined
  const hoursAgo = formatMessageTime(message.attributes.created_at)
  const attachments = message.relationships?.attachments ?? []

  return (
    <div
      className={cn(
        'flex items-start gap-2 sm:gap-2.5 max-w-[90%] sm:max-w-[75%] min-w-0',
        isOwnMessage && 'ml-auto flex-row-reverse'
      )}
    >
      {isGroup && !isOwnMessage ? (
        <Avatar
          name={senderName}
          src={senderAvatar}
          isBot={isSenderBot}
          size='sm'
          className='mt-0.5 shrink-0'
        />
      ) : !isOwnMessage ? (
        <Avatar
          name={conversationName}
          src={conversationAvatarUrl}
          isBot={isSenderBot}
          size='sm'
          className='mt-0.5 shrink-0'
        />
      ) : null}
      <div className={cn('flex min-w-0 flex-col gap-1', isOwnMessage && 'items-end')}>
        <div className='flex items-center gap-1.5 min-w-0'>
          <span
            className={cn(
              'text-xs font-semibold truncate',
              isSenderBot && !isOwnMessage
                ? 'text-violet-700 dark:text-violet-300 font-bold'
                : 'text-neutral-800 dark:text-neutral-200'
            )}
          >
            {isOwnMessage ? 'Tú' : senderName}
          </span>
          {isSenderBot && !isOwnMessage && (
            <span className='inline-flex items-center gap-0.5 rounded-full bg-violet-100 dark:bg-violet-950/80 px-1.5 py-0.2 text-[9.5px] font-semibold text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/50 shadow-2xs'>
              <Sparkles className='size-2.5 text-violet-600 dark:text-violet-400' />
              <span>IA</span>
            </span>
          )}
        </div>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 shadow-xs text-xs sm:text-sm leading-relaxed break-words',
            isOwnMessage
              ? 'rounded-tr-xs bg-blue-600 text-white shadow-xs'
              : isSenderBot
                ? 'rounded-tl-xs bg-gradient-to-b from-violet-50/70 to-white dark:from-neutral-800/90 dark:to-neutral-900/90 text-neutral-900 dark:text-neutral-100 border border-violet-200/70 dark:border-violet-800/50 shadow-xs ring-1 ring-violet-500/10'
                : 'rounded-tl-xs bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200/80 dark:border-neutral-700/60 shadow-xs'
          )}
        >
          {attachments.map((attachment: MessageAttachment) => {
            const isImage = attachment.attributes.file_mime_type.startsWith('image/')

            return isImage ? (
              <a
                key={attachment.id}
                href={attachment.attributes.file_url}
                target='_blank'
                rel='noreferrer'
                className='mb-2 block overflow-hidden rounded-xl border border-black/10 dark:border-white/10'
              >
                <img
                  src={attachment.attributes.file_url}
                  alt={attachment.attributes.file_name}
                  className='max-h-64 max-w-full object-contain rounded-xl'
                  loading='lazy'
                />
              </a>
            ) : (
              <a
                key={attachment.id}
                href={attachment.attributes.file_url}
                target='_blank'
                rel='noreferrer'
                download={attachment.attributes.file_name}
                className='mb-2 flex items-center gap-2 rounded-lg border border-current/20 px-2.5 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors'
              >
                <FileText className='size-4 shrink-0' />
                <span className='min-w-0 flex-1 truncate font-medium'>{attachment.attributes.file_name}</span>
                <Download className='size-3.5 shrink-0' />
              </a>
            )
          })}
          {message.attributes.body && attachments.length === 0 && (
            <p className='whitespace-pre-wrap break-words'>{message.attributes.body}</p>
          )}
          {message.attributes.body && attachments.length > 0 && message.attributes.body !== 'Archivo adjunto' && (
            <p className='whitespace-pre-wrap break-words mt-1'>{message.attributes.body}</p>
          )}

          {/* Botones de acción del bot / IA */}
          {isSenderBot && !isOwnMessage && actionButtons.length > 0 && (
            <div className='mt-2.5 pt-2 border-t border-violet-200/60 dark:border-violet-800/40 flex flex-wrap gap-1.5'>
              {actionButtons.map((btn) => (
                <button
                  key={btn.id}
                  type='button'
                  disabled={disableActions}
                  onClick={() => {
                    if (!disableActions) {
                      onActionClick?.(btn)
                    }
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition-all',
                    disableActions
                      ? 'border-neutral-200 dark:border-neutral-700/50 bg-neutral-100/80 dark:bg-neutral-800/50 text-neutral-400 dark:text-neutral-500 cursor-not-allowed opacity-60'
                      : 'border-violet-200 dark:border-violet-700/60 bg-white/95 dark:bg-neutral-800/90 hover:bg-violet-600 hover:text-white dark:hover:bg-violet-600 dark:hover:text-white hover:border-violet-600 dark:hover:border-violet-600 text-violet-700 dark:text-violet-300 active:scale-95 cursor-pointer'
                  )}
                >
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>
          )}

          <div className='mt-1 flex items-center justify-end gap-1 text-[10px] leading-none'>
            <time
              dateTime={message.attributes.created_at}
              className={isOwnMessage ? 'text-blue-100' : 'text-neutral-500 dark:text-neutral-400'}
            >
              {hoursAgo}
            </time>
            {isOwnMessage && message.local_status === 'sending' && (
              <Clock
                className='size-3 text-blue-200 animate-spin'
                aria-label='Pendiente de envío'
              />
            )}
            {isOwnMessage && message.local_status === 'sent' && (
              <CheckCheck className='size-3 text-blue-200' aria-label='Enviado' />
            )}
            {isOwnMessage && message.local_status === 'error' && (
              <span className='text-red-200 font-medium'>No enviado</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
