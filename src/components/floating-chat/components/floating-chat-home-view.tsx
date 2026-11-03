'use client'

import React from 'react'
import { LifeBuoy, MessagesSquare, ChevronRight, ShieldCheck, X, Loader2 } from 'lucide-react'
import { Button } from '../../../ui'
import { ConversationsUserFooter } from '../../conversations-user-footer'
import { LIB_VERSION } from '../../../utils/version'

interface FloatingChatHomeViewProps {
  title: string
  canRequestSupport: boolean
  canViewChatList: boolean
  supportWithBot?: boolean
  isStartingBot?: boolean
  totalUnreadCount: number
  conversationsCount: number
  onRequestSupport: () => void
  onViewChatList: () => void
  onClose: () => void
  onNewConversation: () => void
  onDragStart: (e: React.PointerEvent) => void
}

export function FloatingChatHomeView({
  title,
  canRequestSupport,
  canViewChatList,
  supportWithBot = true,
  isStartingBot = false,
  totalUnreadCount,
  conversationsCount,
  onRequestSupport,
  onViewChatList,
  onClose,
  onNewConversation,
  onDragStart
}: FloatingChatHomeViewProps) {
  return (
    <div className='flex h-full w-full flex-col bg-white dark:bg-neutral-900'>
      {/* Cabecera del Home - Arrastrable */}
      <div
        onPointerDown={onDragStart}
        className='relative shrink-0 overflow-hidden bg-blue-600 px-4.5 py-6 text-white cursor-grab active:cursor-grabbing touch-none select-none'
      >
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <div className='flex size-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md'>
              <LifeBuoy className='size-5 text-white' />
            </div>
            <div>
              <h3 className='text-sm font-bold leading-none text-white'>{title}</h3>
              <p className='text-[11px] text-blue-100 mt-1 flex items-center gap-1.5'>
                <span className='size-2 rounded-full bg-emerald-400 animate-pulse' />
                Soporte técnico SDI
              </p>
            </div>
          </div>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onClose}
            className='size-7 rounded-full p-0 text-white/80 hover:bg-white/15 hover:text-white cursor-pointer'
          >
            <X className='size-4' />
          </Button>
        </div>

        <div className='mt-4'>
          <p className='text-xs font-semibold text-white'>¿En qué podemos ayudarte hoy?</p>
          <p className='text-[11px] text-blue-100/90 mt-0.5'>
            Selecciona una opción para iniciar asistencia o revisar tu historial.
          </p>
        </div>
      </div>

      {/* Opciones de Entrada */}
      <div className='flex-1 min-h-0 overflow-y-auto p-4 space-y-3'>
        {canRequestSupport && (
          <button
            type='button'
            onClick={onRequestSupport}
            disabled={isStartingBot}
            className='group flex w-full items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 p-3.5 text-left shadow-xs transition-all hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-neutral-800 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
          >
            <div className='flex items-center gap-3'>
              <div className='flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-colors group-hover:bg-blue-600 group-hover:text-white'>
                {isStartingBot ? (
                  <Loader2 className='size-5 animate-spin' />
                ) : (
                  <LifeBuoy className='size-5' />
                )}
              </div>
              <div>
                <h4 className='text-xs font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'>
                  Solicitar Asistencia
                </h4>
                <p className='text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5'>
                  {isStartingBot
                    ? 'Iniciando conversación...'
                    : supportWithBot
                    ? 'Inicia atención inmediata con nuestro asistente'
                    : 'Ingresa asunto y mensaje para iniciar soporte'}
                </p>
              </div>
            </div>
            <ChevronRight className='size-4 text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors' />
          </button>
        )}

        {canViewChatList && (
          <button
            type='button'
            onClick={onViewChatList}
            className='group flex w-full items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 p-3.5 text-left shadow-xs transition-all hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-neutral-800 cursor-pointer'
          >
            <div className='flex items-center gap-3'>
              <div className='relative flex size-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors group-hover:bg-blue-600 group-hover:text-white'>
                <MessagesSquare className='size-5' />
                {totalUnreadCount > 0 && (
                  <span className='absolute -top-1 -right-1 size-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-neutral-900' />
                )}
              </div>
              <div>
                <div className='flex items-center gap-1.5'>
                  <h4 className='text-xs font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'>
                    Ver mis chats
                  </h4>
                  {totalUnreadCount > 0 ? (
                    <span className='rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs animate-pulse'>
                      {totalUnreadCount > 99 ? '99+' : totalUnreadCount}{' '}
                      {totalUnreadCount === 1 ? 'sin leer' : 'sin leer'}
                    </span>
                  ) : conversationsCount > 0 ? (
                    <span className='rounded-full bg-blue-500/10 dark:bg-blue-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-blue-600 dark:text-blue-400'>
                      {conversationsCount}
                    </span>
                  ) : null}
                </div>
                <p className='text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5'>
                  Revisa tus conversaciones y requerimientos
                </p>
              </div>
            </div>
            <ChevronRight className='size-4 text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors' />
          </button>
        )}

        <div className='rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-800/30 p-3 mt-4 text-[11px] text-neutral-500 dark:text-neutral-400 space-y-1.5'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-1.5 font-semibold text-neutral-800 dark:text-neutral-200 text-xs'>
              <ShieldCheck className='size-3.5 text-emerald-600' />
              <span>Mesa de Ayuda SDI</span>
            </div>
            <span className='text-[10px] font-mono text-neutral-400 dark:text-neutral-500'>
              v{LIB_VERSION}
            </span>
          </div>
          <p className='leading-relaxed'>
            Tus solicitudes quedan registradas con trazabilidad y número de ticket en la plataforma
            de Helpdesk.
          </p>
        </div>
      </div>

      {/* Footer con usuario autenticado */}
      <ConversationsUserFooter onNewConversation={onNewConversation} />
    </div>
  )
}
