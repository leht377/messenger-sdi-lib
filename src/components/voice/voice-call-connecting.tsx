'use client'

import React from 'react'
import { Loader2, PhoneOff } from 'lucide-react'
import { Avatar } from '../../ui'

export interface VoiceCallConnectingProps {
  statusText: string
  onCancel: () => void
}

export function VoiceCallConnecting({ statusText, onCancel }: VoiceCallConnectingProps) {
  return (
    <div className='flex flex-col flex-1'>
      <div className='flex flex-1 flex-col items-center justify-center text-center p-8 min-h-[300px]'>
        <div className='relative mb-5'>
          <Avatar name='Asistente SDi' isBot size='xl'/>
          <span className='absolute inset-0 rounded-full bg-blue-500/15 animate-ping' />
        </div>
        <div className='flex items-center gap-2 text-sm font-bold text-neutral-800'>
          <Loader2 className='size-4 animate-spin text-blue-600' />
          <span>{statusText || 'Conectando con el Asistente Virtual...'}</span>
        </div>
        <p className='text-xs text-neutral-400 mt-1 max-w-xs leading-relaxed'>
          Estableciendo canal telefónico interactivo full-duplex. El asistente te atenderá en unos segundos.
        </p>
      </div>

      <div className='px-5 py-4 bg-white border-t border-neutral-100 flex items-center justify-center'>
        <button
          type='button'
          onClick={onCancel}
          className='flex items-center gap-1.5 rounded-full bg-red-50 hover:bg-red-100 border border-red-100 px-5 py-2 text-xs font-semibold text-red-600 shadow-2xs cursor-pointer active:scale-95 transition-all'
        >
          <PhoneOff className='size-3.5' />
          <span>Cancelar llamada</span>
        </button>
      </div>
    </div>
  )
}
