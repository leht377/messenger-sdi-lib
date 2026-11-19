'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOptionalChatContext } from '../context/chat-context'
import { VoiceCallClient } from '../services/voice/voice-call-client'
import type {
  VoiceCallContextBadges,
  VoiceCallEndResult,
  VoiceCallState,
  VoiceCallerContext,
  VoiceFinalizedPayload,
  VoiceMatchedArticle,
  VoiceToolState,
  VoiceTranscriptItem
} from '../types/voice.types'

const MAX_IMAGE_BYTES = 200 * 1024

function estimateBase64Bytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',')
  const b64 = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl
  return Math.ceil((b64.length * 3) / 4)
}

function compressSourceToJpegUnder200KB(
  source: HTMLVideoElement | HTMLImageElement,
  sourceWidth: number,
  sourceHeight: number
): string {
  const canvas = document.createElement('canvas')
  const maxDim = 1024
  let w = sourceWidth || 1280
  let h = sourceHeight || 720
  if (w > maxDim || h > maxDim) {
    const ratio = Math.min(maxDim / w, maxDim / h)
    w = Math.max(1, Math.round(w * ratio))
    h = Math.max(1, Math.round(h * ratio))
  }

  const drawAndEncode = (targetW: number, targetH: number, quality: number): string => {
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(source, 0, 0, targetW, targetH)
    return canvas.toDataURL('image/jpeg', quality)
  }

  let dataUrl = drawAndEncode(w, h, 0.8)
  if (estimateBase64Bytes(dataUrl) < MAX_IMAGE_BYTES) {
    return dataUrl
  }

  for (const quality of [0.65, 0.5, 0.38]) {
    dataUrl = drawAndEncode(w, h, quality)
    if (estimateBase64Bytes(dataUrl) < MAX_IMAGE_BYTES) {
      return dataUrl
    }
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    w = Math.max(160, Math.round(w * 0.8))
    h = Math.max(120, Math.round(h * 0.8))
    for (const quality of [0.65, 0.5, 0.38]) {
      dataUrl = drawAndEncode(w, h, quality)
      if (estimateBase64Bytes(dataUrl) < MAX_IMAGE_BYTES) {
        return dataUrl
      }
    }
  }

  return dataUrl
}

export interface UseVoiceCallOptions {
  open: boolean
  sessionId: string
  conversationId?: string | number
  userId?: string | number
  userAuthId?: string | number
  senderMessengerId?: string | number
  wsUrl?: string
  onOpenChange: (open: boolean) => void
  onCallEnded?: (result: VoiceCallEndResult) => void
}

export function useVoiceCall({
  open,
  sessionId,
  conversationId,
  userId,
  userAuthId,
  senderMessengerId,
  wsUrl,
  onOpenChange,
  onCallEnded
}: UseVoiceCallOptions) {
  const chatContext = useOptionalChatContext()

  const [callState, setCallState] = useState<VoiceCallState>('idle')
  const [statusText, setStatusText] = useState('Conectando con el Asistente de Voz...')
  const [isMuted, setIsMuted] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [micError, setMicError] = useState<string | null>(null)

  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)
  const [outputAnalyserNode, setOutputAnalyserNode] = useState<AnalyserNode | null>(null)
  const [userRms, setUserRms] = useState(0)
  const [botRms, setBotRms] = useState(0)

  const [transcripts, setTranscripts] = useState<VoiceTranscriptItem[]>([])
  const [callerContext, setCallerContext] = useState<VoiceCallerContext | null>(null)
  const [matchedArticle, setMatchedArticle] = useState<VoiceMatchedArticle | null>(null)
  const [activeTool, setActiveTool] = useState<VoiceToolState | null>(null)
  const [noticeBanner, setNoticeBanner] = useState<string | null>(null)
  const [reconnectingBanner, setReconnectingBanner] = useState<string | null>(null)
  const [isSimulatingMicroCut, setIsSimulatingMicroCut] = useState(false)
  const [outcomeData, setOutcomeData] = useState<Record<string, unknown> | null>(null)
  const [outcomeType, setOutcomeType] = useState<string>('completed')
  const [finalizedData, setFinalizedData] = useState<VoiceFinalizedPayload | null>(null)

  const [isCapturingScreen, setIsCapturingScreen] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment')
  const [serverSessionId, setServerSessionId] = useState<string | null>(null)
  const [textInput, setTextInput] = useState('')
  const [retryCounter, setRetryCounter] = useState(0)

  const clientRef = useRef<VoiceCallClient | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const statusRef = useRef<VoiceCallState>('idle')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isModalClosingRef = useRef(false)
  const outcomeTypeRef = useRef('completed')
  const outcomeDataRef = useRef<Record<string, unknown> | null>(null)
  const onOpenChangeRef = useRef(onOpenChange)
  const onCallEndedRef = useRef(onCallEnded)

  // Referencia al ID del mensaje actual del usuario (para actualizar interim STT en el mismo turno)
  const activeUserMessageIdRef = useRef<string | null>(null)

  // Buffer y temporizador para streaming gradual (typewriter) de los mensajes del asistente
  const botStreamRef = useRef<{
    id: string
    fullTargetText: string
    displayedLength: number
    timestamp: string
    isFinal: boolean
  } | null>(null)
  const botStreamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const turnFinishedRef = useRef<boolean>(false)

  useEffect(() => {
    statusRef.current = callState
  }, [callState])

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
    onCallEndedRef.current = onCallEnded
    outcomeTypeRef.current = outcomeType
    outcomeDataRef.current = outcomeData
  })

  const callSessionId = useMemo(() => {
    if (!open) return sessionId || 'call'
    return `${sessionId || 'call'}_${Date.now()}`
  }, [open, sessionId, retryCounter])

  const showNotice = useCallback((msg: string, durationMs = 4500) => {
    setNoticeBanner(msg)
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(() => {
      setNoticeBanner(null)
    }, durationMs)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stopCameraStream = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }
    setCameraStream(null)
    setCameraError(null)
    setIsCameraOpen(false)
  }, [])

  const stopBotStreamPacer = useCallback((flushImmediately = false) => {
    if (botStreamTimerRef.current) {
      clearInterval(botStreamTimerRef.current)
      botStreamTimerRef.current = null
    }
    if (botStreamRef.current) {
      const stream = botStreamRef.current
      if (flushImmediately) {
        setTranscripts((prev) => {
          const idx = prev.findIndex((item) => item.id === stream.id)
          if (idx !== -1) {
            const copy = [...prev]
            copy[idx] = {
              ...copy[idx],
              text: stream.fullTargetText,
              isFinal: true
            }
            return copy
          }
          return prev
        })
      }
    }
    botStreamRef.current = null
    turnFinishedRef.current = false
  }, [])

  const queueBotStreamText = useCallback((textChunk: string, isFinalChunk?: boolean) => {
    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })

    // Si el turno anterior ya había terminado por onTurnComplete,
    // garantizamos cerrar el turno previo y empezar una nueva burbuja
    if (turnFinishedRef.current) {
      stopBotStreamPacer(true)
      turnFinishedRef.current = false
    }

    // Sellamos el turno activo del usuario si estaba pendiente
    activeUserMessageIdRef.current = null

    // Si no hay stream activo para el bot, creamos un NUEVO mensaje en el chat
    if (!botStreamRef.current) {
      const newBotId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      botStreamRef.current = {
        id: newBotId,
        fullTargetText: textChunk,
        displayedLength: 0,
        timestamp,
        isFinal: Boolean(isFinalChunk)
      }

      setTranscripts((prev) => [
        ...prev,
        {
          id: newBotId,
          sender: 'assistant',
          text: '',
          timestamp,
          isFinal: false
        }
      ])
    } else {
      botStreamRef.current.fullTargetText += textChunk
      if (isFinalChunk) {
        botStreamRef.current.isFinal = true
      }
    }

    if (!botStreamTimerRef.current) {
      botStreamTimerRef.current = setInterval(() => {
        const stream = botStreamRef.current
        if (!stream) {
          if (botStreamTimerRef.current) {
            clearInterval(botStreamTimerRef.current)
            botStreamTimerRef.current = null
          }
          return
        }

        const targetLen = stream.fullTargetText.length
        if (stream.displayedLength < targetLen) {
          const remaining = targetLen - stream.displayedLength
          // Streaming gradual / typewriter:
          // A ~32ms por tick (~30-32 chars/s), adaptando velocidad según el buffer acumulado
          const step = remaining > 100 ? 3 : remaining > 45 ? 2 : 1
          stream.displayedLength = Math.min(targetLen, stream.displayedLength + step)
          const currentText = stream.fullTargetText.slice(0, stream.displayedLength)
          const isDone = stream.displayedLength >= targetLen && stream.isFinal

          setTranscripts((prev) => {
            const idx = prev.findIndex((item) => item.id === stream.id)
            if (idx === -1) return prev
            const copy = [...prev]
            copy[idx] = {
              ...copy[idx],
              text: currentText,
              isFinal: isDone
            }
            return copy
          })

          if (isDone) {
            if (botStreamTimerRef.current) {
              clearInterval(botStreamTimerRef.current)
              botStreamTimerRef.current = null
            }
            botStreamRef.current = null
            turnFinishedRef.current = false
          }
        } else if (stream.isFinal) {
          setTranscripts((prev) => {
            const idx = prev.findIndex((item) => item.id === stream.id)
            if (idx !== -1 && !prev[idx].isFinal) {
              const copy = [...prev]
              copy[idx] = { ...copy[idx], isFinal: true }
              return copy
            }
            return prev
          })
          if (botStreamTimerRef.current) {
            clearInterval(botStreamTimerRef.current)
            botStreamTimerRef.current = null
          }
          botStreamRef.current = null
          turnFinishedRef.current = false
        }
      }, 32)
    }
  }, [stopBotStreamPacer])

  const closeModalSafely = useCallback(
    (overrideOutcome?: string, overrideData?: Record<string, unknown> | null) => {
      if (isModalClosingRef.current) return
      isModalClosingRef.current = true

      stopTimer()
      stopBotStreamPacer(false)
      stopCameraStream()
      clientRef.current?.cleanup()
      clientRef.current = null

      const finalOutcome = overrideOutcome || outcomeTypeRef.current || 'completed'
      const finalPayload = overrideData !== undefined ? overrideData : outcomeDataRef.current

      onCallEndedRef.current?.({
        outcome: finalOutcome,
        data: finalPayload
      })
      onOpenChangeRef.current?.(false)
    },
    [stopTimer, stopBotStreamPacer, stopCameraStream]
  )

  useEffect(() => {
    if (!open) {
      clientRef.current?.cleanup()
      clientRef.current = null
      stopTimer()
      stopBotStreamPacer(false)
      stopCameraStream()
      activeUserMessageIdRef.current = null
      turnFinishedRef.current = false
      setCallState('idle')
      setIsMinimized(false)
      setReconnectingBanner(null)
      setIsSimulatingMicroCut(false)
      setAnalyserNode(null)
      setOutputAnalyserNode(null)
      setUserRms(0)
      setBotRms(0)
      setServerSessionId(null)
      return
    }

    isModalClosingRef.current = false
    setCallState('connecting')
    statusRef.current = 'connecting'
    setStatusText('Conectando con el Asistente de Voz...')
    setDurationSeconds(0)
    setTranscripts([])
    stopBotStreamPacer(false)
    stopCameraStream()
    activeUserMessageIdRef.current = null
    turnFinishedRef.current = false
    setCallerContext(null)
    setMatchedArticle(null)
    setActiveTool(null)
    setNoticeBanner(null)
    setReconnectingBanner(null)
    setIsSimulatingMicroCut(false)
    setOutcomeData(null)
    outcomeDataRef.current = null
    setServerSessionId(null)
    setOutcomeType('completed')
    outcomeTypeRef.current = 'completed'
    setFinalizedData(null)
    setIsCapturingScreen(false)
    setIsMuted(false)
    setIsMinimized(false)
    setHasPermission(null)
    setMicError(null)

    const client = new VoiceCallClient(
      {
        wsUrl: wsUrl || chatContext?.config?.voiceWsUrl,
        apiBaseUrl: chatContext?.config?.apiBaseUrl,
        sessionId: callSessionId,
        conversationId,
        userId,
        userAuthId,
        senderMessengerId
      },
      {
        onReady: (readyEvt) => {
          if (readyEvt.session_id) {
            setServerSessionId(readyEvt.session_id)
          }
          setReconnectingBanner(null)
          setIsSimulatingMicroCut(false)
          setCallState('listening')
          statusRef.current = 'listening'
          setStatusText('Te escucho... Habla con naturalidad.')
          if (readyEvt.caller_context) {
            setCallerContext(readyEvt.caller_context)
          }
          if (!timerRef.current) {
            timerRef.current = setInterval(() => {
              setDurationSeconds((prev) => prev + 1)
            }, 1000)
          }
        },
        onCallerContext: (ctx) => {
          setCallerContext(ctx)
        },
        onPermissionChange: (granted, errMsg) => {
          setHasPermission(granted)
          setMicError(granted ? null : errMsg || 'Permiso de micrófono no otorgado')
        },
        onTranscriptUser: (text, isFinal) => {
          if (statusRef.current !== 'escalating' && statusRef.current !== 'resolved') {
            setCallState('thinking')
            statusRef.current = 'thinking'
            setStatusText('Procesando consulta...')
          }

          // Si el bot estaba aún en streaming, sellamos su mensaje de inmediato para no mezclar turnos
          stopBotStreamPacer(true)
          turnFinishedRef.current = false

          const timestamp = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })

          if (!activeUserMessageIdRef.current) {
            // Nuevo turno del usuario: se genera una nueva burbuja en el chat
            const newUserId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
            activeUserMessageIdRef.current = newUserId
            setTranscripts((prev) => [
              ...prev,
              {
                id: newUserId,
                sender: 'user',
                text,
                timestamp,
                isFinal: isFinal ?? true
              }
            ])
          } else {
            // Se actualiza el reconocimiento provisional del mismo turno en curso
            const currentUserId = activeUserMessageIdRef.current
            setTranscripts((prev) => {
              const idx = prev.findIndex((item) => item.id === currentUserId)
              if (idx !== -1) {
                const copy = [...prev]
                copy[idx] = {
                  ...copy[idx],
                  text,
                  isFinal: isFinal ?? true
                }
                return copy
              }
              return [
                ...prev,
                {
                  id: currentUserId,
                  sender: 'user',
                  text,
                  timestamp,
                  isFinal: isFinal ?? true
                }
              ]
            })
          }

          // Si el turno del usuario quedó sellado, reseteamos la ref para que el próximo turno cree un NUEVO mensaje
          if (isFinal) {
            activeUserMessageIdRef.current = null
          }
        },
        onTranscriptBot: (textChunk, isFinal) => {
          if (statusRef.current !== 'escalating' && statusRef.current !== 'resolved') {
            setCallState('speaking')
            statusRef.current = 'speaking'
            setStatusText('Asistente respondiendo...')
          }
          queueBotStreamText(textChunk, isFinal)
        },
        onAssistantSpeaking: () => {
          if (statusRef.current !== 'escalating' && statusRef.current !== 'resolved') {
            setCallState('speaking')
            statusRef.current = 'speaking'
            setStatusText('Asistente respondiendo...')
          }
        },
        onTurnComplete: () => {
          turnFinishedRef.current = true
          if (botStreamRef.current) {
            botStreamRef.current.isFinal = true
            if (botStreamRef.current.displayedLength >= botStreamRef.current.fullTargetText.length) {
              stopBotStreamPacer(true)
            }
          }
          if (
            statusRef.current !== 'ended' &&
            statusRef.current !== 'escalating' &&
            statusRef.current !== 'resolved'
          ) {
            setCallState('listening')
            statusRef.current = 'listening'
            setStatusText('Te escucho...')
          }
        },
        onArticleMatched: (article) => {
          setMatchedArticle(article)
        },
        onToolState: (toolEvt) => {
          setActiveTool(toolEvt.status === 'running' ? toolEvt : null)
          if (toolEvt.status === 'running') {
            if (toolEvt.tool === 'search_knowledge_base') {
              setStatusText('Consultando Base de Conocimiento...')
            } else if (toolEvt.tool === 'send_steps_to_chat') {
              setStatusText('Enviando guía visual al chat...')
            } else if (toolEvt.tool === 'append_ticket_note') {
              setStatusText('Actualizando nota en ticket...')
            } else if (toolEvt.tool === 'escalate_to_human') {
              setCallState('escalating')
              statusRef.current = 'escalating'
              setStatusText('Registrando expediente y escalando a técnico...')
            } else if (toolEvt.tool === 'resolve_voice_session') {
              setCallState('resolved')
              statusRef.current = 'resolved'
              setStatusText('Registrando solución exitosa...')
            }
          } else if (
            toolEvt.status === 'done' &&
            statusRef.current !== 'escalating' &&
            statusRef.current !== 'resolved'
          ) {
            setCallState('speaking')
            statusRef.current = 'speaking'
            setStatusText('Asistente respondiendo...')
          }
        },
        onImageReceived: (res) => {
          const confirmText = 'Captura recibida y analizada por el asistente'
          const timestamp = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })
          setTranscripts((prev) => [
            ...prev,
            {
              id: `bot-img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              sender: 'assistant',
              text: confirmText,
              timestamp,
              isFinal: true
            }
          ])
          showNotice(res?.message || confirmText)
        },
        onGuideSent: () => {
          showNotice('Guía con pasos enviada al chat de Messenger', 5000)
        },
        onBargeIn: () => {
          if (botStreamRef.current) {
            const stream = botStreamRef.current
            if (botStreamTimerRef.current) {
              clearInterval(botStreamTimerRef.current)
              botStreamTimerRef.current = null
            }
            setTranscripts((prev) => {
              const idx = prev.findIndex((item) => item.id === stream.id)
              if (idx !== -1) {
                const copy = [...prev]
                copy[idx] = {
                  ...copy[idx],
                  text: stream.fullTargetText.slice(0, stream.displayedLength),
                  isFinal: true
                }
                return copy
              }
              return prev
            })
            botStreamRef.current = null
          }
          turnFinishedRef.current = false
          activeUserMessageIdRef.current = null
          setCallState('listening')
          statusRef.current = 'listening'
          setStatusText('Te escucho...')
        },
        onOutcome: (outcomeEvt) => {
          setOutcomeType(outcomeEvt.outcome)
          outcomeTypeRef.current = outcomeEvt.outcome
          if (outcomeEvt.data) {
            setOutcomeData(outcomeEvt.data)
            outcomeDataRef.current = outcomeEvt.data
          }
          if (outcomeEvt.outcome.startsWith('escalated')) {
            setCallState('escalating')
            statusRef.current = 'escalating'
            setStatusText('Solicitud transferida. El asistente se está despidiendo...')
          } else if (outcomeEvt.outcome === 'resolved') {
            setCallState('resolved')
            statusRef.current = 'resolved'
            setStatusText('¡Problema resuelto! El asistente se está despidiendo...')
          }
        },
        onClosing: () => {
          setStatusText('Despidiéndose y finalizando llamada...')
        },
        onReconnecting: (data) => {
          if (statusRef.current === 'ended') return
          const msg = data?.message || 'Estabilizando conexión de voz...'
          setCallState('reconnecting')
          statusRef.current = 'reconnecting'
          setStatusText(msg)
          setReconnectingBanner(msg)
        },
        onReconnected: (data) => {
          if (statusRef.current === 'ended') return
          setIsSimulatingMicroCut(false)
          setReconnectingBanner(null)
          setCallState('listening')
          statusRef.current = 'listening'
          const msg = data?.message || 'Conexión restablecida. Puedes continuar hablando.'
          setStatusText(msg)
          showNotice(msg, 4500)
        },
        onFinalized: (payload) => {
          stopTimer()
          stopBotStreamPacer(true)
          stopCameraStream()
          setReconnectingBanner(null)
          setIsSimulatingMicroCut(false)
          setFinalizedData(payload)
          if (payload.outcome) {
            setOutcomeType(payload.outcome)
            outcomeTypeRef.current = payload.outcome
          }
          if (payload.finalize) {
            setOutcomeData(payload.finalize)
            outcomeDataRef.current = payload.finalize
          }
          setCallState('ended')
          statusRef.current = 'ended'
          setIsMinimized(false)
          setStatusText(payload.message || 'Llamada finalizada.')
        },
        onError: (err) => {
          if (statusRef.current === 'ended') return
          setStatusText(err.message)
          if (statusRef.current === 'connecting') {
            setCallState('error')
            statusRef.current = 'error'
          }
        },
        onClose: () => {
          if (statusRef.current !== 'ended') {
            stopTimer()
            stopBotStreamPacer(true)
            stopCameraStream()
            setReconnectingBanner(null)
            setIsSimulatingMicroCut(false)
            setCallState('ended')
            statusRef.current = 'ended'
            setIsMinimized(false)
            setStatusText('Llamada terminada')
          }
        },
        onLevels: (uRms, bRms) => {
          setUserRms(uRms)
          setBotRms(bRms)
        }
      },
      {
        onAnalyserReady: (node) => setAnalyserNode(node),
        onOutputAnalyserReady: (node) => setOutputAnalyserNode(node)
      }
    )

    clientRef.current = client
    client.start().catch((err) => {
      if (clientRef.current !== client) return
      console.error('[useVoiceCall] Error al iniciar cliente:', err)
      setStatusText('No se pudo iniciar la llamada. Verifica el micrófono y la conexión.')
    })

    return () => {
      client.cleanup()
      if (clientRef.current === client) {
        clientRef.current = null
      }
      stopTimer()
      stopBotStreamPacer(false)
      stopCameraStream()
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    }
  }, [
    open,
    callSessionId,
    conversationId,
    userId,
    userAuthId,
    senderMessengerId,
    wsUrl,
    chatContext?.config?.voiceWsUrl,
    chatContext?.config?.apiBaseUrl,
    stopTimer,
    stopBotStreamPacer,
    stopCameraStream,
    queueBotStreamText,
    showNotice
  ])

  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    clientRef.current?.setMuted(nextMuted)
  }, [isMuted])

  const requestMicrophone = useCallback(() => {
    if (clientRef.current) {
      void clientRef.current.retryMicrophone()
      return
    }
    setRetryCounter((prev) => prev + 1)
  }, [])

  const handleHeroMicClick = useCallback(() => {
    if (hasPermission === false) {
      requestMicrophone()
      return
    }
    handleToggleMute()
  }, [hasPermission, requestMicrophone, handleToggleMute])

  const handleHangup = useCallback(async () => {
    if (isModalClosingRef.current) return

    if (statusRef.current === 'ended') {
      closeModalSafely()
      return
    }

    stopTimer()
    setCallState('ended')
    statusRef.current = 'ended'
    setIsMinimized(false)
    setStatusText('Llamada finalizada')

    const currentClient = clientRef.current
    clientRef.current = null

    try {
      if (currentClient) {
        await currentClient.hangup({ autoHangup: false })
      }
    } catch (err) {
      console.warn('[useVoiceCall] Error durante hangup:', err)
    }
  }, [closeModalSafely, stopTimer])

  const handleDismissEndedCall = useCallback(
    (overrideOutcome?: string, overrideData?: Record<string, unknown> | null) => {
      closeModalSafely(overrideOutcome, overrideData)
    },
    [closeModalSafely]
  )

  const handleDialogCloseAttempt = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        if (statusRef.current === 'ended') {
          closeModalSafely()
          return
        }
        if (statusRef.current === 'connecting' || statusRef.current === 'error') {
          closeModalSafely()
          return
        }
        setIsMinimized(true)
        return
      }
      onOpenChange(nextOpen)
    },
    [closeModalSafely, onOpenChange]
  )

  const handleSendTextPrompt = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      const trimmed = textInput.trim()
      if (!trimmed || !clientRef.current) return

      stopBotStreamPacer(true)
      activeUserMessageIdRef.current = null
      turnFinishedRef.current = false

      clientRef.current.sendTextPrompt(trimmed)
      const timestamp = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
      setTranscripts((prev) => [
        ...prev,
        {
          id: `user-txt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          sender: 'user',
          text: trimmed,
          timestamp,
          isFinal: true
        }
      ])
      setTextInput('')
    },
    [textInput, stopBotStreamPacer]
  )

  const handleCaptureScreen = useCallback(async () => {
    if (isCapturingScreen || !clientRef.current) return
    try {
      setIsCapturingScreen(true)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as MediaTrackConstraints,
        audio: false
      })
      const track = displayStream.getVideoTracks()[0]

      const video = document.createElement('video')
      video.srcObject = displayStream
      await video.play()

      const dataUrl = compressSourceToJpegUnder200KB(
        video,
        video.videoWidth || 1280,
        video.videoHeight || 720
      )

      track.stop()
      displayStream.getTracks().forEach((t) => t.stop())

      clientRef.current.sendImage(dataUrl, 'image/jpeg')
      showNotice('Captura de pantalla enviada al asistente')
    } catch (err: unknown) {
      if ((err as { name?: string })?.name !== 'NotAllowedError') {
        console.warn('[useVoiceCall] Error en captura de pantalla:', err)
      }
    } finally {
      setIsCapturingScreen(false)
    }
  }, [isCapturingScreen, showNotice])

  const handleOpenCamera = useCallback(
    async (overrideFacingMode?: 'environment' | 'user') => {
      if (!clientRef.current) return
      const targetFacingMode =
        overrideFacingMode === 'user' || overrideFacingMode === 'environment'
          ? overrideFacingMode
          : cameraFacingMode
      stopCameraStream()
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          'Tu navegador no permite acceso directo a la cámara. Puedes subir una foto desde tu equipo.'
        )
        setIsCameraOpen(true)
        return
      }
      try {
        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: targetFacingMode },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          })
        } catch (primaryErr: unknown) {
          const primaryName = (primaryErr as { name?: string })?.name
          if (primaryName === 'NotAllowedError' || primaryName === 'PermissionDeniedError') {
            throw primaryErr
          }
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        }
        cameraStreamRef.current = stream
        setCameraStream(stream)
        setCameraError(null)
        setIsCameraOpen(true)
      } catch (err: unknown) {
        const errName = (err as { name?: string })?.name
        const message =
          errName === 'NotAllowedError' || errName === 'PermissionDeniedError'
            ? 'Permiso de cámara denegado en el navegador. Habilita la cámara o sube una foto desde tu equipo.'
            : 'No se detectó cámara activa. Puedes subir una foto desde tu equipo.'
        setCameraStream(null)
        setCameraError(message)
        setIsCameraOpen(true)
        console.warn('[useVoiceCall] Error al abrir cámara:', err)
      }
    },
    [cameraFacingMode, stopCameraStream]
  )

  const handleSwitchCamera = useCallback(() => {
    const nextMode: 'environment' | 'user' =
      cameraFacingMode === 'environment' ? 'user' : 'environment'
    setCameraFacingMode(nextMode)
    void handleOpenCamera(nextMode)
  }, [cameraFacingMode, handleOpenCamera])

  const handleCloseCamera = useCallback(() => {
    stopCameraStream()
  }, [stopCameraStream])

  const handleCaptureCameraPreview = useCallback(
    (videoEl: HTMLVideoElement | null): { dataUrl: string; sizeKb: number } | null => {
      if (!videoEl) return null
      const dataUrl = compressSourceToJpegUnder200KB(
        videoEl,
        videoEl.videoWidth || 1280,
        videoEl.videoHeight || 720
      )
      const sizeKb = Math.max(1, Math.round(estimateBase64Bytes(dataUrl) / 1024))
      return { dataUrl, sizeKb }
    },
    []
  )

  const handleSendCapturedDataUrl = useCallback(
    (dataUrl: string) => {
      if (!dataUrl || !clientRef.current) return
      clientRef.current.sendImage(dataUrl, 'image/jpeg')
      stopCameraStream()
      showNotice('Foto enviada al asistente')
    },
    [stopCameraStream, showNotice]
  )

  const handleTakeCameraPhoto = useCallback(
    (videoEl: HTMLVideoElement | null) => {
      const captured = handleCaptureCameraPreview(videoEl)
      if (!captured) return
      handleSendCapturedDataUrl(captured.dataUrl)
    },
    [handleCaptureCameraPreview, handleSendCapturedDataUrl]
  )

  const handlePhotoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !clientRef.current) return
      const reader = new FileReader()
      reader.onload = (event) => {
        const rawDataUrl = event.target?.result as string
        if (!rawDataUrl || !clientRef.current) return
        const img = new Image()
        img.onload = () => {
          if (!clientRef.current) return
          const compressedDataUrl = compressSourceToJpegUnder200KB(
            img,
            img.naturalWidth || img.width || 1280,
            img.naturalHeight || img.height || 720
          )
          clientRef.current.sendImage(compressedDataUrl, 'image/jpeg')
          stopCameraStream()
          showNotice('Foto enviada al asistente')
        }
        img.src = rawDataUrl
      }
      reader.readAsDataURL(file)
      e.target.value = ''
    },
    [stopCameraStream, showNotice]
  )

  const handleSimulateMicroCut = useCallback(() => {
    if (!clientRef.current || statusRef.current === 'ended' || statusRef.current === 'connecting') {
      return
    }
    setIsSimulatingMicroCut(true)
    clientRef.current.simulateMicroCut(2000)
  }, [])

  const formattedDuration = useMemo(() => {
    const mins = Math.floor(durationSeconds / 60)
    const secs = durationSeconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, [durationSeconds])

  const contextBadges = useMemo<VoiceCallContextBadges>(() => {
    const ticketFromOutcome =
      (outcomeData?.ticket as { number?: string } | undefined)?.number ||
      (outcomeData?.ticket_number as string | undefined) ||
      (finalizedData?.finalize?.ticket_number as string | undefined) ||
      callerContext?.ticket_number ||
      null

    return {
      sessionId: serverSessionId || callSessionId,
      terminalId: callerContext?.terminal_id || null,
      ticketNumber: ticketFromOutcome,
      serviceName: callerContext?.service_name || null,
      posLocation: callerContext?.user?.place_name || null,
      openTicketsCount: callerContext?.recent_open_tickets?.length || 0
    }
  }, [serverSessionId, callSessionId, callerContext, outcomeData, finalizedData])

  const activeSessionId = useMemo(() => {
    return serverSessionId || contextBadges.sessionId || callSessionId || sessionId
  }, [serverSessionId, contextBadges.sessionId, callSessionId, sessionId])

  const isEnded = callState === 'ended'
  const isConnecting =
    callState === 'connecting' ||
    callState === 'requesting_permission' ||
    callState === 'idle'

  const activeVUSegments = useMemo(() => {
    if (isMuted || isConnecting || isEnded || hasPermission === false) return 0
    if (userRms < 0.02) return 1
    return Math.min(8, Math.max(1, Math.round(userRms * 10) + 1))
  }, [isMuted, isConnecting, isEnded, hasPermission, userRms])

  return {
    callState,
    statusText,
    isMuted,
    isMinimized,
    setIsMinimized,
    isEnded,
    isConnecting,
    durationSeconds,
    formattedDuration,
    hasPermission,
    micError,
    activeSessionId,
    closeModalSafely,
    analyserNode,
    outputAnalyserNode,
    userRms,
    botRms,
    activeVUSegments,
    transcripts,
    contextBadges,
    callerContext,
    matchedArticle,
    activeTool,
    noticeBanner,
    reconnectingBanner,
    isSimulatingMicroCut,
    outcomeType,
    outcomeData,
    finalizedData,
    isCapturingScreen,
    isCameraOpen,
    cameraStream,
    cameraError,
    cameraFacingMode,
    textInput,
    setTextInput,
    handleToggleMute,
    handleHeroMicClick,
    handleHangup,
    handleDismissEndedCall,
    handleDialogCloseAttempt,
    handleSendTextPrompt,
    handleCaptureScreen,
    handleOpenCamera,
    handleSwitchCamera,
    handleCaptureCameraPreview,
    handleSendCapturedDataUrl,
    handleTakeCameraPhoto,
    handleCloseCamera,
    handlePhotoUpload,
    handleSimulateMicroCut,
    requestMicrophone
  }
}
