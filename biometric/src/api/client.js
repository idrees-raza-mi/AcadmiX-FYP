import axios from 'axios';

const BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage on every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('bx_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unified error handler: extract backend message where possible
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      'Network error';
    return Promise.reject(new Error(message));
  }
);

export default client;
