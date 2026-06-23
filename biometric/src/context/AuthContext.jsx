import React, { createContext, useContext, useState, useCallback } from 'react';
import client from '../api/client.js';
import { socket } from '../socket/index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('bx_token'));
  const [admin, setAdmin] = useState(() => {
    try {
      const raw = localStorage.getItem('bx_admin');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.post('/api/auth/admin/login', {
        email,
        password,
      });
      const { token: t, user } = data;

      localStorage.setItem('bx_token', t);
      localStorage.setItem('bx_admin', JSON.stringify(user));
      setToken(t);
      setAdmin(user);

      // Connect socket now that we are authenticated
      socket.auth = { token: t };
      socket.connect();

      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('bx_token');
    localStorage.removeItem('bx_admin');
    setToken(null);
    setAdmin(null);
    socket.disconnect();
  }, []);

  // Re-connect socket if we already have a token on app boot
  React.useEffect(() => {
    if (token && !socket.connected) {
      socket.auth = { token };
      socket.connect();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ admin, token, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
