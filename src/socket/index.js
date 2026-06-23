import { io } from 'socket.io-client';
import { SERVER_URL } from '../config';

// Lazy singleton — one shared connection for the whole app.
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
    });
  }
  return socket;
}

export function joinBatch(batchId) {
  if (!batchId) return;
  getSocket().emit('join_batch', { batchId: String(batchId) });
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}
