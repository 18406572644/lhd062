import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

let isRedirecting = false
let lastClearTime = 0

const WHITE_LIST = ['/auth/login', '/auth/register', '/health']

const request = axios.create({
  baseURL: '/api',
  timeout: 15000
})

request.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = 'Bearer ' + token
      }
      
      const currentSpace = localStorage.getItem('currentSpace')
      if (currentSpace) {
        const space = JSON.parse(currentSpace)
        if (space.type === 'family' && space.id) {
          config.headers['X-Family-ID'] = space.id
        }
      }
    } catch (e) {
      console.warn('读取 token 或空间信息失败', e)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  (response) => {
    if (response.config.responseType === 'blob') {
      return response
    }
    return response.data
  },
  async (error) => {
    if (error.response) {
      const { status, data, config } = error.response
      const url = config?.url || ''
      const isWhiteList = WHITE_LIST.some(api => url.includes(api))
      
      let errorMessage = '请求失败'
      
      if (config.responseType === 'blob' && data instanceof Blob) {
        try {
          const text = await data.text()
          const json = JSON.parse(text)
          errorMessage = json.message || errorMessage
        } catch (e) {
          errorMessage = `请求失败 (${status})`
        }
      } else {
        errorMessage = data?.message || errorMessage
      }
      
      if (status === 401 && !isWhiteList) {
        const currentPath = window.location.pathname
        const isLoginOrRegisterPage = currentPath === '/login' || currentPath === '/register'
        
        if (!isLoginOrRegisterPage && !isRedirecting) {
          const now = Date.now()
          if (now - lastClearTime > 2000) {
            lastClearTime = now
            isRedirecting = true
            try {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
            } catch (e) {
              console.warn('清除 token 失败', e)
            }
            
            ElMessage.error('登录已过期，请重新登录')
            router.replace('/login').finally(() => {
              setTimeout(() => {
                isRedirecting = false
              }, 1500)
            })
          }
        }
      } else if (status !== 401 && !isWhiteList) {
        ElMessage.error(errorMessage)
      } else if (status === 401 && isWhiteList) {
        ElMessage.error(errorMessage || '用户名或密码错误')
      }
      
      return Promise.reject(new Error(errorMessage || `请求失败 (${status})`))
    } else {
      if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
        ElMessage.error('请求超时，请稍后重试')
      } else if (typeof window !== 'undefined' && !window.navigator.onLine) {
        ElMessage.error('网络连接不可用')
      } else {
        ElMessage.error('网络连接失败')
      }
      return Promise.reject(error)
    }
  }
)

export default request
