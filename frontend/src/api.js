import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stms_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('stms_token')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

export default api

export const authApi = {
  login:  (email, password) => api.post('/auth/login', { email, password }),
  logout: ()               => api.post('/auth/logout'),
  me:     ()               => api.get('/auth/me'),
}
