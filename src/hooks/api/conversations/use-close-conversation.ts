import { useCallback } from 'react'
import { AxiosError } from 'axios'
import { useMutate } from '../../use-mutate'
import { ResponseError } from '../../../types/api.types'
import { closeConversationService } from '../../../services/conversation.services'
import { Conversation } from '../../../types/conversation.types'
import { removeConversationSessionId } from '../../../utils/session-storage.util'

const useCloseConversation = () => {
  const closeConversation = useCallback(async (conversationId: string) => {
    const response = await closeConversationService(conversationId)
    removeConversationSessionId(conversationId)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('messenger:conversation-closed', {
          detail: { conversationId }
        })
      )
    }
    return response.data.data
  }, [])

  return useMutate<Conversation, AxiosError<ResponseError>, string>(
    closeConversation
  )
}

export default useCloseConversation
