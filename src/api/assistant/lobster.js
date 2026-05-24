import request from '@/utils/request'
import { getToken } from '@/utils/auth'

export function getOpenClawConfig() {
  return request({ url: '/assistant/openclaw/config', method: 'get' })
}

export function checkOpenClawHealth() {
  return request({ url: '/assistant/openclaw/health', method: 'get' })
}

export function getChatHistory(sessionKey) {
  return request({
    url: '/assistant/openclaw/chat/history',
    method: 'get',
    params: { sessionKey }
  })
}

export function getCurrentAgent() {
  return request({ url: '/assistant/openclaw/agent/current', method: 'get' })
}

export function abortChat(sessionKey) {
  return request({
    url: '/assistant/openclaw/chat/abort',
    method: 'post',
    data: { sessionKey }
  })
}

export function sendChatMessage(sessionKey, message, signal) {
  const baseURL = process.env.VUE_APP_BASE_API || ''
  return fetch(baseURL + '/assistant/openclaw/chat/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    },
    body: JSON.stringify({ sessionKey, message }),
    signal
  })
}
