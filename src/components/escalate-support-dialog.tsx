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
  Textarea
} from '../ui'
import { Headset, Loader2, SendHorizontal, AlertCircle } from 'lucide-react'

export interface EscalateSupportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (reason: string) => Promise<void> | void
  isSubmitting?: boolean
  error?: string | null
}

export function EscalateSupportDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  error = null
}: EscalateSupportDialogProps) {
  const [reason, setReason] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && !isSubmitting) {
      setReason('')
      setValidationError(null)
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    const trimmed = reason.trim()
    if (!trimmed) {
      setValidationError('Por favor describe el motivo de tu solicitud.')
      return
    }

    if (trimmed.length < 5) {
      setValidationError('Por favor ingresa al menos 5 caracteres para mayor claridad.')
      return
    }

    await onSubmit(trimmed)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-md p-0 overflow-hidden'>
        <form onSubmit={handleSubmit} className='flex flex-col'>
          <DialogHeader className='p-4.5 pb-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0'>
            <div className='flex items-center gap-2.5'>
              <div className='flex size-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs text-white'>
                <Headset className='size-5' />
              </div>
              <div>
                <DialogTitle className='text-sm font-bold text-white'>
                  Hablar con un técnico
                </DialogTitle>
                <DialogDescription className='text-[11px] text-blue-100 mt-0.5'>
                  Indica el motivo por el cual requieres asistencia especializada
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className='p-4 space-y-3 bg-white dark:bg-neutral-900'>
            {(validationError || error) && (
              <div className='flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/90 dark:bg-red-950/40 p-2.5 text-xs text-red-700 dark:text-red-300 shadow-2xs'>
                <AlertCircle className='size-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400' />
                <span className='leading-snug'>{validationError || error}</span>
              </div>
            )}

            <div className='space-y-1.5'>
              <label className='text-xs font-semibold text-neutral-800 dark:text-neutral-200'>
                Motivo de la solicitud <span className='text-red-500'>*</span>
              </label>
              <div className='relative rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 focus-within:bg-white dark:bg-neutral-900 dark:focus-within:bg-neutral-900 focus-within:border-blue-500 transition-colors'>
                <Textarea
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value)
                    if (validationError) setValidationError(null)
                  }}
                  placeholder='Ej: Necesito ayuda especializada con la configuración del terminal o reporte de error que el bot no resolvió...'
                  rows={4}
                  maxLength={500}
                  disabled={isSubmitting}
                  className='min-h-24 w-full border-0 bg-transparent p-3 text-xs focus:ring-0 focus-visible:ring-0 shadow-none resize-none'
                />
                <div className='flex items-center justify-between px-3 pb-2 pt-1 border-t border-neutral-100 dark:border-neutral-800/60 text-[10px] text-neutral-400'>
                  <span>Sé lo más específico posible</span>
                  <span className='font-mono'>{reason.length}/500</span>
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
              disabled={isSubmitting || !reason.trim()}
              className='gap-2 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50'
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='size-3.5 animate-spin' />
                  <span>Escalando...</span>
                </>
              ) : (
                <>
                  <span>Solicitar técnico</span>
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

export default EscalateSupportDialog
