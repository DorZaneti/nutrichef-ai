import { useCallback, useEffect, useRef } from 'react';
import api from '../api/client';
import usePersistentState from './usePersistentState';
import useOnlineStatus from './useOnlineStatus';

// Queues activity entries and flushes them to the server as one batch POST.
// The server dedupes by natural key (device + date + recipe + action), so a
// retried flush after a dropped connection is always safe.
export default function useSyncQueue() {
  const [queue, setQueue] = usePersistentState('nutrichef.syncQueue', []);
  const online = useOnlineStatus();
  const queueRef = useRef(queue);
  const flushingRef = useRef(false);
  const debounceRef = useRef(null);
  queueRef.current = queue;

  const flush = useCallback(async () => {
    if (flushingRef.current || queueRef.current.length === 0 || !navigator.onLine) return;
    flushingRef.current = true;
    const batch = queueRef.current;
    try {
      await api.post('/api/sync/activity', { entries: batch });
      setQueue((prev) => prev.slice(batch.length));
    } catch (err) {
      console.error('Activity sync failed, will retry:', err);
    } finally {
      flushingRef.current = false;
    }
  }, [setQueue]);

  const enqueue = useCallback(
    (entry) => {
      setQueue((prev) => [...prev, entry]);
    },
    [setQueue]
  );

  // Flush shortly after new entries queue up, so a burst of activity is sent as one batch.
  useEffect(() => {
    if (!online || queue.length === 0) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(flush, 2000);
    return () => clearTimeout(debounceRef.current);
  }, [queue, online, flush]);

  // Flush immediately on mount and whenever the connection comes back.
  useEffect(() => {
    if (online) flush();
  }, [online, flush]);

  return { enqueue, flush, pending: queue.length };
}
