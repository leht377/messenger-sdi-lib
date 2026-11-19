'use client'

import React, { useRef } from 'react'
import {
  Camera,
  ImagePlus,
  Loader2,
  Mic,
  MicOff,
  Minimize2,
  Monitor,
  PhoneOff,
  Send,
  ShieldCheck,
  WifiOff
} from 'lucide-react'
import { cn } from '../../ui'

export interface VoiceCallControlsProps {
  isMuted: boolean
  hasPermission: boolean | null
  userRms: number
  textInput: string
  isCapturingScreen?: boolean
  isSimulatingMicroCut?: boolean
  onTextInputChange: (val: string) => void
  onSendTextPrompt: (e: React.FormEvent) => void
  onCaptureScreen?: () => void
  onOpenCamera?: () => void
  onPhotoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onTriggerFileUpload?: () => void
  onSimulateMicroCut?: () => void
  onToggleMute?: () => void
  onHeroMicClick: () => void
  onRequestMicrophone?: () => void
  onMinimize: () => void
  onHangup: () => void
}

export function VoiceCallControls({
  isMuted,
  hasPermission,
  userRms,
  textInput,
  isCapturingScreen = false,
  isSimulatingMicroCut = false,
  onTextInputChange,
  onSendTextPrompt,
  onCaptureScreen,
  onOpenCamera,
  onPhotoUpload,
  onTriggerFileUpload,
  onSimulateMicroCut,
  onHeroMicClick,
  onMinimize,
  onHangup
}: VoiceCallControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isBlocked = hasPermission === false

  return (
    <div className='mt-6 flex flex-col bg-white shrink-0'>
      {/* Barra de Entrada Multimodal (Texto) */}
      <form
        onSubmit={onSendTextPrompt}
        className='mx-5 mb-2 flex items-center gap-1.5 rounded-2xl border border-neutral-200 bg-white px-2.5 py-2 shadow-2xs focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/15 transition-all'
      >
        <button
          type='button'
          onClick={() =>
            onTriggerFileUpload ? onTriggerFileUpload() : fileInputRef.current?.click()
          }
          title='Adjuntar imagen o foto desde tu equipo'
          aria-label='Adjuntar imagen'
          className='flex size-8 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-violet-600 transition-colors shrink-0 cursor-pointer'
        >
          <ImagePlus className='size-4' />
        </button>

        <button
          type='button'
          onClick={() =>
            onOpenCamera
              ? onOpenCamera()
              : onTriggerFileUpload
                ? onTriggerFileUpload()
                : fileInputRef.current?.click()
          }
          title='Tomar Foto con cámara (Snap-to-Diagnose)'
          aria-label='Tomar Foto'
          className='flex size-8 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-violet-600 transition-colors shrink-0 cursor-pointer'
        >
          <Camera className='size-4' />
        </button>

        <button
          type='button'
          onClick={onCaptureScreen}
          disabled={isCapturingScreen}
          title='Compartir Pantalla (Snap-to-Diagnose)'
          aria-label='Compartir Pantalla'
          className='flex size-8 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-violet-600 transition-colors shrink-0 cursor-pointer disabled:opacity-50'
        >
          {isCapturingScreen ? (
            <Loader2 className='size-4 animate-spin text-violet-600' />
          ) : (
            <Monitor className='size-4' />
          )}
        </button>

        {onSimulateMicroCut && (
          <button
            type='button'
            onClick={onSimulateMicroCut}
            disabled={isSimulatingMicroCut}
            title='Simular micro-corte de red (2s)'
            aria-label='Test Micro-corte'
            className={cn(
              'flex items-center gap-1 h-8 px-2 rounded-xl text-[11px] font-medium transition-colors shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
              isSimulatingMicroCut
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'text-neutral-500 hover:bg-amber-50 hover:text-amber-700'
            )}
          >
            <WifiOff className={cn('size-3.5', isSimulatingMicroCut && 'animate-pulse')} />
            <span>Micro-corte</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          className='hidden'
          onChange={onPhotoUpload}
        />

        <input
          type='text'
          value={textInput}
          onChange={(e) => onTextInputChange(e.target.value)}
          placeholder='Escribe tu mensaje o deja que el asistente te escuche...'
          className='flex-1 bg-transparent text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none min-w-0 px-1'
        />

        <button
          type='submit'
          disabled={!textInput.trim()}
          title='Enviar mensaje de texto al asistente'
          className='flex size-8 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-all shadow-xs shrink-0 cursor-pointer active:scale-95'
        >
          <Send className='size-3.5' />
        </button>
      </form>

      {/* Botonera Telefónica Plana y Minimalista (Minimizar | Micrófono | Finalizar) */}
      <div className='px-5 pt-2 pb-2 bg-white flex items-center justify-center gap-8 sm:gap-10'>
        {/* Botón Minimizar Llamada */}
        <div className='flex flex-col items-center gap-1.5 shrink-0'>
          <button
            type='button'
            onClick={onMinimize}
            title='Minimizar llamada'
            aria-label='Minimizar llamada'
            className='flex size-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer active:scale-95'
          >
            <Minimize2 className='size-4.5' />
          </button>
          <span className='text-[10px] font-medium leading-none text-neutral-400'>
            Minimizar
          </span>
        </div>

        {/* Botón Principal de Micrófono (Activo / Silenciado) */}
        <div className='flex flex-col items-center gap-1.5 shrink-0'>
          <button
            type='button'
            onClick={onHeroMicClick}
            title={
              isBlocked
                ? 'Permiso de micrófono no otorgado. Haz clic para solicitar permiso'
                : isMuted
                  ? 'Micrófono silenciado (clic para activar)'
                  : 'Micrófono activo (clic para silenciar)'
            }
            aria-label={isBlocked ? 'Sin permiso' : isMuted ? 'Micrófono silenciado' : 'Micrófono activo'}
            className={cn(
              'flex size-13 items-center justify-center rounded-full border transition-all cursor-pointer active:scale-95',
              isBlocked
                ? 'bg-neutral-100 text-amber-600 border-amber-200 hover:bg-neutral-200/60'
                : isMuted
                  ? 'bg-neutral-100 text-neutral-400 border-neutral-200 hover:bg-neutral-200/70 hover:text-neutral-600'
                  : userRms > 0.08
                    ? 'bg-neutral-900 text-white border-neutral-900 scale-[1.03]'
                    : 'bg-neutral-800 text-white border-neutral-800 hover:bg-neutral-900'
            )}
          >
            {isBlocked || isMuted ? <MicOff className='size-5.5' /> : <Mic className='size-5.5' />}
          </button>
          <span
            className={cn(
              'text-[10px] font-medium leading-none',
              isBlocked ? 'text-amber-600' : isMuted ? 'text-neutral-400' : 'text-neutral-600'
            )}
          >
            {isBlocked ? 'Sin permiso' : isMuted ? 'Silenciado' : 'Activo'}
          </span>
        </div>

        {/* Botón Finalizar / Colgar */}
        <div className='flex flex-col items-center gap-1.5 shrink-0'>
          <button
            type='button'
            onClick={onHangup}
            title='Finalizar llamada'
            aria-label='Finalizar llamada'
            className='flex size-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer active:scale-95'
          >
            <PhoneOff className='size-4.5' />
          </button>
          <span className='text-[10px] font-medium leading-none text-neutral-400'>
            Finalizar
          </span>
        </div>
      </div>

      {/* Pie de Seguridad */}
      <div className='pb-3.5 pt-0.5 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400 font-medium'>
        <ShieldCheck className='size-3.5 text-neutral-400' />
        <span>Conversación segura y encriptada</span>
      </div>
    </div>
  )
}
