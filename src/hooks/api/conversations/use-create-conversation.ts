import { useCallback } from 'react'
import { AxiosError } from 'axios'
import { useMutate } from '../../use-mutate'
import { ResponseError } from '../../../types/api.types'
import { createConversationService } from '../../../services/conversation.services'
import { Conversation, CreateConversationPayload } from '../../../types/conversation.types'

const useCreateConversation = () => {
  const createConversation = useCallback(async (payload: CreateConversationPayload) => {
    const response = await createConversationService(payload)
    const conv = (response.data as any)?.data ?? response.data
    if (typeof window !== 'undefined' && conv) {
      window.dispatchEvent(
        new CustomEvent('messenger:conversation-created', {
          detail: { conversation: conv }
        })
      )
    }
    return conv as Conversation
  }, [])

  return useMutate<Conversation, AxiosError<ResponseError>, CreateConversationPayload>(
    createConversation
  )
}

export default useCreateConversation
