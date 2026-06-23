import { createContext, useContext, useState, useCallback } from 'react'
import api from '../api/axios'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ax_user')) } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const register = useCallback(async (name, email, password) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/admin/register', { name, email, password })
      localStorage.setItem('ax_token', data.token)
      localStorage.setItem('ax_user', JSON.stringify(data.user))
      setUser(data.user)
      return { ok: true }
    } catch (e) {
      return { ok: false, message: e.response?.data?.message || 'Registration failed' }
    } finally { setLoading(false) }
  }, [])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/admin/login', { email, password })
      localStorage.setItem('ax_token', data.token)
      localStorage.setItem('ax_user', JSON.stringify(data.user))
      setUser(data.user)
      return { ok: true }
    } catch (e) {
      return { ok: false, message: e.response?.data?.message || 'Login failed' }
    } finally { setLoading(false) }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('ax_token')
    localStorage.removeItem('ax_user')
    setUser(null)
  }, [])

  // Called after department setup to refresh user state
  const refreshUser = useCallback((updates) => {
    const updated = { ...user, ...updates }
    localStorage.setItem('ax_user', JSON.stringify(updated))
    setUser(updated)
  }, [user])

  const needsSetup = user && !user.departmentId && user.role !== 'superadmin'

  return (
    <AuthCtx.Provider value={{ user, register, login, logout, loading, refreshUser, needsSetup }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
