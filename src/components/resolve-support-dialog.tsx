'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Textarea,
  cn
} from '../ui'
import { CheckCircle2, Loader2, Star, AlertCircle, SendHorizontal } from 'lucide-react'

export interface ResolveSupportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { rating: number; comment: string; helpful: boolean }) => Promise<void> | void
  isSubmitting?: boolean
  error?: string | null
}

const RATING_LABELS: Record<number, string> = {
  1: 'Muy insatisfecho',
  2: 'Insatisfecho',
  3: 'Neutral',
  4: 'Satisfecho',
  5: '¡Excelente atención!'
}

export function ResolveSupportDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  error = null
}: ResolveSupportDialogProps) {
  const [rating, setRating] = useState<number>(5)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [comment, setComment] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && !isSubmitting) {
      setRating(5)
      setHoveredRating(0)
      setComment('')
      setValidationError(null)
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (rating < 1 || rating > 5) {
      setValidationError('Por favor selecciona una calificación de 1 a 5 estrellas.')
      return
    }

    await onSubmit({
      rating,
      comment: comment.trim(),
      helpful: true
    })
  }

  const displayRating = hoveredRating || rating

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-md p-0 overflow-hidden'>
        <form onSubmit={handleSubmit} className='flex flex-col'>
          <DialogHeader className='p-4.5 pb-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0'>
            <div className='flex items-center gap-2.5'>
              <div className='flex size-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs text-white'>
                <CheckCircle2 className='size-5' />
              </div>
              <div>
                <DialogTitle className='text-sm font-bold text-white'>
                  ¡Nos alegra haberte ayudado!
                </DialogTitle>
                <DialogDescription className='text-[11px] text-emerald-100 mt-0.5'>
                  Califica la solución entregada por el asistente para finalizar el caso
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className='p-4 space-y-4 bg-white dark:bg-neutral-900'>
            {(validationError || error) && (
              <div className='flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/90 dark:bg-red-950/40 p-2.5 text-xs text-red-700 dark:text-red-300 shadow-2xs'>
                <AlertCircle className='size-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400' />
                <span className='leading-snug'>{validationError || error}</span>
              </div>
            )}

            {/* Selector de Estrellas (1 a 5) */}
            <div className='flex flex-col items-center justify-center rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 p-3.5 space-y-2'>
              <span className='text-xs font-semibold text-neutral-700 dark:text-neutral-200'>
                ¿Qué tan útil fue la solución?
              </span>

              <div
                className='flex items-center gap-1.5'
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
                        if (validationError) setValidationError(null)
                      }}
                      aria-label={`Calificar con ${starValue} ${starValue === 1 ? 'estrella' : 'estrellas'}`}
                      className='p-1 rounded-lg transition-transform hover:scale-110 active:scale-95 focus:outline-none cursor-pointer disabled:cursor-not-allowed'
                    >
                      <Star
                        className={cn(
                          'size-7 transition-colors',
                          isActive
                            ? 'fill-amber-400 text-amber-400 drop-shadow-2xs'
                            : 'fill-transparent text-neutral-300 dark:text-neutral-600'
                        )}
                      />
                    </button>
                  )
                })}
              </div>

              <span className='text-[11px] font-medium text-amber-600 dark:text-amber-400 min-h-4'>
                {RATING_LABELS[displayRating] || ''}
              </span>
            </div>

            {/* Comentarios */}
            <div className='space-y-1.5'>
              <label className='text-xs font-semibold text-neutral-800 dark:text-neutral-200'>
                Comentarios adicionales <span className='text-neutral-400 font-normal'>(opcional)</span>
              </label>
              <div className='relative rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 focus-within:bg-white dark:bg-neutral-900 dark:focus-within:bg-neutral-900 focus-within:border-emerald-500 transition-colors'>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder='Cuéntanos brevemente tu experiencia o algún comentario sobre la solución...'
                  rows={3}
                  maxLength={500}
                  disabled={isSubmitting}
                  className='min-h-20 w-full border-0 bg-transparent p-3 text-xs focus:ring-0 focus-visible:ring-0 shadow-none resize-none'
                />
                <div className='flex items-center justify-between px-3 pb-2 pt-1 border-t border-neutral-100 dark:border-neutral-800/60 text-[10px] text-neutral-400'>
                  <span>Tu opinión nos ayuda a mejorar</span>
                  <span className='font-mono'>{comment.length}/500</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className='p-3 bg-neutral-50/70 dark:bg-neutral-900/80 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-2'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
              className='text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer'
            >
              Cancelar
            </Button>
            <Button
              type='submit'
              variant='primary'
              size='sm'
              disabled={isSubmitting || rating < 1}
              className='gap-2 h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50'
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='size-3.5 animate-spin' />
                  <span>Finalizando...</span>
                </>
              ) : (
                <>
                  <span>Enviar y resolver</span>
                  <SendHorizontal className='size-3.5' />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ResolveSupportDialog

