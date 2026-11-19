'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Camera,
  FlipHorizontal2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Send,
  SwitchCamera,
  Upload,
  X
} from 'lucide-react'
import { cn, Dialog, DialogContent } from '../../ui'
import { useVoiceCall } from '../../hooks/use-voice-call'
import type { VoiceCallEndResult } from '../../types/voice.types'
import { VoiceCallHeader } from './voice-call-header'
import { VoiceAudioVisualizerCard } from './voice-audio-visualizer-card'
import { VoiceTranscriptList } from './voice-transcript-list'
import { VoiceCallControls } from './voice-call-controls'
import { VoiceCallConnecting } from './voice-call-connecting'
import { VoiceCallEndedSummary } from './voice-call-ended-summary'
import { VoiceMinimizedIsland } from './voice-minimized-island'

interface CapturedCameraShot {
  dataUrl: string
  sizeKb: number
}

interface VoiceCameraPreviewProps {
  stream: MediaStream | null
  cameraError?: string | null
  facingMode: 'environment' | 'user'
  onCapturePreview: (videoEl: HTMLVideoElement | null) => CapturedCameraShot | null
  onSendCaptured: (dataUrl: string) => void
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSwitchCamera?: () => void
  onRetryCamera?: () => void
  onCancel: () => void
}

const focusRingClass =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400'

function VoiceCameraPreview({
  stream,
  cameraError,
  facingMode,
  onCapturePreview,
  onSendCaptured,
  onPhotoUpload,
  onSwitchCamera,
  onRetryCamera,
  onCancel
}: VoiceCameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const shutterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isMirrored, setIsMirrored] = useState(false)
  const [showShutterFlash, setShowShutterFlash] = useState(false)
  const [capturedShot, setCapturedShot] = useState<CapturedCameraShot | null>(null)

  const hasLiveStream = Boolean(stream) && !cameraError

  useEffect(() => {
    setCapturedShot(null)
  }, [stream])

  useEffect(() => {
    return () => {
      if (shutterTimerRef.current) clearTimeout(shutterTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl || !hasLiveStream || capturedShot) return
    videoEl.srcObject = stream
    void videoEl.play().catch(() => {})
    return () => {
      videoEl.srcObject = null
    }
  }, [stream, hasLiveStream, capturedShot])

  const handleShutterCapture = () => {
    const shot = onCapturePreview(videoRef.current)
    if (!shot) return
    setShowShutterFlash(true)
    if (shutterTimerRef.current) clearTimeout(shutterTimerRef.current)
    shutterTimerRef.current = setTimeout(() => {
      setShowShutterFlash(false)
      setCapturedShot(shot)
    }, 120)
  }

  return (
    <div className='mx-5 mt-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-3 shadow-xl animate-in fade-in zoom-in-95 duration-200'>
      {/* Barra superior del visor */}
      <div className='flex items-center justify-between gap-2 mb-2.5'>
        <div className='flex items-center gap-2 min-w-0 flex-1'>
          {capturedShot ? (
            <span className='inline-flex items-center gap-1 rounded-full bg-violet-500/20 border border-violet-400/30 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-violet-200 shrink-0'>
              <span>VISTA PREVIA</span>
              <span aria-hidden='true'>•</span>
              <span>{capturedShot.sizeKb} KB JPEG</span>
            </span>
          ) : hasLiveStream ? (
            <span className='inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-300 shrink-0'>
              <span className='size-1.5 rounded-full bg-emerald-400 animate-pulse' aria-hidden='true' />
              <span>EN VIVO</span>
            </span>
          ) : (
            <span className='inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-300 shrink-0'>
              <span>SIN CÁMARA</span>
            </span>
          )}

          <span className='text-xs font-medium text-neutral-200 truncate min-w-0'>
            {capturedShot
              ? 'Verifica que el texto sea legible'
              : hasLiveStream
                ? 'Cámara de diagnóstico'
                : 'Enviar imagen de la impresora o error'}
          </span>
        </div>

        <div className='flex items-center gap-1 shrink-0'>
          {hasLiveStream && !capturedShot && (
            <>
              <button
                type='button'
                onClick={() => setIsMirrored((prev) => !prev)}
                aria-label='Espejar vista'
                aria-pressed={isMirrored}
                title='Espejar vista horizontalmente'
                className={cn(
                  'flex min-h-8 min-w-8 items-center justify-center rounded-lg p-1.5 transition-colors cursor-pointer',
                  focusRingClass,
                  isMirrored
                    ? 'bg-violet-600/30 text-violet-200'
                    : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                )}
              >
                <FlipHorizontal2 className='size-4' aria-hidden='true' />
              </button>

              {onSwitchCamera && (
                <button
                  type='button'
                  onClick={onSwitchCamera}
                  aria-label={
                    facingMode === 'environment'
                      ? 'Cambiar a cámara frontal'
                      : 'Cambiar a cámara trasera'
                  }
                  title={
                    facingMode === 'environment'
                      ? 'Cambiar a cámara frontal'
                      : 'Cambiar a cámara trasera'
                  }
                  className={cn(
                    'flex min-h-8 min-w-8 items-center justify-center rounded-lg p-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer',
                    focusRingClass
                  )}
                >
                  <SwitchCamera className='size-4' aria-hidden='true' />
                </button>
              )}
            </>
          )}

          <button
            type='button'
            onClick={onCancel}
            aria-label='Cerrar cámara'
            title='Cerrar cámara'
            className={cn(
              'flex min-h-8 min-w-8 items-center justify-center rounded-lg p-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer',
              focusRingClass
            )}
          >
            <X className='size-4' aria-hidden='true' />
          </button>
        </div>
      </div>

      {/* Área de Viewport 16:9 estable con overflow-clip */}
      {capturedShot ? (
        <div className='relative overflow-clip rounded-xl border border-violet-500/30 bg-black aspect-video max-h-52 w-full'>
          <img
            src={capturedShot.dataUrl}
            alt='Vista previa de la fotografía capturada para diagnóstico'
            className='block h-full w-full aspect-video object-contain bg-black'
          />
        </div>
      ) : hasLiveStream ? (
        <div className='relative overflow-clip rounded-xl border border-neutral-800 bg-black aspect-video max-h-52 w-full'>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              'block h-full w-full aspect-video object-cover transition-transform duration-200',
              isMirrored && '-scale-x-100'
            )}
          />

          {/* Retícula óptica HUD de encuadre */}
          <div
            aria-hidden='true'
            className='pointer-events-none absolute inset-0 flex flex-col justify-between p-3'
          >
            <div className='flex justify-between'>
              <span className='size-5 border-t-2 border-l-2 border-white/75 rounded-tl-md' />
              <span className='size-5 border-t-2 border-r-2 border-white/75 rounded-tr-md' />
            </div>

            <div className='flex items-end justify-between gap-2'>
              <span className='size-5 border-b-2 border-l-2 border-white/75 rounded-bl-md shrink-0' />
              <span className='rounded-full bg-black/60 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-medium text-white/90 border border-white/10 truncate'>
                Encuadra el código de error o ticket POS
              </span>
              <span className='size-5 border-b-2 border-r-2 border-white/75 rounded-br-md shrink-0' />
            </div>
          </div>

          {/* Flash de obturador */}
          <div
            aria-hidden='true'
            className={cn(
              'pointer-events-none absolute inset-0 bg-white transition-opacity duration-150',
              showShutterFlash ? 'opacity-80' : 'opacity-0'
            )}
          />
        </div>
      ) : (
        <div
          role='alert'
          className='rounded-xl border border-neutral-800 bg-neutral-900/90 px-4 py-6 text-center flex flex-col items-center justify-center gap-2.5 aspect-video max-h-52 w-full'
        >
          <div className='flex size-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-400'>
            <AlertCircle className='size-4.5' aria-hidden='true' />
          </div>
          <p className='text-xs text-neutral-300 max-w-sm leading-relaxed'>
            {cameraError || 'No se pudo acceder a la cámara en vivo.'}
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        className='hidden'
        onChange={onPhotoUpload}
      />

      {/* Acciones del visor */}
      <div className='mt-3 flex flex-wrap items-center justify-between gap-2'>
        {capturedShot ? (
          <>
            <button
              type='button'
              onClick={() => setCapturedShot(null)}
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer',
                focusRingClass
              )}
            >
              <RotateCcw className='size-3.5' aria-hidden='true' />
              <span>Repetir</span>
            </button>

            <button
              type='button'
              onClick={() => onSendCaptured(capturedShot.dataUrl)}
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer active:scale-95',
                focusRingClass
              )}
            >
              <Send className='size-3.5' aria-hidden='true' />
              <span>Enviar al Asistente</span>
            </button>
          </>
        ) : hasLiveStream ? (
          <>
            <button
              type='button'
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer',
                focusRingClass
              )}
            >
              <Upload className='size-3.5' aria-hidden='true' />
              <span>Subir archivo</span>
            </button>

            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={onCancel}
                className={cn(
                  'min-h-9 rounded-xl px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer',
                  focusRingClass
                )}
              >
                Cancelar
              </button>
              <button
                type='button'
                onClick={handleShutterCapture}
                className={cn(
                  'inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer active:scale-95',
                  focusRingClass
                )}
              >
                <Camera className='size-3.5' aria-hidden='true' />
                <span>Capturar Foto</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type='button'
              onClick={onCancel}
              className={cn(
                'min-h-9 rounded-xl px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer',
                focusRingClass
              )}
            >
              Cancelar
            </button>

            <div className='flex flex-wrap items-center gap-2'>
              {onRetryCamera && (
                <button
                  type='button'
                  onClick={onRetryCamera}
                  className={cn(
                    'inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer',
                    focusRingClass
                  )}
                >
                  <RefreshCw className='size-3.5' aria-hidden='true' />
                  <span>Reintentar cámara</span>
                </button>
              )}

              <button
                type='button'
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer active:scale-95',
                  focusRingClass
                )}
              >
                <Upload className='size-3.5' aria-hidden='true' />
                <span>Subir archivo</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export interface VoiceCallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  conversationId?: string | number
  userId?: string | number
  userAuthId?: string | number
  senderMessengerId?: string | number
  wsUrl?: string
  onCallEnded?: (result: VoiceCallEndResult) => void
}

export function VoiceCallDialog({
  open,
  onOpenChange,
  sessionId,
  conversationId,
  userId,
  userAuthId,
  senderMessengerId,
  wsUrl,
  onCallEnded
}: VoiceCallDialogProps) {
  const voice = useVoiceCall({
    open,
    sessionId,
    conversationId,
    userId,
    userAuthId,
    senderMessengerId,
    wsUrl,
    onOpenChange,
    onCallEnded
  })


  if (!open) return null

  return (
    <>
      <Dialog open={open && !voice.isMinimized} onOpenChange={voice.handleDialogCloseAttempt}>
        <DialogContent
          showClose={false}
          className='sm:max-w-xl w-full p-0 flex flex-col overflow-hidden bg-white text-neutral-900 border border-neutral-200 shadow-2xl rounded-3xl'
        >
          <VoiceCallHeader
            callState={voice.callState}
            isConnecting={voice.isConnecting}
            isEnded={voice.isEnded}
            formattedDuration={voice.formattedDuration}
            contextBadges={voice.contextBadges}
            onMinimize={() => voice.setIsMinimized(true)}
          />

          {voice.isEnded ? (
            <VoiceCallEndedSummary
              formattedDuration={voice.formattedDuration}
              transcriptsCount={voice.transcripts.length}
              outcomeType={voice.outcomeType}
              contextBadges={voice.contextBadges}
              onClose={voice.handleDismissEndedCall}
            />
          ) : voice.isConnecting ? (
            <VoiceCallConnecting
              statusText={voice.statusText}
              onCancel={voice.handleHangup}
            />
          ) : (
            <div className='relative flex flex-col flex-1 min-h-0'>
              {(voice.reconnectingBanner || voice.callState === 'reconnecting') && (
                <div
                  role='status'
                  aria-live='polite'
                  className='pointer-events-none absolute top-2.5 left-5 right-5 z-30 flex items-center gap-2.5 rounded-2xl border border-amber-300/90 bg-amber-50/95 px-3.5 py-2.5 text-xs font-semibold text-amber-900 shadow-lg backdrop-blur-xs animate-in fade-in slide-in-from-top-2 duration-200'
                >
                  <Loader2 className='size-4 animate-spin text-amber-600 shrink-0' />
                  <span>{voice.reconnectingBanner || 'Estabilizando conexión de voz...'}</span>
                </div>
              )}

              {voice.isCameraOpen ? (
                <VoiceCameraPreview
                  stream={voice.cameraStream}
                  cameraError={voice.cameraError}
                  facingMode={voice.cameraFacingMode}
                  onCapturePreview={voice.handleCaptureCameraPreview}
                  onSendCaptured={voice.handleSendCapturedDataUrl}
                  onPhotoUpload={voice.handlePhotoUpload}
                  onSwitchCamera={voice.handleSwitchCamera}
                  onRetryCamera={() => void voice.handleOpenCamera()}
                  onCancel={voice.handleCloseCamera}
                />
              ) : (
                <VoiceAudioVisualizerCard
                  callState={voice.callState}
                  statusText={voice.statusText}
                  isMuted={voice.isMuted}
                  hasPermission={voice.hasPermission}
                  analyserNode={voice.analyserNode}
                  outputAnalyserNode={voice.outputAnalyserNode}
                  userRms={voice.userRms}
                  botRms={voice.botRms}
                  activeVUSegments={voice.activeVUSegments}
                  activeTool={voice.activeTool}
                  onRequestMicrophone={voice.requestMicrophone}
                />
              )}

              <VoiceTranscriptList
                transcripts={voice.transcripts}
                matchedArticle={voice.matchedArticle}
                noticeBanner={voice.noticeBanner}
              />

              <VoiceCallControls
                isMuted={voice.isMuted}
                hasPermission={voice.hasPermission}
                userRms={voice.userRms}
                textInput={voice.textInput}
                isCapturingScreen={voice.isCapturingScreen}
                isSimulatingMicroCut={voice.isSimulatingMicroCut}
                onTextInputChange={voice.setTextInput}
                onSendTextPrompt={voice.handleSendTextPrompt}
                onCaptureScreen={voice.handleCaptureScreen}
                onOpenCamera={voice.handleOpenCamera}
                onPhotoUpload={voice.handlePhotoUpload}
                onSimulateMicroCut={voice.handleSimulateMicroCut}
                onToggleMute={voice.handleToggleMute}
                onHeroMicClick={voice.handleHeroMicClick}
                onRequestMicrophone={voice.requestMicrophone}
                onMinimize={() => voice.setIsMinimized(true)}
                onHangup={voice.handleHangup}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <VoiceMinimizedIsland
        visible={open && voice.isMinimized}
        callState={voice.callState}
        formattedDuration={voice.formattedDuration}
        isMuted={voice.isMuted}
        hasPermission={voice.hasPermission}
        onToggleMute={voice.handleToggleMute}
        onMaximize={() => voice.setIsMinimized(false)}
        onHangup={voice.handleHangup}
      />
    </>
  )
}
