import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

let isRefreshing = false

const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      
      if (status === 401) {
        if (!isRefreshing) {
          isRefreshing = true
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          const currentPath = router.currentRoute.value.path
          if (currentPath !== '/login' && currentPath !== '/register') {
            ElMessage.error('登录已过期，请重新登录')
            router.push('/login')
          }
          setTimeout(() => {
            isRefreshing = false
          }, 1000)
        }
      } else {
        ElMessage.error(data.message || '请求失败')
      }
    } else {
      ElMessage.error('网络连接失败')
    }
    
    return Promise.reject(error)
  }
)

export default request
