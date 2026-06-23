import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({ baseURL: `${BASE}/api`, timeout: 15000 })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('ax_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ax_token')
      localStorage.removeItem('ax_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
