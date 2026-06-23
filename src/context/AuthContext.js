import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { disconnectSocket } from '../socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [role, setRole]   = useState(null); // 'admin' | 'student'
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet(['ax_token', 'ax_user', 'ax_role']).then(pairs => {
      const t = pairs[0][1], u = pairs[1][1], r = pairs[2][1];
      if (t && u && r) {
        setToken(t);
        try { setUser(JSON.parse(u)); } catch {}
        setRole(r);
      }
      setLoading(false);
    });
  }, []);

  const setAuth = async (token, user, role) => {
    await AsyncStorage.multiSet([
      ['ax_token', token],
      ['ax_user', JSON.stringify(user)],
      ['ax_role', role],
    ]);
    setToken(token);
    setUser(user);
    setRole(role);
  };

  const updateUser = async (updates) => {
    const updated = { ...user, ...updates };
    await AsyncStorage.setItem('ax_user', JSON.stringify(updated));
    setUser(updated);
  };

  const logout = async () => {
    disconnectSocket();
    await AsyncStorage.multiRemove(['ax_token', 'ax_user', 'ax_role']);
    setToken(null);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, token, loading, setAuth, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
