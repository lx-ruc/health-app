import { API_BASE } from '../utils/constants'
import { getToken, setToken, removeToken } from '../utils/storage'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  data?: any
  header?: Record<string, string>
}

function request<T = any>(options: RequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = getToken()
    uni.request({
      url: `${API_BASE}${options.url}`,
      method: (options.method || 'GET') as any,
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.header,
      },
      success: async (res) => {
        if (res.statusCode === 401) {
          const refreshed = await tryRefreshToken()
          if (refreshed) {
            request<T>(options).then(resolve).catch(reject)
          } else {
            await doLogin()
            request<T>(options).then(resolve).catch(reject)
          }
          return
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T)
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(res.data)}`))
        }
      },
      fail: (err) => reject(err),
    })
  })
}

async function tryRefreshToken(): Promise<boolean> {
  const token = getToken()
  if (!token) return false

  try {
    const res = await new Promise<any>((resolve, reject) => {
      uni.request({
        url: `${API_BASE}/auth/refresh`,
        method: 'POST',
        header: { Authorization: `Bearer ${token}` },
        success: resolve,
        fail: reject,
      })
    })
    if (res.statusCode === 200 && res.data?.token) {
      setToken(res.data.token)
      return true
    }
    return false
  } catch {
    return false
  }
}

export async function doLogin(): Promise<string> {
  // H5 dev mode: uni.login always fails, use dev-login directly
  // @ts-ignore
  if (typeof window !== 'undefined') {
    const res = await request<{ token: string }>({
      url: '/auth/dev-login',
      method: 'POST',
      data: { openid: 'test_auto_user' },
    })
    setToken(res.token)
    return res.token
  }
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: async (loginRes) => {
        try {
          const res = await request<{ token: string }>({
            url: '/auth/login',
            method: 'POST',
            data: { code: loginRes.code },
          })
          setToken(res.token)
          resolve(res.token)
        } catch (err) {
          reject(err)
        }
      },
      fail: reject,
    })
  })
}

export function get<T = any>(url: string, data?: any) {
  return request<T>({ url, method: 'GET', data })
}

export function post<T = any>(url: string, data?: any) {
  return request<T>({ url, method: 'POST', data })
}

export function put<T = any>(url: string, data?: any) {
  return request<T>({ url, method: 'PUT', data })
}

export function patch<T = any>(url: string, data?: any) {
  return request<T>({ url, method: 'PATCH', data })
}

export function del<T = any>(url: string) {
  return request<T>({ url, method: 'DELETE' })
}
