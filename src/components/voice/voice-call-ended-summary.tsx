'use client'

import React, { useState } from 'react'
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  SendHorizontal,
  Star,
  ThumbsDown,
  ThumbsUp,
  Ticket
} from 'lucide-react'
import { Button, cn, Textarea } from '../../ui'
import { toast } from 'sonner'
import { useResolveChatSupport } from '../../hooks/api/use-resolve-chat-support'
import {
  getAllConversationSessions,
  getConversationSessionId,
  getStoredConversationSession,
  removeConversationSessionId
} from '../../utils/session-storage.util'
import type { VoiceCallContextBadges } from '../../types/voice.types'

export interface VoiceCallEndedSummaryProps {
  formattedDuration: string
  transcriptsCount: number
  outcomeType: string
  contextBadges: VoiceCallContextBadges
  sessionId?: string
  conversationId?: string | number
  onClose: (wasResolved?: boolean) => void
  onSubmitRating?: (data: {
    rating: number
    comment: string
    helpful: boolean
  }) => Promise<void> | void
}

const RATING_LABELS: Record<number, string> = {
  1: 'Muy insatisfecho',
  2: 'Insatisfecho',
  3: 'Neutral',
  4: 'Satisfecho',
  5: '¡Excelente atención!'
}

export function VoiceCallEndedSummary({
  formattedDuration,
  transcriptsCount,
  outcomeType,
  contextBadges,
  sessionId,
  conversationId,
  onClose,
  onSubmitRating
}: VoiceCallEndedSummaryProps) {
  const isEscalated = outcomeType.startsWith('escalated')
  const isResolved = outcomeType === 'resolved'

  const [rating, setRating] = useState<number>(5)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [helpful, setHelpful] = useState<boolean>(true)
  const [comment, setComment] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    mutateAsync: resolveSupport,
    isLoading: isSubmittingDefault,
    error: submitError
  } = useResolveChatSupport()

  const [isCustomSubmitting, setIsCustomSubmitting] = useState(false)
  const isSubmitting = isSubmittingDefault || isCustomSubmitting

  const displayRating = hoveredRating || rating

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    setErrorMessage(null)

    if (rating < 1 || rating > 5) {
      setValidationError('Por favor selecciona una calificación de 1 a 5 estrellas.')
      return
    }

    // Prioridad: session_id almacenado en el storage 'sdi_messenger_conversation_sessions'
    const storedFromStorage =
      (conversationId ? getConversationSessionId(conversationId) : null) ||
      getStoredConversationSession(conversationId) ||
      (sessionId ? getConversationSessionId(sessionId) : null)

    const targetSessionId =
      storedFromStorage ||
      sessionId ||
      contextBadges?.sessionId ||
      (conversationId ? String(conversationId) : 'voice-session')

    try {
      if (onSubmitRating) {
        setIsCustomSubmitting(true)
        await onSubmitRating({
          rating,
          comment: comment.trim(),
          helpful
        })
      } else {
        const response = await resolveSupport({
          session_id: targetSessionId,
          helpful,
          comment: comment.trim(),
          rating
        })

        if (conversationId) {
          removeConversationSessionId(conversationId)
        }
        if (storedFromStorage) {
          const map = getAllConversationSessions()
          for (const [convKey, sessVal] of Object.entries(map)) {
            if (sessVal === storedFromStorage) {
              removeConversationSessionId(convKey)
            }
          }
        }

        toast.success(
          response?.message || '¡Gracias por tu calificación! La atención ha sido marcada como resuelta.',
          response?.ticket
            ? { description: `Ticket #${response.ticket.number || response.ticket.id}` }
            : undefined
        )
      }

      setIsSubmitted(true)
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Error al registrar la calificación de la atención'
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setIsCustomSubmitting(false)
    }
  }

  // Si ya se envió la calificación, mostramos la pantalla de confirmación y agradecimiento
  if (isSubmitted) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center text-center p-6 sm:p-8 min-h-[380px] animate-in fade-in zoom-in-95 duration-200'>
        <div className='relative mb-4'>
          <div className='flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-md'>
            <CheckCircle2 className='size-8 text-emerald-600' />
          </div>
          <span className='absolute inset-0 rounded-full bg-emerald-500/15 animate-ping' />
        </div>

        <h3 className='text-lg font-bold text-neutral-900 dark:text-neutral-100'>
          ¡Gracias por tu calificación!
        </h3>
        <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm leading-relaxed'>
          Tu retroalimentación ha sido enviada exitosamente. La atención ha quedado registrada y resuelta en el sistema.
        </p>

        {/* Resumen de estrellas asignadas */}
        <div className='mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 shadow-2xs'>
          <div className='flex items-center gap-1'>
            {[1, 2, 3, 4, 5].map((starVal) => (
              <Star
                key={starVal}
                className={cn(
                  'size-4',
                  starVal <= rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-transparent text-neutral-300 dark:text-neutral-600'
                )}
              />
            ))}
          </div>
          <span className='ml-1 text-amber-600 dark:text-amber-400 font-medium'>
            {RATING_LABELS[rating]}
          </span>
        </div>

        <div className='mt-6'>
          <Button
            type='button'
            variant='primary'
            onClick={() => onClose(true)}
            className='h-10 px-6 text-xs sm:text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer'
          >
            Aceptar y cerrar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-1 flex-col text-center p-4 sm:p-6 max-h-[calc(90vh-70px)] overflow-y-auto animate-in fade-in zoom-in-95 duration-200'>
      <div className='flex flex-col items-center'>
        <div className='relative mb-2.5'>
          <div className='flex size-12 sm:size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs'>
            <CheckCircle2 className='size-6 sm:size-7 text-emerald-600' />
          </div>
        </div>

        <h3 className='text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100'>
          Llamada finalizada
        </h3>
        <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-sm leading-relaxed'>
          {isEscalated
            ? 'Tu caso ha sido escalado con un especialista. La transcripción y el ticket han quedado registrados.'
            : isResolved
            ? '¡Caso resuelto con éxito! Por favor califica la atención recibida.'
            : 'Gracias por comunicarte. Por favor califica la atención brindada por el asistente.'}
        </p>

        {/* Resumen de Métricas de la Llamada */}
        <div className='mt-3 flex items-center justify-center gap-2 flex-wrap max-w-sm'>
          <div className='flex items-center gap-1.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-800/60 px-2.5 py-1 text-xs text-neutral-700 dark:text-neutral-200 shadow-2xs font-medium'>
            <Clock className='size-3.5 text-neutral-500' />
            <span>
              Duración: <strong className='font-mono text-neutral-900 dark:text-neutral-100'>{formattedDuration}</strong>
            </span>
          </div>

          <div className='flex items-center gap-1.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-800/60 px-2.5 py-1 text-xs text-neutral-700 dark:text-neutral-200 shadow-2xs font-medium'>
            <Bot className='size-3.5 text-violet-600 dark:text-violet-400' />
            <span>
              <strong className='text-neutral-900 dark:text-neutral-100'>{transcriptsCount}</strong> intervenciones
            </span>
          </div>

          {contextBadges.ticketNumber && (
            <div className='flex items-center gap-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/40 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-300 shadow-2xs font-medium'>
              <Ticket className='size-3.5 text-amber-600' />
              <span>
                Ticket <strong className='text-amber-800 dark:text-amber-200'>#{contextBadges.ticketNumber}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Formulario de Calificación */}
      <form onSubmit={handleSubmit} className='mt-4 sm:mt-5 flex flex-col text-left space-y-3.5 max-w-md mx-auto w-full'>
        {(validationError || errorMessage || submitError) && (
          <div className='flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/90 dark:bg-red-950/40 p-2.5 text-xs text-red-700 dark:text-red-300 shadow-2xs'>
            <AlertCircle className='size-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400' />
            <span className='leading-snug'>
              {validationError ||
                errorMessage ||
                (submitError as any)?.response?.data?.message ||
                (submitError as any)?.message}
            </span>
          </div>
        )}

        {/* Selector de Estrellas (1 a 5) */}
        <div className='flex flex-col items-center justify-center rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 p-3.5 space-y-2 text-center'>
          <span className='text-xs font-semibold text-neutral-800 dark:text-neutral-200'>
            ¿Qué tan útil fue la atención recibida?
          </span>

          <div
            className='flex items-center gap-2'
            onMouseLeave={() => setHoveredRating(0)}
          >
            {[1, 2, 3, 4, 5].map((starValue) => {
              const isActive = starValue <= displayRating
              return (
                <button
                  key={starValue}
                  type='button'
                  disabled={isSubmitting}
                  onMouseEnter={() => setHoveredRating(starValue)}
                  onClick={() => {
                    setRating(starValue)
                    if (starValue <= 2) {
                      setHelpful(false)
                    } else {
                      setHelpful(true)
                    }
                    if (validationError) setValidationError(null)
                  }}
                  aria-label={`Calificar con ${starValue} ${starValue === 1 ? 'estrella' : 'estrellas'}`}
                  className='p-1 rounded-lg transition-transform hover:scale-115 active:scale-95 focus:outline-none cursor-pointer disabled:cursor-not-allowed'
                >
                  <Star
                    className={cn(
                      'size-7 sm:size-8 transition-colors',
                      isActive
                        ? 'fill-amber-400 text-amber-400 drop-shadow-2xs'
                        : 'fill-transparent text-neutral-300 dark:text-neutral-600 hover:text-amber-300'
                    )}
                  />
                </button>
              )
            })}
          </div>

          <span className='text-xs font-medium text-amber-600 dark:text-amber-400 min-h-4'>
            {RATING_LABELS[displayRating] || ''}
          </span>

          {/* Toggle de utilidad rápida */}
          <div className='pt-1 flex items-center justify-center gap-2'>
            <button
              type='button'
              disabled={isSubmitting}
              onClick={() => setHelpful(true)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer',
                helpful
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-emerald-500'
              )}
            >
              <ThumbsUp className='size-3.5' />
              <span>Resolvió mi duda</span>
            </button>

            <button
              type='button'
              disabled={isSubmitting}
              onClick={() => setHelpful(false)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer',
                !helpful
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-amber-500'
              )}
            >
              <ThumbsDown className='size-3.5' />
              <span>No resolvió</span>
            </button>
          </div>
        </div>

        {/* Comentarios Adicionales */}
        <div className='space-y-1.5'>
          <label className='text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-between'>
            <span>Comentarios adicionales <span className='text-neutral-400 font-normal'>(opcional)</span></span>
            <span className='text-[10px] text-neutral-400 font-mono'>{comment.length}/500</span>
          </label>
          <div className='relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 focus-within:bg-white dark:bg-neutral-900/60 dark:focus-within:bg-neutral-900 focus-within:border-emerald-500 transition-colors'>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder='Cuéntanos brevemente tu experiencia o detalles que podamos mejorar...'
              rows={2}
              maxLength={500}
              disabled={isSubmitting}
              className='min-h-16 w-full border-0 bg-transparent p-3 text-xs focus:ring-0 focus-visible:ring-0 shadow-none resize-none'
            />
          </div>
        </div>

        {/* Botones de Acción */}
        <div className='pt-1.5 flex items-center justify-end gap-2.5'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => onClose(false)}
            disabled={isSubmitting}
            className='text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer'
          >
            Omitir
          </Button>

          <Button
            type='submit'
            variant='primary'
            size='sm'
            disabled={isSubmitting || rating < 1}
            className='gap-2 h-9 px-4.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50'
          >
            {isSubmitting ? (
              <>
                <Loader2 className='size-3.5 animate-spin' />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <span>Enviar calificación</span>
                <SendHorizontal className='size-3.5' />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
