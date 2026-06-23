import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const request = async (method, path, body = null) => {
  const token = await AsyncStorage.getItem('ax_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  } catch (err) {
    if (err.message === 'Network request failed') throw new Error('Cannot connect to server');
    throw err;
  }
};

// Multipart upload (FormData). Do NOT set Content-Type — fetch adds the
// correct multipart boundary automatically.
const upload = async (path, formData) => {
  const token = await AsyncStorage.getItem('ax_token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', headers, body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  } catch (err) {
    if (err.message === 'Network request failed') throw new Error('Cannot connect to server');
    throw err;
  }
};

const api = {
  get:    (path)       => request('GET',    path),
  post:   (path, body) => request('POST',   path, body),
  put:    (path, body) => request('PUT',    path, body),
  delete: (path)       => request('DELETE', path),
  upload,
};

export default api;
