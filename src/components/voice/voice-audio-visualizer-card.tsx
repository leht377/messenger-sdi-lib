'use client'

import React from 'react'
import { Mic, MicOff } from 'lucide-react'
import { cn } from '../../ui'
import type { VoiceCallState, VoiceToolState } from '../../types/voice.types'
import { VoiceWaveformCanvas } from './voice-waveform-canvas'

export interface VoiceAudioVisualizerCardProps {
  callState: VoiceCallState
  statusText: string
  isMuted: boolean
  hasPermission: boolean | null
  analyserNode: AnalyserNode | null
  outputAnalyserNode?: AnalyserNode | null
  userRms: number
  botRms: number
  activeVUSegments: number
  activeTool: VoiceToolState | null
  onRequestMicrophone: () => void
}

export function VoiceAudioVisualizerCard({
  callState,
  statusText,
  isMuted,
  hasPermission,
  analyserNode,
  outputAnalyserNode = null,
  userRms,
  botRms,
  activeVUSegments,
  activeTool,
  onRequestMicrophone
}: VoiceAudioVisualizerCardProps) {
  const isBlocked = hasPermission === false
  const isSpeaking = callState === 'speaking'
  const isThinkingOrTool =
    callState === 'thinking' ||
    callState === 'escalating' ||
    callState === 'resolved' ||
    activeTool?.status === 'running'

  const primaryTitle = isBlocked
    ? 'Micrófono bloqueado'
    : isMuted
    ? 'Micrófono en silencio'
    : isSpeaking
    ? 'Asistente hablando...'
    : isThinkingOrTool
    ? 'Procesando solicitud...'
    : userRms > 0.08
    ? 'Escuchando tu voz...'
    : 'Te escucho...'

  const secondarySubtitle = isBlocked
    ? 'Permiso requerido'
    : isMuted
    ? 'Pulsa para reactivar'
    : isSpeaking || isThinkingOrTool
    ? statusText
    : userRms > 0.08
    ? 'Voz detectada en vivo'
    : 'Habla con naturalidad'

  return (
    <div className='mx-5 mt-3 rounded-2xl border border-neutral-200/80 bg-white p-3.5 shadow-2xs flex items-center justify-between gap-3'>
      {/* Lado Izquierdo: Solo Texto en Color Negro */}
      <div
        className={cn('flex flex-col max-w-[145px] sm:max-w-[175px] shrink-0', isBlocked && 'cursor-pointer')}
        onClick={isBlocked ? onRequestMicrophone : undefined}
        title={isBlocked ? 'Haz clic para permitir acceso al micrófono' : undefined}
      >
        <span className='text-sm font-bold truncate text-neutral-900'>
          {primaryTitle}
        </span>
        <span className='text-xs text-neutral-500 truncate'>{secondarySubtitle}</span>
      </div>

      {/* Centro: Visualizador Canvas reactivo al micrófono real / salida del bot */}
      <div className='flex-1 max-w-[180px] sm:max-w-[240px] h-10 flex items-center justify-center'>
        <VoiceWaveformCanvas
          state={callState}
          isMuted={isMuted}
          height={36}
          analyserNode={analyserNode}
          outputAnalyserNode={outputAnalyserNode}
          botRms={botRms}
          hasPermission={hasPermission}
        />
      </div>

      {/* Lado Derecho: Estado de Micrófono + Medidor VU */}
      <div className='flex flex-col items-end gap-1 shrink-0'>
        {isBlocked ? (
          <button
            type='button'
            onClick={onRequestMicrophone}
            title='Permiso de micrófono no otorgado. Haz clic para permitir'
            className='flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all cursor-pointer'
          >
            <MicOff className='size-3 text-amber-600' />
            <span>Sin permiso</span>
          </button>
        ) : (
          <div className='flex items-center gap-1 text-[11px] font-semibold text-emerald-600'>
            <Mic className='size-3' />
            <span>{isMuted ? 'Micrófono silenciado' : 'Micrófono activo'}</span>
          </div>
        )}

        <div className='flex items-center gap-0.5'>
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className={cn(
                'w-1.5 h-2.5 rounded-xs transition-colors duration-75',
                !isBlocked && !isMuted && i < activeVUSegments
                  ? 'bg-emerald-500'
                  : 'bg-neutral-200'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
