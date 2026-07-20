const STORAGE_KEY = 'nutrichef.deviceId';

// One anonymous UUID per device, minted once and read at module scope
// (same bootstrap pattern as the theme in main.jsx) so it's available
// before the first API call, including the axios interceptor.
function loadOrCreateDeviceId() {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export const deviceId = loadOrCreateDeviceId();

export default function useDeviceId() {
  return deviceId;
}
