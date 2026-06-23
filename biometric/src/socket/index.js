// Singleton socket connection — shared across the whole app.
import { io } from 'socket.io-client';

const URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const socket = io(URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
});

// Convenience helpers so callers never need to guard socket.connected manually
export function safeEmit(event, data) {
  if (socket.connected) {
    socket.emit(event, data);
    return true;
  }
  console.warn(`[socket] tried to emit "${event}" but socket is not connected`);
  return false;
}
