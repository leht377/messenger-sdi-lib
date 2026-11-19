import axios, { AxiosRequestConfig, AxiosResponse, Method } from 'axios'
import type { ResponseAPI } from '../types/api.types'

interface ChatHttpConfig {
  apiBaseUrl: string
  apiHelpdeskBaseUrl?: string
  authToken: string
}

interface HttpRequestProps extends Omit<AxiosRequestConfig, 'data' | 'params' | 'url' | 'method'> {
  data?: unknown
  url: string
  params?: object
  method: Method
  headers?: Record<string, string>
}

let chatHttpConfig: ChatHttpConfig | null = null

export const configureChatHttp = (config: ChatHttpConfig) => {
  chatHttpConfig = config
}

export const getChatAuthHeaders = (): Record<string, string> => {
  return chatHttpConfig?.authToken ? { Authorization: `Bearer ${chatHttpConfig.authToken}` } : {}
}

const convertBooleanParamsToNumber = (params: object) =>
  Object.entries(params).reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[key] = typeof value === 'boolean' ? Number(value) : value
    return acc
  }, {})

export const chatApiUrl = (service: string, version: string) => {
  if (!chatHttpConfig) {
    throw new Error('El cliente HTTP del chat no ha sido configurado')
  }

  const baseUrl = chatHttpConfig.apiBaseUrl.replace(/\/+$/, '')
  return `${baseUrl}/${service}/api/${version}`
}

const isIpAddress = (value: string): boolean => {
  try {
    const hostname = new URL(value.includes('://') ? value : `http://${value}`).hostname

    const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$/

    return ipRegex.test(hostname) && hostname.split('.').every((octet) => Number(octet) <= 255)
  } catch {
    return false
  }
}

export const helpdeskApiUrl = (service: string, version: string) => {
  if (!chatHttpConfig) {
    throw new Error('El cliente HTTP del chat no ha sido configurado')
  }

  const baseUrl = chatHttpConfig.apiHelpdeskBaseUrl
    ? chatHttpConfig.apiHelpdeskBaseUrl.replace(/\/+$/, '')
    : chatHttpConfig.apiBaseUrl.replace(/\/+$/, '')

  if (isIpAddress(baseUrl)) return `${baseUrl}/${service}/api/${version}`
  return `${baseUrl}/api/${version}`
}

export const httpRequest = async <TResponse>({
  data,
  url,
  params,
  method,
  headers,
  ...rest
}: HttpRequestProps): Promise<AxiosResponse<ResponseAPI<TResponse>>> => {
  if (!chatHttpConfig) {
    throw new Error('El cliente HTTP del chat no ha sido configurado')
  }

  const config: AxiosRequestConfig = {
    ...rest,
    url,
    method,
    data,
    params: params ? convertBooleanParamsToNumber(params) : undefined,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
      ...(chatHttpConfig.authToken ? { Authorization: `Bearer ${chatHttpConfig.authToken}` } : {}),
      ...headers
    }
  }

  return axios.request<ResponseAPI<TResponse>>(config)
}
