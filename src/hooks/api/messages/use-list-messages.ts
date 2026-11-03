import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AxiosResponse } from 'axios'
import { listMessagesService } from '../../../services/message.services'
import { ConversationMessage, Message, MessageParams } from '../../../types/message.types'
import { ResponseApiMessage } from '../../../types/api.types'
import { mergeOlderGroups, prependMessage } from '../../../utils/message.util'

interface Props {
  params: MessageParams
  enabled?: boolean
}

function getNextCursor(
  lastPage: AxiosResponse<ResponseApiMessage<ConversationMessage[]>> | undefined,
  visitedCursors: string[]
): string | undefined {
  if (!lastPage) return undefined
  const pageData = lastPage.data?.data ?? []

  // 1. Si no hay datos o la lista viene vacía, no hay más páginas
  if (!Array.isArray(pageData) || pageData.length === 0) {
    return undefined
  }

  // Contar si hay mensajes dentro de los grupos devueltos
  const totalMessages = pageData.reduce(
    (acc, group) => acc + (Array.isArray(group?.messages) ? group.messages.length : 0),
    0
  )
  if (totalMessages === 0) {
    return undefined
  }

  const meta = lastPage.data?.meta

  // 2. Si el backend explícitamente indica que no hay más registros
  if (meta?.has_more === false) {
    return undefined
  }

  // 3. Extraer el cursor candidato desde meta o links
  let rawCursor: string | null | undefined = meta?.next_cursor

  if (!rawCursor) {
    const nextLink = lastPage.data?.links?.next
    if (nextLink) {
      try {
        const url = new URL(nextLink, 'http://localhost')
        rawCursor =
          url.searchParams.get('page[cursor]') ||
          url.searchParams.get('cursor') ||
          undefined
      } catch {
        // ignore parsing error
      }
    }
  }

  // 4. Validar que no sea nulo, vacío ni los strings "null" o "undefined"
  if (
    !rawCursor ||
    rawCursor === 'null' ||
    rawCursor === 'undefined' ||
    rawCursor.trim() === ''
  ) {
    return undefined
  }

  // 5. Si este cursor ya fue consultado en alguna página previa, evitar bucle infinito
  if (visitedCursors.includes(rawCursor)) {
    return undefined
  }

  return rawCursor
}

const useListMessages = ({ params, enabled = true }: Props) => {
  const isEnabled = enabled && Boolean(params?.conversation)

  const [pages, setPages] = useState<AxiosResponse<ResponseApiMessage<ConversationMessage[]>>[]>([])
  const [visitedCursors, setVisitedCursors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(isEnabled)
  const [isFetching, setIsFetching] = useState(isEnabled)
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false)
  const [errors, setErrors] = useState<any>({})

  const paramsRef = useRef(params)
  paramsRef.current = params

  const isFetchingRef = useRef(false)
  const conversationId = params?.conversation

  const lastPage = pages[pages.length - 1]
  const nextCursor = getNextCursor(lastPage, visitedCursors)
  const hasNextPage = Boolean(nextCursor)

  const fetchFirstPage = useCallback(async () => {
    if (!paramsRef.current?.conversation) return
    setIsLoading(true)
    setIsFetching(true)
    isFetchingRef.current = true
    setErrors({})

    try {
      const response = await listMessagesService({
        ...paramsRef.current,
        page: {
          ...paramsRef.current?.page
        }
      })
      setPages([response])
      setVisitedCursors([])
    } catch (err: any) {
      setErrors(err?.response?.data ?? err?.data ?? {})
    } finally {
      setIsLoading(false)
      setIsFetching(false)
      isFetchingRef.current = false
    }
  }, [])

  const fetchNextPage = useCallback(async () => {
    if (!hasNextPage || !nextCursor || isFetchingRef.current || !paramsRef.current?.conversation) {
      return
    }

    setIsFetchingNextPage(true)
    setIsFetching(true)
    isFetchingRef.current = true

    try {
      const response = await listMessagesService({
        ...paramsRef.current,
        cursor: nextCursor,
        page: {
          ...paramsRef.current?.page,
          cursor: nextCursor
        }
      })

      setPages((prevPages) => [...prevPages, response])
      setVisitedCursors((prevCursors) => [...prevCursors, nextCursor])
    } catch (err: any) {
      setErrors(err?.response?.data ?? err?.data ?? {})
    } finally {
      setIsFetchingNextPage(false)
      setIsFetching(false)
      isFetchingRef.current = false
    }
  }, [hasNextPage, nextCursor])

  const prependIncomingMessage = useCallback((message: Message) => {
    setPages((prevPages) => {
      if (!prevPages || prevPages.length === 0) {
        return [
          {
            data: {
              data: prependMessage([], message)
            }
          } as AxiosResponse<ResponseApiMessage<ConversationMessage[]>>
        ]
      }
      const firstPage = prevPages[0]
      const currentGroups = firstPage.data?.data ?? []
      const updatedGroups = prependMessage(currentGroups, message)

      return [
        {
          ...firstPage,
          data: {
            ...firstPage.data,
            data: updatedGroups
          }
        },
        ...prevPages.slice(1)
      ]
    })
  }, [])

  useEffect(() => {
    if (!isEnabled || !conversationId) {
      setPages([])
      setVisitedCursors([])
      setIsLoading(false)
      setIsFetching(false)
      return
    }

    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setIsFetching(true)
      isFetchingRef.current = true
      setErrors({})

      try {
        const response = await listMessagesService({
          ...params,
          page: {
            ...params?.page
          }
        })
        if (isMounted) {
          setPages([response])
          setVisitedCursors([])
        }
      } catch (err: any) {
        if (isMounted) {
          setErrors(err?.response?.data ?? err?.data ?? {})
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
          setIsFetching(false)
          isFetchingRef.current = false
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [conversationId, isEnabled])

  const messages = useMemo(() => {
    if (!pages || pages.length === 0) return [] as ConversationMessage[]
    return pages.reduce<ConversationMessage[]>((acc, page) => {
      const pageGroups = page?.data?.data ?? []
      return mergeOlderGroups(acc, pageGroups)
    }, [])
  }, [pages])

  return {
    data: messages,
    rawPages: pages,
    isLoading,
    isPending: isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    errors,
    refetch: fetchFirstPage,
    prependIncomingMessage,
    meta: pages[0]?.data?.meta
  }
}

export default useListMessages
