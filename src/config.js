import { Platform } from 'react-native';

// ─── Deployed backend (default) ──────────────────────────────────────────────
// The app talks to the cloud server, so the phone works on ANY network
// (mobile data or any Wi-Fi) — it does NOT need to be on the same network as
// your PC.
const PRODUCTION_URL = 'https://academicx-server.vercel.app';

// ─── Local development (optional) ────────────────────────────────────────────
// Set USE_LOCAL = true to talk to a server running on your PC instead.
// Then phone + PC must be on the same Wi-Fi and LOCAL_IP must be your PC's LAN IP.
const USE_LOCAL = false;
const LOCAL_IP = '192.168.100.167';
const USE_ANDROID_EMULATOR = false; // true only for Android Studio emulator

function getServerUrl() {
  if (!USE_LOCAL) return PRODUCTION_URL;
  if (Platform.OS === 'android' && USE_ANDROID_EMULATOR) return 'http://10.0.2.2:5000';
  return `http://${LOCAL_IP}:5000`;
}

export const SERVER_URL = getServerUrl();
export const API_BASE_URL = `${SERVER_URL}/api`;
