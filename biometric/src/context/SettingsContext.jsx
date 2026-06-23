import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import client from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const DEFAULTS = {
  faceMatchThreshold: 0.5,
  faceCaptureSamples: 5,
  sessionAutoStart: true,
  sessionAutoComplete: false,
  attendanceWindowBefore: 10, // minutes before scheduled start
  attendanceWindowAfter: 20,  // minutes after scheduled end
  defaultLectureDuration: 40, // minutes
};

const SettingsContext = createContext(DEFAULTS);

export function SettingsProvider({ children }) {
  const { token } = useAuth();
  const [settings, setSettings] = useState(DEFAULTS);
  const [loadingSettings, setLoadingSettings] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!token) return;
    setLoadingSettings(true);
    try {
      const { data } = await client.get('/api/settings');
      setSettings((prev) => ({ ...prev, ...data }));
    } catch (err) {
      console.warn('[Settings] Failed to load settings, using defaults:', err.message);
    } finally {
      setLoadingSettings(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider value={{ settings, loadingSettings, refetchSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
