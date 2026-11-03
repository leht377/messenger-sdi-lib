const STORAGE_KEY = 'sdi_messenger_conversation_sessions'

function readSessionsMap(): Record<string, string> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function writeSessionsMap(map: Record<string, string>): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  try {
    if (Object.keys(map).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    }
  } catch {
    // Ignore storage quota or private mode errors
  }
}

export function saveConversationSessionId(
  conversationId: string | number,
  sessionId: string
): void {
  const key = String(conversationId).trim()
  const value = String(sessionId).trim()
  if (!key || !value) return

  const map = readSessionsMap()
  if (map[key] === value) return

  map[key] = value
  writeSessionsMap(map)
}

export function getConversationSessionId(
  conversationId: string | number
): string | null {
  const key = String(conversationId).trim()
  if (!key) return null

  const map = readSessionsMap()
  return map[key] ?? null
}

export function removeConversationSessionId(
  conversationId: string | number
): void {
  const key = String(conversationId).trim()
  if (!key) return

  const map = readSessionsMap()
  if (!(key in map)) return

  delete map[key]
  writeSessionsMap(map)
}

