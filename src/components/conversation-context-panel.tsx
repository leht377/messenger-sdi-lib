'use client'

import React from 'react'
import {
  Avatar,
  Badge,
  Button,
  ScrollArea,
  Separator,
  cn
} from '../ui'
import { CalendarDays, Clock, Lock, CheckCircle2, User, Users, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Conversation } from '../types/conversation.types'
import {
  getConversationName,
  getConversationUser,
  isGroupConversation
} from '../utils/conversation.util'
import { useChatContext } from '../context/chat-context'

interface ConversationContextPanelProps {
  conversation: Conversation
  onClose?: () => void
  className?: string
}

export function ConversationContextPanel({
  conversation,
  onClose,
  className,
}: ConversationContextPanelProps) {
  const { currentUserId } = useChatContext()
  const isGroup = isGroupConversation(conversation)
  const conversationUser = getConversationUser(conversation, currentUserId)
  const isBot = Number(conversationUser?.attributes?.user_auth_id) === 0 || (conversation as any).type === 'bot'
  const conversationName = getConversationName(conversation, currentUserId)
  const participantCount = conversation.relationships?.users?.length || 0
  const isClosed = Boolean(conversation.attributes.closed_at)

  const formatSafeDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm')
    } catch {
      return dateStr
    }
  }

  return (
    <div
      className={cn(
        'sdi-messenger-root flex h-full w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs',
        className
      )}
    >
      {/* Cabecera del Panel */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 p-3 px-4 bg-white dark:bg-neutral-900">
        <div className="flex items-center gap-2">
          <User className="size-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
            Información de Contacto
          </h3>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className=" p-0 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {/* Contenido con ScrollArea */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-4 p-4">
            {/* Perfil del contacto o grupo */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-2">
                <Avatar
                  src={conversationUser?.attributes.avatar_url}
                  name={conversationName}
                  isGroup={isGroup}
                  isBot={isBot}
                  size="xl"
                  status={!isGroup && !isBot && conversationUser ? 'online' : undefined}
                />
              </div>

              <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{conversationName}</h4>
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {isGroup ? `${participantCount} participantes` : isBot ? 'Asistente virtual inteligente' : 'Conversación individual'}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <Badge variant={isBot ? "default" : "secondary"} className={cn("text-[10px]", isBot && "bg-violet-600 text-white")}>
                  {isGroup ? 'Grupo' : isBot ? 'Asistente IA' : 'Usuario'}
                </Badge>
                {isClosed ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1"
                  >
                    <Lock className="size-2.5" />
                    <span>Cerrada</span>
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1"
                  >
                    <CheckCircle2 className="size-2.5" />
                    <span>Activa</span>
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Información disponible de la conversación */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <User className="size-3.5 shrink-0" />
                <span className="truncate text-neutral-900 dark:text-neutral-100 font-medium">
                  {isGroup ? `${participantCount} participantes` : conversationName}
                </span>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <CalendarDays className="size-3.5 shrink-0" />
                <span className="text-neutral-800 dark:text-neutral-200">
                  Creada: {formatSafeDate(conversation.attributes.created_at)}
                </span>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <Clock className="size-3.5 shrink-0" />
                <span className="text-neutral-800 dark:text-neutral-200">
                  Actualizada: {formatSafeDate(conversation.attributes.updated_at)}
                </span>
              </div>

              {conversation.attributes.closed_at && (
                <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  <Lock className="size-3.5 shrink-0 text-amber-500" />
                  <span className="text-neutral-800 dark:text-neutral-200">
                    Cerrada: {formatSafeDate(conversation.attributes.closed_at)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
