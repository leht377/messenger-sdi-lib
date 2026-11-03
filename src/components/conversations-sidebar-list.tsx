'use client'

import React from 'react'
import { Avatar, Badge, Button, ScrollArea, Skeleton, Tabs, TabsList, TabsTrigger, cn } from '../ui'
import {
  Search,
  Inbox,
  Users,
  User,
  Bot,
  X,
  MessageSquarePlus,
  Lock,
  Loader2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Conversation } from '../types/conversation.types'
import {
  capitalizeWords,
  getConversationName,
  getConversationUser,
  isGroupConversation
} from '../utils/conversation.util'
import { useChatContext } from '../context/chat-context'
import { useCheckHasPermissionMessenger } from '../hooks/use-check-has-permission-messenger'
import { ConversationsUserFooter } from './conversations-user-footer'

export interface ConversationsSidebarListProps {
  conversations: Conversation[]
  selectedId: string
  onSelectConversation: (id: string) => void
  searchQuery: string
  onSearchChange: (val: string) => void
  closedFilter: '0' | '1'
  onClosedFilterChange: (val: '0' | '1') => void
  typeFilter: 'all' | 'direct' | 'group' | 'bot'
  onTypeFilterChange: (val: 'all' | 'direct' | 'group' | 'bot') => void
  onNewConversation?: () => void
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
}

const TYPE_OPTIONS = [
  { id: 'all', label: 'Todos', icon: null },
  { id: 'direct', label: 'Directos', icon: User },
  { id: 'group', label: 'Grupos', icon: Users },
  { id: 'bot', label: 'Bots', icon: Bot }
] as const

const ConversationItemSkeleton = () => (
  <div className='flex w-full min-w-0 items-center gap-2.5 rounded-xl p-3 border border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/40 dark:bg-neutral-800/20'>
    <Skeleton className='size-9.5 rounded-full shrink-0' />
    <div className='flex-1 min-w-0 space-y-2'>
      <div className='flex items-center justify-between gap-2'>
        <Skeleton className='h-3.5 w-28' />
        <Skeleton className='h-2.5 w-10' />
      </div>
      <div className='flex items-center justify-between gap-2'>
        <Skeleton className='h-2.5 w-36' />
        <Skeleton className='h-3.5 w-6 rounded-full' />
      </div>
    </div>
  </div>
)

const ConversationItem = ({
  conversation,
  selectedId,
  currentUserId,
  onSelectConversation
}: {
  conversation: Conversation
  selectedId: string
  currentUserId: string
  onSelectConversation: (id: string) => void
}) => {
  const isGroup = isGroupConversation(conversation)
  const userConversation = getConversationUser(conversation, currentUserId)
  const isBot =
    (conversation as any).type === 'bot' ||
    (conversation.attributes as any)?.type === 'bot' ||
    Number(userConversation?.attributes?.user_auth_id) === 0
  const isClosed = Boolean(conversation.attributes.closed_at)
  const conversationName = getConversationName(conversation, currentUserId)
  const participantCount = conversation.relationships?.users?.length || 0

  const conversationType = isGroup ? 'Grupo' : isBot ? 'Bot de Asistencia' : 'Conversación directa'

  let conversationDate = ''
  try {
    conversationDate = format(
      parseISO(conversation.attributes.updated_at || conversation.attributes.created_at),
      'dd/MM HH:mm'
    )
  } catch {
    conversationDate = ''
  }

  const isSelected = String(selectedId) === String(conversation.id)

  return (
    <div
      onClick={() => onSelectConversation(String(conversation.id))}
      aria-current={isSelected ? 'true' : undefined}
      className={cn(
        'group relative flex w-full min-w-0 cursor-pointer select-none flex-col gap-1.5 overflow-hidden rounded-xl p-3 transition-all',
        isSelected
          ? 'bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900'
          : 'hover:bg-neutral-100/80 dark:hover:bg-neutral-800/60 border border-transparent'
      )}
    >
      <div className='flex items-start gap-2.5 min-w-0'>
        <Avatar
          src={userConversation?.attributes.avatar_url}
          name={conversationName}
          isGroup={isGroup}
          isBot={isBot}
          size='md'
          className='shrink-0'
        />

        <div className='flex-1 min-w-0'>
          <div className='flex items-center justify-between gap-1'>
            <div className='flex items-center gap-1.5 min-w-0'>
              <h4 className='truncate text-xs font-bold text-neutral-900 dark:text-neutral-100'>
                {conversationName}
              </h4>
              {isBot && (
                <span className='inline-flex items-center gap-0.5 rounded-full bg-violet-100 dark:bg-violet-950/70 px-1 py-0.2 text-[9px] font-semibold text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/40 shrink-0 shadow-2xs'>
                  IA
                </span>
              )}
              {isGroup && (
                <span className='text-[10px] text-neutral-400 font-normal shrink-0'>
                  ({participantCount})
                </span>
              )}
            </div>

            <span className='shrink-0 text-[10px] text-neutral-400 font-mono'>
              {conversationDate}
            </span>
          </div>

          <div className='flex items-center justify-between gap-2 mt-1'>
            <div className='flex items-center gap-1.5 min-w-0'>
              <p className='truncate text-[11px] text-neutral-500 dark:text-neutral-400'>
                {conversationType}
              </p>
              {isClosed && (
                <Badge
                  variant='outline'
                  className='h-4 px-1 text-[9px] gap-0.5 border-amber-300 text-amber-700 dark:text-amber-400 font-medium'
                >
                  <Lock className='size-2' />
                  <span>Cerrado</span>
                </Badge>
              )}
            </div>

            {conversation.attributes.unread_count > 0 && (
              <Badge className='bg-blue-700'>{conversation.attributes.unread_count}</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ConversationsSidebarList({
  conversations,
  selectedId,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  closedFilter,
  onClosedFilterChange,
  typeFilter,
  onTypeFilterChange,
  onNewConversation,
  isLoading = false
}: ConversationsSidebarListProps) {
  const { currentUser, currentUserId, isLoadingUser, hasError, error } = useChatContext()
  const hasReadPermission = useCheckHasPermissionMessenger({
    permission: ['messenger_chat.read']
  })
  const isListLoading = isLoading || isLoadingUser

  return (
    <div className='sdi-messenger-root flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs'>
      {/* Cabecera de la Bandeja */}
      <div className='flex shrink-0 flex-col gap-2.5 border-b border-neutral-200 dark:border-neutral-800 p-3 bg-white dark:bg-neutral-900'>
        {/* Buscador */}
        <div className='group/search relative flex h-9 w-full items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 px-2.5 transition-all duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-neutral-900 focus-within:ring-2 focus-within:ring-blue-500/20'>
          <Search className='size-3.5 shrink-0 text-neutral-400 transition-colors group-focus-within/search:text-blue-600' />
          <input
            type='text'
            placeholder='Buscar por nombre...'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className='w-full bg-transparent text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none'
          />
          {searchQuery ? (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => onSearchChange('')}
              className='size-5 shrink-0 rounded-full p-0 text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer'
            >
              <X className='size-3' />
            </Button>
          ) : (
            <span className='hidden shrink-0 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 font-mono text-[9px] font-medium text-neutral-400 sm:inline-block'>
              Buscar
            </span>
          )}
        </div>

        {/* Filtro por Estado (0 = Activos, 1 = Cerrados) */}
        <Tabs
          value={closedFilter}
          onValueChange={(val) => onClosedFilterChange(val as '0' | '1')}
          className='w-full'
        >
          <TabsList className='h-8 w-full rounded-xl bg-neutral-100 dark:bg-neutral-800 p-0.5 text-xs'>
            <TabsTrigger value='0' className='text-[11px] font-medium'>
              Activos
            </TabsTrigger>
            <TabsTrigger value='1' className='text-[11px] font-medium'>
              Cerrados
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filtros Rápidos por Tipo */}
        <div className='flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none'>
          {TYPE_OPTIONS.map((opt) => {
            const isSelected = typeFilter === opt.id
            const Icon = opt.icon
            return (
              <button
                key={opt.id}
                type='button'
                onClick={() => onTypeFilterChange(opt.id as any)}
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-semibold'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-200 border border-transparent'
                )}
              >
                {Icon && <Icon className='size-3' />}
                <span>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista de Conversaciones */}
      <div className='flex-1 min-h-0 w-full overflow-hidden'>
        <ScrollArea className='h-full w-full'>
          <div className='space-y-1.5 p-1.5 w-full min-w-0'>
            {hasError ? (
              <div className='flex min-h-56 flex-col items-center justify-center p-6 text-center space-y-3'>
                <div className='size-12 rounded-2xl bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs'>
                  <AlertTriangle className='size-6' />
                </div>
                <div className='space-y-1 max-w-xs'>
                  <h4 className='text-xs font-bold text-neutral-900 dark:text-neutral-100'>
                    Error al cargar chats
                  </h4>
                  <p className='text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed'>
                    {error?.message || 'No se pudo conectar al servidor de mensajería.'}
                  </p>
                </div>
                <Button
                  type='button'
                  variant='primary'
                  size='sm'
                  onClick={() => window.location.reload()}
                  className='h-7.5 gap-1.5 px-3 text-xs font-semibold cursor-pointer'
                >
                  <RefreshCw className='size-3' />
                  <span>Reintentar</span>
                </Button>
              </div>
            ) : !hasReadPermission && !isLoadingUser ? (
              <div className='flex min-h-56 flex-col items-center justify-center p-6 text-center space-y-3'>
                <div className='size-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs'>
                  <Lock className='size-6' />
                </div>
                <div className='space-y-1 max-w-xs'>
                  <h4 className='text-xs font-bold text-neutral-900 dark:text-neutral-100'>
                    Sin permiso de lectura
                  </h4>
                  <p className='text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed'>
                    No tienes permisos para ver el listado de conversaciones.
                  </p>
                </div>
              </div>
            ) : isListLoading ? (
              <div className='space-y-1.5 p-1'>
                {Array.from({ length: 5 }).map((_, i) => (
                  <ConversationItemSkeleton key={i} />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className='flex min-h-56 flex-col items-center justify-center px-4 py-12 text-center'>
                <div className='mb-3 flex size-11 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400'>
                  <Inbox className='size-5 stroke-[1.5]' />
                </div>
                <p className='text-xs font-semibold text-neutral-900 dark:text-neutral-100'>
                  {searchQuery
                    ? 'No se encontraron resultados'
                    : closedFilter === '1'
                      ? 'No hay conversaciones cerradas'
                      : 'No hay conversaciones activas'}
                </p>
                <p className='mt-1 max-w-48 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400'>
                  {searchQuery
                    ? 'Intenta con otro término de búsqueda o cambia los filtros.'
                    : 'Las conversaciones iniciadas aparecerán aquí.'}
                </p>
                {closedFilter !== '0' && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => onClosedFilterChange('0')}
                    className='mt-3 text-[11px] h-7 text-blue-600 dark:text-blue-400 cursor-pointer'
                  >
                    Ver activas
                  </Button>
                )}
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  conversation={conv}
                  selectedId={selectedId}
                  currentUserId={currentUserId}
                  key={conv.id}
                  onSelectConversation={onSelectConversation}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer: Perfil de Usuario y Botón Nuevo Chat */}
      <ConversationsUserFooter onNewConversation={onNewConversation} />
    </div>
  )
}
