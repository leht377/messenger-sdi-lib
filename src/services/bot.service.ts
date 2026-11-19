import { getChatAuthHeaders, helpdeskApiUrl, httpRequest } from '../lib/http-request'
import type {
  BotStreamCallbacks,
  BotStreamDoneEvent,
  SendBotMessagePayload
} from '../types/chat-support.types'

function processSseBlock(
  block: string,
  callbacks: BotStreamCallbacks,
  state: { hasReceivedDelta: boolean; hasCompleted: boolean }
): void {
  if (!block.trim()) return

  let eventName = 'message'
  const dataLines: string[] = []

  for (const rawLine of block.split('\n')) {
    const line = rawLine.trimEnd()
    if (!line || line.startsWith(':')) continue
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  const dataStr = dataLines.join('\n').trim()
  if (!dataStr || dataStr === '[DONE]') return

  const parsed = JSON.parse(dataStr) as Record<string, unknown>

  if (eventName === 'meta') {
    callbacks.onMeta?.(parsed)
  } else if (eventName === 'delta') {
    state.hasReceivedDelta = true
    const textChunk = typeof parsed.text === 'string' ? parsed.text : ''
    callbacks.onDelta?.(textChunk)
  } else if (eventName === 'done') {
    state.hasCompleted = true
    callbacks.onDone?.(parsed as BotStreamDoneEvent)
  } else if (eventName === 'error') {
    const message =
      typeof parsed.message === 'string' && parsed.message
        ? parsed.message
        : 'Error recibido en el stream del asistente'
    throw new Error(message)
  }
}

export async function sendBotMessageSync(
  payload: SendBotMessagePayload
): Promise<BotStreamDoneEvent> {
  const response = await httpRequest<BotStreamDoneEvent>({
    url: `${helpdeskApiUrl('helpdesk', 'v1')}/chat-bot/message`,
    method: 'POST',
    data: payload
  })

  const body = response.data as unknown as Record<string, unknown>
  const normalized =
    body && typeof body === 'object' && 'data' in body && body.data && typeof body.data === 'object'
      ? (body.data as BotStreamDoneEvent)
      : (body as BotStreamDoneEvent)

  return normalized || {}
}

export interface SendBotMessageStreamOptions {
  signal?: AbortSignal
  openTimeoutMs?: number
}

export async function sendBotMessageStream(
  payload: SendBotMessagePayload,
  callbacks: BotStreamCallbacks,
  options?: SendBotMessageStreamOptions
): Promise<void> {
  const openTimeoutMs = options?.openTimeoutMs ?? 3000
  const streamUrl = `${helpdeskApiUrl('helpdesk', 'v1')}/chat-bot/message/stream`

  const internalController = new AbortController()
  let openTimedOut = false
  let externalAborted = false

  const handleExternalAbort = () => {
    externalAborted = true
    internalController.abort()
  }

  if (options?.signal) {
    if (options.signal.aborted) {
      externalAborted = true
      internalController.abort()
    } else {
      options.signal.addEventListener('abort', handleExternalAbort, { once: true })
    }
  }

  const openTimer = setTimeout(() => {
    openTimedOut = true
    internalController.abort()
  }, openTimeoutMs)

  const state = {
    hasReceivedDelta: false,
    hasCompleted: false
  }

  try {
    const response = await fetch(streamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...getChatAuthHeaders()
      },
      body: JSON.stringify(payload),
      signal: internalController.signal
    })

    clearTimeout(openTimer)

    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}: Error al conectar stream SSE`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n')
      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() || ''

      for (const block of blocks) {
        processSseBlock(block, callbacks, state)
      }
    }

    const trailing = (buffer + decoder.decode()).replace(/\r\n/g, '\n').trim()
    if (trailing) {
      for (const block of trailing.split('\n\n')) {
        processSseBlock(block, callbacks, state)
      }
    }

    if (!state.hasCompleted && !state.hasReceivedDelta) {
      throw new Error('El stream SSE finalizó sin emitir deltas')
    }
  } catch (err: unknown) {
    clearTimeout(openTimer)

    if (externalAborted || options?.signal?.aborted) {
      return
    }

    if (!state.hasReceivedDelta && !state.hasCompleted) {
      try {
        const syncResult = await sendBotMessageSync(payload)
        if (syncResult.article || syncResult.session_uuid || syncResult.state) {
          callbacks.onMeta?.({
            session_uuid: syncResult.session_uuid,
            state: syncResult.state,
            article: syncResult.article
          })
        }
        callbacks.onDone?.({
          ...syncResult,
          reply: syncResult.reply || syncResult.message || ''
        })
        return
      } catch (fallbackErr: unknown) {
        const finalError =
          fallbackErr instanceof Error
            ? fallbackErr
            : new Error('Error al enviar mensaje al asistente')
        callbacks.onError?.(finalError)
        throw finalError
      }
    }

    const streamError =
      openTimedOut
        ? new Error('Tiempo de espera agotado al abrir el stream del asistente')
        : err instanceof Error
          ? err
          : new Error('Error en la conexión de streaming del asistente')

    callbacks.onError?.(streamError)
    throw streamError
  } finally {
    clearTimeout(openTimer)
    options?.signal?.removeEventListener('abort', handleExternalAbort)
  }
}
