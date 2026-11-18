import { createPcmWorkletModuleUrl } from './pcm-worklet.inline'

export interface VoiceAudioEngineOptions {
  onPcmChunk?: (buffer: ArrayBuffer, rms: number) => void
  onAnalyserReady?: (analyser: AnalyserNode | null) => void
  onOutputAnalyserReady?: (analyser: AnalyserNode | null) => void
}

/**
 * Motor Web Audio API autónomo para llamadas full-duplex:
 * - Entrada: Captura de micrófono con downsampling a 16,000 Hz Mono Int16 (AudioWorklet + fallback ScriptProcessor).
 * - Salida: Reproducción secuencial de PCM 24,000 Hz Int16 sin cortes ni solapamientos con AnalyserNode de salida en vivo.
 * - Barge-in instantáneo (< 20 ms) y drenado seguro de despedida.
 */
export class VoiceAudioEngine {
  private inputAudioCtx: AudioContext | null = null
  private outputAudioCtx: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private analyserNode: AnalyserNode | null = null
  private outputAnalyserNode: AnalyserNode | null = null
  private workletNode: AudioWorkletNode | null = null
  private scriptProcessor: ScriptProcessorNode | null = null
  private silentGain: GainNode | null = null

  private activeSources: Set<AudioBufferSourceNode> = new Set()
  private nextPlayTime: number = 0
  private isDisposed: boolean = false
  private isMuted: boolean = false
  private isDrainingFarewell: boolean = false

  private latestUserRms: number = 0
  private latestBotRms: number = 0

  constructor(private options: VoiceAudioEngineOptions = {}) {}

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode
  }

  public getOutputAnalyserNode(): AnalyserNode | null {
    return this.outputAnalyserNode
  }

  public getLevelsAndDecay(): { userRms: number; botRms: number } {
    const userRms = this.isMuted ? 0 : this.latestUserRms
    let botRms = this.latestBotRms

    if (this.outputAnalyserNode) {
      const freqData = new Uint8Array(this.outputAnalyserNode.frequencyBinCount)
      this.outputAnalyserNode.getByteFrequencyData(freqData)
      let sum = 0
      for (let i = 0; i < freqData.length; i++) {
        sum += freqData[i]
      }
      const liveBotLevel = sum / (freqData.length * 255)
      botRms = Math.max(botRms, liveBotLevel)
    }

    this.latestUserRms *= 0.85
    this.latestBotRms *= 0.90
    return { userRms, botRms }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted
    if (muted) {
      this.latestUserRms = 0
    }
    if (this.mediaStream && !this.isDrainingFarewell) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted
      })
    }
  }

  /**
   * Inicializa el contexto de reproducción de salida a 24,000 Hz dentro del gesto del usuario.
   */
  public async initOutput(): Promise<void> {
    this.isDisposed = false
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext

    if (!AudioContextClass) {
      throw new Error('Web Audio API no soportada en este navegador.')
    }

    this.outputAudioCtx = new AudioContextClass({ sampleRate: 24000 })
    if (this.outputAudioCtx.state === 'suspended') {
      try {
        await this.outputAudioCtx.resume()
      } catch {
        // Ignorar si ya fue reanudado o cerrado
      }
    }

    if (this.isDisposed) {
      this.dispose()
      return
    }

    // AnalyserNode exclusivo para visualización reactiva a 60 FPS de la voz del asistente
    const outAnalyser = this.outputAudioCtx.createAnalyser()
    outAnalyser.fftSize = 64
    outAnalyser.smoothingTimeConstant = 0.65
    outAnalyser.connect(this.outputAudioCtx.destination)
    this.outputAnalyserNode = outAnalyser
    this.options.onOutputAnalyserReady?.(outAnalyser)

    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime
    }
  }

  /**
   * Inicializa la captura del micrófono a 16,000 Hz Mono Int16 con AnalyserNode para el ecualizador.
   */
  public async initMicrophone(): Promise<void> {
    if (this.isDisposed) return

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext

    if (!AudioContextClass) {
      throw new Error('Web Audio API no soportada en este navegador.')
    }

    const inputCtx = new AudioContextClass()
    this.inputAudioCtx = inputCtx

    if (inputCtx.state === 'suspended') {
      try {
        await inputCtx.resume()
      } catch {
        // Ignorar
      }
    }

    if (this.isDisposed) {
      try {
        await inputCtx.close()
      } catch {
        // Ignorar
      }
      this.inputAudioCtx = null
      return
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error('El navegador no soporta captura de micrófono.')
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    })

    if (this.isDisposed || !this.inputAudioCtx || this.inputAudioCtx.state === 'closed') {
      stream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
      return
    }

    this.mediaStream = stream
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !this.isMuted
    })

    const micSource = this.inputAudioCtx.createMediaStreamSource(this.mediaStream)

    // AnalyserNode exclusivo para el visualizador a 60 FPS
    const analyser = this.inputAudioCtx.createAnalyser()
    analyser.fftSize = 64
    analyser.smoothingTimeConstant = 0.65
    micSource.connect(analyser)
    this.analyserNode = analyser
    this.options.onAnalyserReady?.(analyser)

    // Nodo silenciador para mantener activo el reloj de AudioWorklet sin generar acople
    this.silentGain = this.inputAudioCtx.createGain()
    this.silentGain.gain.value = 0.0
    this.silentGain.connect(this.inputAudioCtx.destination)

    let workletBlobUrl: string | null = null
    try {
      workletBlobUrl = createPcmWorkletModuleUrl()
      await this.inputAudioCtx.audioWorklet.addModule(workletBlobUrl)
      URL.revokeObjectURL(workletBlobUrl)
      workletBlobUrl = null

      if (this.isDisposed || !this.inputAudioCtx || (this.inputAudioCtx.state as string) === 'closed') {
        return
      }

      this.workletNode = new AudioWorkletNode(this.inputAudioCtx, 'pcm-capture-processor')
      this.workletNode.port.onmessage = (event: MessageEvent) => {
        if (event.data?.type === 'pcm_chunk') {
          const rawRms = event.data.rms || 0
          const normalizedRms = Math.min(1.0, rawRms / 4000)
          this.latestUserRms = this.isMuted ? 0 : normalizedRms

          if (!this.isMuted && !this.isDrainingFarewell) {
            this.options.onPcmChunk?.(event.data.buffer, normalizedRms)
          }
        }
      }

      micSource.connect(this.workletNode)
      this.workletNode.connect(this.silentGain)
    } catch (workletErr) {
      if (workletBlobUrl) {
        URL.revokeObjectURL(workletBlobUrl)
      }
      if (this.isDisposed || !this.inputAudioCtx || (this.inputAudioCtx.state as string) === 'closed') {
        return
      }

      console.warn('[VoiceAudioEngine] AudioWorklet falló, usando ScriptProcessor fallback:', workletErr)
      this.initScriptProcessorFallback(micSource)
    }
  }

  private initScriptProcessorFallback(micSource: MediaStreamAudioSourceNode): void {
    if (!this.inputAudioCtx || !this.silentGain) return

    const bufferSize = 4096
    this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(bufferSize, 1, 1)
    const targetRate = 16000
    const ctxRate = this.inputAudioCtx.sampleRate
    const ratio = ctxRate / targetRate
    const chunkSamples = 1600 // 100 ms @ 16 kHz = 3,200 bytes
    const pcmBuffer = new Int16Array(chunkSamples)
    let bufferIndex = 0

    this.scriptProcessor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)
      const outSamples = Math.floor(input.length / ratio)

      for (let i = 0; i < outSamples; i++) {
        const sample = input[Math.floor(i * ratio)]
        const clamped = Math.max(-1.0, Math.min(1.0, sample))
        const val = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
        pcmBuffer[bufferIndex++] = val

        if (bufferIndex >= chunkSamples) {
          let sumSquares = 0
          for (let b = 0; b < chunkSamples; b++) {
            sumSquares += pcmBuffer[b] * pcmBuffer[b]
          }
          const normalizedRms = Math.min(1.0, Math.sqrt(sumSquares / chunkSamples) / 4000)
          this.latestUserRms = this.isMuted ? 0 : normalizedRms

          if (!this.isMuted && !this.isDrainingFarewell) {
            const transfer = new Int16Array(pcmBuffer)
            this.options.onPcmChunk?.(transfer.buffer, normalizedRms)
          }
          bufferIndex = 0
        }
      }
    }

    micSource.connect(this.scriptProcessor)
    this.scriptProcessor.connect(this.silentGain)
  }

  /**
   * Reproduce un chunk binario PCM 16-bit little-endian a 24,000 Hz secuencialmente.
   */
  public playAudioChunk(arrayBuffer: ArrayBuffer): void {
    if (!this.outputAudioCtx || this.outputAudioCtx.state === 'closed') return

    const int16Array = new Int16Array(arrayBuffer)
    if (int16Array.length === 0) return

    let sumSquares = 0
    for (let i = 0; i < int16Array.length; i++) {
      sumSquares += int16Array[i] * int16Array[i]
    }
    this.latestBotRms = Math.min(1.0, Math.sqrt(sumSquares / int16Array.length) / 8000)

    const float32 = new Float32Array(int16Array.length)
    for (let i = 0; i < int16Array.length; i++) {
      float32[i] = int16Array[i] / 32768.0
    }

    const audioBuffer = this.outputAudioCtx.createBuffer(1, float32.length, 24000)
    audioBuffer.copyToChannel(float32, 0)

    const source = this.outputAudioCtx.createBufferSource()
    source.buffer = audioBuffer
    if (this.outputAnalyserNode) {
      source.connect(this.outputAnalyserNode)
    } else {
      source.connect(this.outputAudioCtx.destination)
    }

    const curTime = this.outputAudioCtx.currentTime
    const startTime = Math.max(curTime, this.nextPlayTime)
    source.start(startTime)
    this.nextPlayTime = startTime + audioBuffer.duration

    this.activeSources.add(source)
    source.onended = () => {
      this.activeSources.delete(source)
    }
  }

  /**
   * Interrupción instantánea (Barge-in): purga la cola de reproducción en < 20 ms.
   */
  public stopPlaybackImmediately(): void {
    this.activeSources.forEach((src) => {
      try {
        src.stop()
        src.disconnect()
      } catch {
        // Ignorar si ya finalizó
      }
    })
    this.activeSources.clear()

    if (this.outputAudioCtx && this.outputAudioCtx.state !== 'closed') {
      this.nextPlayTime = this.outputAudioCtx.currentTime
    }
    this.latestBotRms = 0
  }

  /**
   * Espera a que la locución programada en el AudioContext termine por completo
   * antes de cerrar la conexión WebSocket, evitando cortes en la despedida.
   */
  public async waitForAudioPlaybackDrain(): Promise<void> {
    this.isDrainingFarewell = true

    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = false
      })
    }

    const checkIntervalMs = 80
    const startTime = Date.now()
    const maxWaitMs = 20000

    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        const now = Date.now()
        const curTime = this.outputAudioCtx?.currentTime || 0
        const remainingPlayback = Math.max(0, this.nextPlayTime - curTime)

        if (remainingPlayback <= 0.05 && this.activeSources.size === 0) {
          clearInterval(interval)
          setTimeout(resolve, 450)
        } else if (now - startTime > maxWaitMs) {
          clearInterval(interval)
          resolve()
        }
      }, checkIntervalMs)
    })
  }

  public stopMicrophoneImmediate(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {
          // Ignorar
        }
      })
      this.mediaStream = null
    }
    this.analyserNode = null
    this.options.onAnalyserReady?.(null)
  }

  public dispose(): void {
    this.isDisposed = true
    this.stopPlaybackImmediately()
    this.stopMicrophoneImmediate()

    if (this.workletNode) {
      try {
        this.workletNode.disconnect()
      } catch {
        // Ignorar
      }
      this.workletNode = null
    }

    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect()
      } catch {
        // Ignorar
      }
      this.scriptProcessor = null
    }

    if (this.silentGain) {
      try {
        this.silentGain.disconnect()
      } catch {
        // Ignorar
      }
      this.silentGain = null
    }

    if (this.inputAudioCtx && this.inputAudioCtx.state !== 'closed') {
      this.inputAudioCtx.close().catch(() => {})
      this.inputAudioCtx = null
    }

    if (this.outputAnalyserNode) {
      try {
        this.outputAnalyserNode.disconnect()
      } catch {
        // Ignorar
      }
      this.outputAnalyserNode = null
      this.options.onOutputAnalyserReady?.(null)
    }

    if (this.outputAudioCtx && this.outputAudioCtx.state !== 'closed') {
      this.outputAudioCtx.close().catch(() => {})
      this.outputAudioCtx = null
    }
  }
}
