import { AxiosResponse } from 'axios'
import { Conversation, FilterConversation } from '../../../types/conversation.types'
import { ResponseAPI } from '../../../types/api.types'
import { listConversationsService } from '../../../services/conversation.services'
import { useQuery } from '../../use-query'

interface Props {
  params?: FilterConversation
  enable?: boolean
}

const useListConversations = (props?: Props) => {
  const safeParams = props?.params ?? {}

  const query = useQuery<AxiosResponse<ResponseAPI<Conversation[]>>>({
    queryKey: ['list-conversations', safeParams],
    queryFn: () => listConversationsService(safeParams),
    enabled: props?.enable !== false,
    keepPreviousData: true
  })

  return {
    data: query.data?.data.data ?? [],
    meta: query.data?.data?.meta,
    links: query.data?.data.links,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    errors: query.errors,
    refetch: query.refetch,
    setData: query.setData
  }
}

export default useListConversations
