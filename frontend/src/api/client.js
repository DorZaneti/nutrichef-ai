import axios from 'axios';
import { deviceId } from '../hooks/useDeviceId';

// Vite proxies /api to the backend in dev, so a relative base works both
// locally and behind a reverse proxy. VITE_API_URL overrides for split deploys.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  config.headers['X-Device-Id'] = deviceId;
  return config;
});

export default api;
