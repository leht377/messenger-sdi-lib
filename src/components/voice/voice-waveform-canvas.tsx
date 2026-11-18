'use client'

import React, { useEffect, useRef } from 'react'
import type { VoiceCallState } from '../../types/voice.types'

export interface VoiceWaveformCanvasProps {
  state: VoiceCallState
  isMuted?: boolean
  className?: string
  height?: number | string
  /** Nodo Analyser de la API Web Audio para hacer reaccionar la onda al micrófono en vivo */
  analyserNode?: AnalyserNode | null
  /** Nodo Analyser de salida del asistente para hacer reaccionar la onda a la voz real de la IA */
  outputAnalyserNode?: AnalyserNode | null
  /** Nivel RMS de salida del asistente (0.0 a 1.0) para sincronizar la onda con la voz del bot */
  botRms?: number
  /** Estado del permiso del micrófono: false apaga completamente la onda */
  hasPermission?: boolean | null
}

export function VoiceWaveformCanvas({
  state,
  isMuted = false,
  className = '',
  height = 72,
  analyserNode = null,
  outputAnalyserNode = null,
  botRms = 0,
  hasPermission = null
}: VoiceWaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number | null>(null)
  const phaseRef = useRef(0)
  const freqBufferRef = useRef<Uint8Array | null>(null)
  const botFreqBufferRef = useRef<Uint8Array | null>(null)
  const smoothedBarsRef = useRef<Float32Array | null>(null)
  const botRmsRef = useRef(botRms)

  useEffect(() => {
    botRmsRef.current = botRms
  }, [botRms])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const canvasHeight = rect.height
    const centerY = canvasHeight / 2

    const numBars = 38
    const barWidth = 2.5
    const gap = 3
    const totalWidth = numBars * barWidth + (numBars - 1) * gap
    const startX = Math.max(0, (width - totalWidth) / 2)

    if (!smoothedBarsRef.current || smoothedBarsRef.current.length !== numBars) {
      smoothedBarsRef.current = new Float32Array(numBars)
      smoothedBarsRef.current.fill(2.5)
    }

    const drawBar = (x: number, y: number, barHeight: number, color: string) => {
      ctx.fillStyle = color
      ctx.beginPath()
      if (typeof (ctx as any).roundRect === 'function') {
        ;(ctx as any).roundRect(x, y, barWidth, barHeight, barWidth / 2)
      } else {
        ctx.rect(x, y, barWidth, barHeight)
      }
      ctx.fill()
    }

    const render = () => {
      ctx.clearRect(0, 0, width, canvasHeight)
      const smoothedBars = smoothedBarsRef.current!

      // 1. Muteado o Sin Permiso de Micrófono: línea plana inactiva gris
      if (state === 'muted' || isMuted || hasPermission === false) {
        const inactiveColor = 'rgba(209, 213, 219, 0.65)'
        for (let i = 0; i < numBars; i++) {
          smoothedBars[i] = 2.5
          const x = startX + i * (barWidth + gap)
          drawBar(x, centerY - 1.25, 2.5, inactiveColor)
        }
      }
      // 2. Asistente Hablando: reactivo a las frecuencias reales del altavoz y armónicos dinámicos
      else if (state === 'speaking') {
        const currentBotRms = botRmsRef.current
        let avgLevel = 0
        let hasRealAudio = false

        if (outputAnalyserNode) {
          if (!botFreqBufferRef.current || botFreqBufferRef.current.length !== outputAnalyserNode.frequencyBinCount) {
            botFreqBufferRef.current = new Uint8Array(outputAnalyserNode.frequencyBinCount)
          }
          const buf = botFreqBufferRef.current
          outputAnalyserNode.getByteFrequencyData(buf as any)
          let s = 0
          for (let b = 0; b < buf.length; b++) {
            s += buf[b]
          }
          avgLevel = s / (buf.length * 255)
          hasRealAudio = avgLevel > 0.015
        }

        const voiceEnergy = Math.max(hasRealAudio ? avgLevel * 1.6 : 0, currentBotRms)
        phaseRef.current += 0.09 + voiceEnergy * 0.14
        const activeAmp = Math.max(12, voiceEnergy * 32)
        const mainColor =
          voiceEnergy > 0.02 ? 'rgba(16, 185, 129, 0.95)' : 'rgba(16, 185, 129, 0.70)'

        for (let i = 0; i < numBars; i++) {
          const x = startX + i * (barWidth + gap)
          const norm = (i / (numBars - 1)) * 2 - 1
          const envelope = Math.max(0.22, 1 - Math.pow(norm, 2))
          const distFromCenter = Math.abs(norm)

          let freqBoost = 0
          if (hasRealAudio && botFreqBufferRef.current) {
            const buf = botFreqBufferRef.current
            const binIndex = Math.min(
              buf.length - 1,
              Math.floor((1 - distFromCenter * 0.7) * (buf.length * 0.65))
            )
            freqBoost = (buf[binIndex] / 255) * 1.5
          }

          const osc =
            Math.sin(i * 0.44 + phaseRef.current) * 0.45 +
            Math.cos(i * 0.32 - phaseRef.current * 0.75) * 0.35 +
            Math.sin(i * 0.72 + phaseRef.current * 1.1) * 0.2 +
            0.5

          const targetHeight = Math.max(
            4.0,
            activeAmp * (0.6 + freqBoost * 0.8) * envelope * Math.abs(osc)
          )
          smoothedBars[i] += (targetHeight - smoothedBars[i]) * 0.38
          const barHeight = Math.max(3.5, Math.min(canvasHeight - 4, smoothedBars[i]))
          drawBar(x, centerY - barHeight / 2, barHeight, mainColor)
        }
      }
      // 3. Escuchando al Usuario: SOLO responde al micrófono real
      else if ((state === 'listening' || state === 'connected') && analyserNode) {
        if (!freqBufferRef.current || freqBufferRef.current.length !== analyserNode.frequencyBinCount) {
          freqBufferRef.current = new Uint8Array(analyserNode.frequencyBinCount)
        }
        const freqBuffer = freqBufferRef.current
        analyserNode.getByteFrequencyData(freqBuffer as any)

        let sum = 0
        for (let b = 0; b < freqBuffer.length; b++) {
          sum += freqBuffer[b]
        }
        const avgLevel = sum / (freqBuffer.length * 255)
        const isSpeaking = avgLevel > 0.025
        const mainColor = isSpeaking ? 'rgba(16, 185, 129, 0.95)' : 'rgba(16, 185, 129, 0.45)'

        for (let i = 0; i < numBars; i++) {
          const x = startX + i * (barWidth + gap)
          const norm = (i / (numBars - 1)) * 2 - 1
          const envelope = Math.max(0.18, 1 - Math.pow(norm, 2))
          const distFromCenter = Math.abs(norm)
          const binIndex = Math.min(
            freqBuffer.length - 1,
            Math.floor((1 - distFromCenter * 0.75) * (freqBuffer.length * 0.6))
          )
          const rawFreq = freqBuffer[binIndex] / 255

          const targetHeight = isSpeaking
            ? Math.max(2.5, (rawFreq * 26 + avgLevel * 10) * envelope * 1.6)
            : 2.5

          smoothedBars[i] += (targetHeight - smoothedBars[i]) * 0.35
          const barHeight = Math.max(2.5, Math.min(canvasHeight - 4, smoothedBars[i]))
          drawBar(x, centerY - barHeight / 2, barHeight, mainColor)
        }
      }
      // 4. Pensando / Conectando / Sin micrófono activo: línea plana en reposo
      else {
        const calmColor =
          state === 'connecting' || state === 'thinking' || state === 'reconnecting'
            ? 'rgba(16, 185, 129, 0.4)'
            : 'rgba(209, 213, 219, 0.65)'

        for (let i = 0; i < numBars; i++) {
          smoothedBars[i] = 2.5
          const x = startX + i * (barWidth + gap)
          drawBar(x, centerY - 1.25, 2.5, calmColor)
        }
      }

      animFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [state, isMuted, analyserNode, outputAnalyserNode, hasPermission])

  const heightStyle = typeof height === 'number' ? `${height}px` : height

  return (
    <canvas
      ref={canvasRef}
      className={`w-full block pointer-events-none ${className}`}
      style={{ width: '100%', height: heightStyle }}
    />
  )
}
