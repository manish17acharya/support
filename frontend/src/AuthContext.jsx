import React, { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('stms_token')
    if (!token) { setLoading(false); return }

    authApi.me()
      .then(({ data }) => setUser(data))
      .catch(() => localStorage.removeItem('stms_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const { data } = await authApi.login(email, password)
    localStorage.setItem('stms_token', data.token)
    setUser(data.user)
    return data.user
  }

  const register = async (payload) => {
    const { data } = await authApi.register(payload)
    localStorage.setItem('stms_token', data.token)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try { await authApi.logout() } catch (_) {}
    localStorage.removeItem('stms_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
