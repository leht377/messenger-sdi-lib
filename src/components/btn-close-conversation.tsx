'use client'

import React, { useState } from 'react'
import {
  Button,
  Badge,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  cn
} from '../ui'
import { CheckCircle2, Loader2, Lock } from 'lucide-react'
import type { Conversation } from '../types/conversation.types'
import { getConversationName } from '../utils/conversation.util'
import { useChatContext } from '../context/chat-context'
import { useCheckHasPermissionMessenger } from '../hooks/use-check-has-permission-messenger'

interface BtnCloseConversationProps extends Omit<React.ComponentProps<'button'>, 'onClick'> {
  conversation: Conversation
  isClosed?: boolean
  isClosing?: boolean
  onCloseConversation?: () => void
  showResolvedBadge?: boolean
  className?: string
}

export function BtnCloseConversation({
  conversation,
  isClosed = Boolean(conversation.attributes.closed_at),
  isClosing = false,
  onCloseConversation,
  showResolvedBadge = false,
  className,
  ...props
}: BtnCloseConversationProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const { currentUserId } = useChatContext()
  const hasProvideSupport = useCheckHasPermissionMessenger({
    permission: ['messenger_chat_support.provide_support']
  })
  const conversationName = getConversationName(conversation, currentUserId)

  if (isClosed && showResolvedBadge) {
    return (
      <div
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-lg border-none dark:border-neutral-700/80 bg-neutral-100/60 dark:bg-neutral-800/60 px-2.5 sm:px-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 select-none ',
          className
        )}
      >
        <CheckCircle2 className='size-3.5 text-emerald-500' />
        <span className='hidden sm:inline-block tracking-tight'>Resuelta</span>
      </div>
    )
  }

  if (isClosed && !showResolvedBadge) {
    return null
  }

  if (!hasProvideSupport) {
    return null
  }

  return (
    <>
      <button
        type='button'
        disabled={isClosing}
        onClick={() => setIsConfirmOpen(true)}
        title='Cerrar y marcar conversación como resuelta'
        aria-label='Cerrar conversación'
        className={cn(
          'group inline-flex h-8 items-center gap-1.5 rounded-lg border-none dark:border-neutral-700/80 bg-white dark:bg-neutral-800/90 px-2.5 sm:px-3 text-xs font-semibold text-neutral-700 dark:text-neutral-200 transition-all hover:border-emerald-300 dark:hover:border-emerald-700/70 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 dark:hover:text-emerald-300 active:scale-[0.98] cursor-pointer disabled:pointer-events-none disabled:opacity-50',
          className
        )}
        {...props}
      >
        {isClosing ? (
          <>
            <Loader2 className='size-3.5 animate-spin text-neutral-500' />
            <span className='hidden sm:inline-block tracking-tight'>Cerrando...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className='size-3.5 text-emerald-600 dark:text-emerald-400 transition-transform duration-200 group-hover:scale-110' />
            <span className='hidden sm:inline-block tracking-tight'>Cerrar chat</span>
          </>
        )}
      </button>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className='sm:max-w-md p-5'>
          <AlertDialogHeader className='gap-2'>
            <div className='flex items-center gap-2.5 text-amber-600 dark:text-amber-400'>
              <div className='flex size-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20'>
                <Lock className='size-4' />
              </div>
              <AlertDialogTitle className='text-sm font-bold text-neutral-900 dark:text-neutral-100'>
                ¿Cerrar conversación?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className='text-xs leading-relaxed text-neutral-500 dark:text-neutral-400'>
              ¿Estás seguro de que deseas marcar como resuelta y cerrar la conversación con{' '}
              <strong className='font-semibold text-neutral-900 dark:text-neutral-100'>
                {conversationName}
              </strong>
              ? Esta acción finalizará la atención en tiempo real.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='gap-2 sm:gap-0 mt-3'>
            <AlertDialogCancel disabled={isClosing} className='text-xs h-8 cursor-pointer'>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isClosing}
              onClick={() => {
                setIsConfirmOpen(false)
                onCloseConversation?.()
              }}
              className='text-xs ms-2 h-8 bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'
            >
              Sí, cerrar conversación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
