import type {
  VoiceCallCallbacks,
  VoiceConnectionParams
} from '../../types/voice.types'
import { buildVoiceWebSocketUrl } from './voice-ws-url.util'
import { VoiceAudioEngine } from './voice-audio-engine'

export interface VoiceCallClientOptions {
  onAnalyserReady?: (analyser: AnalyserNode | null) => void
  onOutputAnalyserReady?: (analyser: AnalyserNode | null) => void
}

/**
 * Cliente WebSocket full-duplex para el Asistente Telefónico de Voz SDI.
 * Coordina la señalización JSON y el flujo binario PCM con VoiceAudioEngine.
 */
export class VoiceCallClient {
  private ws: WebSocket | null = null
  private audioEngine: VoiceAudioEngine
  private connected: boolean = false
  private wasEverConnected: boolean = false
  private isDisposed: boolean = false
  private isCallFinalized: boolean = false
  private isSimulatingMicroCut: boolean = false
  private levelIntervalId: ReturnType<typeof setInterval> | null = null
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null
  private microCutTimerId: ReturnType<typeof setTimeout> | null = null
  private reconnectTimerId: ReturnType<typeof setTimeout> | null = null

  constructor(
    private config: VoiceConnectionParams,
    private callbacks: VoiceCallCallbacks = {},
    options: VoiceCallClientOptions = {}
  ) {
    this.audioEngine = new VoiceAudioEngine({
      onAnalyserReady: options.onAnalyserReady,
      onOutputAnalyserReady: options.onOutputAnalyserReady,
      onPcmChunk: (buffer) => {
        if (this.connected && !this.isSimulatingMicroCut && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(buffer)
        }
      }
    })
  }

  public isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.audioEngine.getAnalyserNode()
  }

  public getOutputAnalyserNode(): AnalyserNode | null {
    return this.audioEngine.getOutputAnalyserNode()
  }

  public async start(): Promise<void> {
    this.isDisposed = false
    this.isCallFinalized = false
    this.wasEverConnected = false
    this.isSimulatingMicroCut = false
    const url = buildVoiceWebSocketUrl(this.config)

    // 1. Inicializar contexto de salida (24,000 Hz) dentro del gesto del usuario
    await this.audioEngine.initOutput()
    if (this.isDisposed) {
      this.cleanup()
      return
    }

    // 2. Inicializar captura de micrófono (16,000 Hz Mono Int16)
    // Si no hay permiso o no se detecta micrófono, notificamos el estado pero permitimos conectar la llamada
    // (audio del asistente, texto, adjuntos, pantalla compartida y reintento en caliente siguen operativos).
    try {
      await this.audioEngine.initMicrophone()
      if (!this.isDisposed) {
        this.callbacks.onPermissionChange?.(true)
      }
    } catch (err: unknown) {
      if (this.isDisposed) return
      const userMessage = this.formatMicrophoneError(err)
      this.callbacks.onPermissionChange?.(false, userMessage)
    }

    if (this.isDisposed) {
      this.cleanup()
      return
    }

    // 3. Conectar WebSocket con el Gateway de Voz con reintento automático si el gateway tarda en responder o sufre micro-cortes
    let connectAttempts = 0
    const maxConnectRetries = 3

    const connectWs = () => {
      if (this.isDisposed || this.isCallFinalized) return

      const ws = new WebSocket(url)
      this.ws = ws
      ws.binaryType = 'arraybuffer'

      const scheduleReconnect = (): boolean => {
        if (this.isDisposed || this.isCallFinalized) return false
        if (this.reconnectTimerId) return true
        if (connectAttempts >= maxConnectRetries) return false

        this.connected = false
        if (this.heartbeatIntervalId) {
          clearInterval(this.heartbeatIntervalId)
          this.heartbeatIntervalId = null
        }

        connectAttempts++
        this.callbacks.onReconnecting?.({
          message: 'Estabilizando conexión de voz...'
        })

        this.reconnectTimerId = setTimeout(() => {
          this.reconnectTimerId = null
          if (!this.isDisposed && !this.isCallFinalized) {
            connectWs()
          }
        }, 1500)

        return true
      }

      ws.onopen = () => {
        if (this.ws !== ws) return
        const isReconnection = this.wasEverConnected
        this.connected = true
        this.wasEverConnected = true
        connectAttempts = 0

        if (this.reconnectTimerId) {
          clearTimeout(this.reconnectTimerId)
          this.reconnectTimerId = null
        }

        if (this.heartbeatIntervalId) {
          clearInterval(this.heartbeatIntervalId)
        }
        // Heartbeat periódico cada 20 segundos según especificación
        this.heartbeatIntervalId = setInterval(() => {
          if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 20000)

        if (isReconnection) {
          this.callbacks.onReconnected?.({
            message: 'Conexión restablecida. Puedes continuar hablando.'
          })
        }
      }

      ws.onmessage = (event: MessageEvent) => {
        if (typeof event.data === 'string') {
          try {
            const json = JSON.parse(event.data)
            this.handleJsonEvent(json)
          } catch (err) {
            console.warn('[VoiceCallClient] Error parseando evento JSON:', err)
          }
        } else if (event.data instanceof ArrayBuffer) {
          this.audioEngine.playAudioChunk(event.data)
        }
      }

      ws.onerror = () => {
        if (this.ws !== ws) return
        if (scheduleReconnect()) {
          return
        }
        this.callbacks.onError?.(new Error('Error de conexión con el servidor de voz.'))
      }

      ws.onclose = () => {
        if (this.ws !== ws) return
        if (scheduleReconnect()) {
          return
        }
        this.connected = false
        this.cleanup()
        this.callbacks.onClose?.()
      }
    }

    connectWs()

    // Reporte de niveles RMS a 30 FPS para el visualizador y medidor VU
    this.levelIntervalId = setInterval(() => {
      const { userRms, botRms } = this.audioEngine.getLevelsAndDecay()
      this.callbacks.onLevels?.(userRms, botRms)
    }, 33)
  }

  private handleJsonEvent(event: Record<string, any>): void {
    const type = event.type

    switch (type) {
      case 'session.ready':
        this.callbacks.onReady?.(event as any)
        if (event.caller_context) {
          this.callbacks.onCallerContext?.(event.caller_context)
        }
        break
      case 'transcript.user':
        this.callbacks.onTranscriptUser?.(event.text || '', event.is_final)
        break
      case 'transcript.bot':
        this.callbacks.onTranscriptBot?.(event.text || '', event.is_final)
        break
      case 'assistant.transcript':
        if (event.role === 'user') {
          this.callbacks.onTranscriptUser?.(event.text || '', event.is_final)
        } else {
          this.callbacks.onTranscriptBot?.(event.text || '', event.is_final)
        }
        break
      case 'assistant.speaking':
        this.callbacks.onAssistantSpeaking?.()
        break
      case 'assistant.turn_complete':
        this.callbacks.onTurnComplete?.()
        break
      case 'article.matched':
        this.callbacks.onArticleMatched?.(event.article || null)
        break
      case 'tool.state':
        this.callbacks.onToolState?.(event as any)
        break
      case 'assistant.image_received':
        this.callbacks.onImageReceived?.(event as any)
        break
      case 'guide.sent':
        this.callbacks.onGuideSent?.(event as any)
        break
      case 'barge_in':
      case 'assistant.interrupted':
        this.audioEngine.stopPlaybackImmediately()
        this.callbacks.onBargeIn?.()
        break
      case 'call.outcome':
        this.callbacks.onOutcome?.(event as any)
        break
      case 'session.reconnecting':
        this.callbacks.onReconnecting?.(event as any)
        break
      case 'session.reconnected':
        this.callbacks.onReconnected?.(event as any)
        break
      case 'call.closing':
        this.callbacks.onClosing?.(event as any)
        this.audioEngine
          .waitForAudioPlaybackDrain()
          .then(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
              return this.hangup({ autoHangup: true })
            }
          })
          .catch((err) => {
            console.warn('[VoiceCallClient] Error en drenado de audio de cierre:', err)
          })
        break
      case 'call.finalized':
        this.isCallFinalized = true
        this.callbacks.onFinalized?.(event as any)
        break
      case 'call.timeout':
      case 'call.idle_timeout':
        this.callbacks.onError?.(
          new Error(event.message || 'Llamada finalizada por tiempo límite.')
        )
        this.hangup().catch(() => {})
        break
      default:
        break
    }
  }

  public setMuted(muted: boolean): void {
    this.audioEngine.setMuted(muted)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'mute', muted }))
    }
  }

  public sendImage(dataUrlOrBase64: string, mimeType: string = 'image/jpeg'): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const clean = dataUrlOrBase64.includes(',')
      ? dataUrlOrBase64.split(',')[1]
      : dataUrlOrBase64

    this.ws.send(
      JSON.stringify({
        type: 'client.image',
        data: clean,
        mime_type: mimeType
      })
    )
  }

  public sendTextPrompt(text: string): void {
    const trimmed = text.trim()
    if (!trimmed || !this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(
      JSON.stringify({
        type: 'text_prompt',
        text: trimmed
      })
    )
  }

  public async hangup(options?: { autoHangup?: boolean }): Promise<void> {
    this.isDisposed = true
    this.audioEngine.stopMicrophoneImmediate()

    if (!options?.autoHangup) {
      this.audioEngine.stopPlaybackImmediately()
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      const waitFinalized = new Promise<void>((resolve) => {
        const handler = (evt: MessageEvent) => {
          if (typeof evt.data === 'string') {
            try {
              const data = JSON.parse(evt.data)
              if (data.type === 'call.finalized') {
                this.ws?.removeEventListener('message', handler)
                resolve()
              }
            } catch {
              // Ignorar
            }
          }
        }
        this.ws?.addEventListener('message', handler)
        setTimeout(() => {
          this.ws?.removeEventListener('message', handler)
          resolve()
        }, 3200)
      })

      this.ws.send(
        JSON.stringify({
          type: 'hangup',
          auto_hangup: Boolean(options?.autoHangup)
        })
      )
      await waitFinalized
    }

    this.cleanup()
  }

  private formatMicrophoneError(err: unknown): string {
    const errName = (err as { name?: string })?.name
    const isDenied = errName === 'NotAllowedError' || errName === 'PermissionDeniedError'
    return isDenied
      ? 'Permiso de micrófono denegado. Por favor habilita el acceso al micrófono en tu navegador.'
      : `Error al acceder al micrófono: ${err instanceof Error ? err.message : String(err)}`
  }

  public async retryMicrophone(): Promise<boolean> {
    if (this.isDisposed) return false
    try {
      await this.audioEngine.initMicrophone()
      if (this.isDisposed) return false
      this.callbacks.onPermissionChange?.(true)
      return true
    } catch (err: unknown) {
      if (this.isDisposed) return false
      const userMessage = this.formatMicrophoneError(err)
      this.callbacks.onPermissionChange?.(false, userMessage)
      return false
    }
  }

  /**
   * Simula un micro-corte de red temporal (p.ej. 2s) pausando tramas PCM
   * y emitiendo la secuencia session.reconnecting -> session.reconnected
   * sin cortar AudioEngine ni finalizar la sesión.
   */
  public simulateMicroCut(durationMs: number = 2000): void {
    if (this.isDisposed || this.isCallFinalized || this.isSimulatingMicroCut) return
    this.isSimulatingMicroCut = true

    this.handleJsonEvent({
      type: 'session.reconnecting',
      message: 'Estabilizando conexión de voz...'
    })

    this.microCutTimerId = setTimeout(() => {
      this.microCutTimerId = null
      if (this.isDisposed || this.isCallFinalized) {
        this.isSimulatingMicroCut = false
        return
      }
      this.isSimulatingMicroCut = false
      this.handleJsonEvent({
        type: 'session.reconnected',
        message: 'Conexión restablecida. Puedes continuar hablando.'
      })
    }, durationMs)
  }

  public cleanup(): void {
    this.isDisposed = true
    this.connected = false
    this.isSimulatingMicroCut = false

    if (this.levelIntervalId) {
      clearInterval(this.levelIntervalId)
      this.levelIntervalId = null
    }
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId)
      this.heartbeatIntervalId = null
    }
    if (this.microCutTimerId) {
      clearTimeout(this.microCutTimerId)
      this.microCutTimerId = null
    }
    if (this.reconnectTimerId) {
      clearTimeout(this.reconnectTimerId)
      this.reconnectTimerId = null
    }

    this.audioEngine.dispose()

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      const socketToClose = this.ws
      this.ws = null
      socketToClose.close()
    }
  }
}
