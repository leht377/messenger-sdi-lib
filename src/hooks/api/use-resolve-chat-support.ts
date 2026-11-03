import { useCallback } from 'react'
import { AxiosError } from 'axios'
import { useMutate } from '../use-mutate'
import { ResponseError } from '../../types/api.types'
import { resolveChatSupportService } from '../../services/chat-support.services'
import {
  ResolveChatSupportPayload,
  ResolveChatSupportResponse
} from '../../types/chat-support.types'

export const useResolveChatSupport = () => {
  const resolveSupport = useCallback(async (payload: ResolveChatSupportPayload) => {
    const response = await resolveChatSupportService(payload)
    const data = ((response.data as any)?.data ?? response.data) as ResolveChatSupportResponse
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('messenger:conversation-closed'))
      window.dispatchEvent(new CustomEvent('messenger:conversation-updated'))
    }
    return data
  }, [])

  return useMutate<
    ResolveChatSupportResponse,
    AxiosError<ResponseError>,
    ResolveChatSupportPayload
  >(resolveSupport)
}

export default useResolveChatSupport

