import { useEffect, useState } from 'react';

// useState backed by localStorage — state survives reloads and works offline.
export default function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or unavailable — keep working in-memory
    }
  }, [key, value]);

  return [value, setValue];
}
