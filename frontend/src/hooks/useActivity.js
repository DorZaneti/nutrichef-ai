import { useCallback, useEffect, useMemo } from 'react';
import ACHIEVEMENTS from '../achievements';
import api from '../api/client';
import usePersistentState from './usePersistentState';
import useSyncQueue from './useSyncQueue';

const MILESTONES = [1, 5, 10, 25, 50, 100];
const dayKey = (d) => d.toISOString().slice(0, 10);
const naturalKey = (e) => `${e.date}|${e.recipe_name}|${e.action}`;

function computeStreak(entries) {
  const days = new Set(entries.map((e) => e.date));
  let streak = 0;
  const cursor = new Date();
  // A streak counts consecutive active days ending today or yesterday,
  // so it doesn't reset before the day is over.
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Local activity log powering streaks, milestones, and weekly insights.
// Also the source of truth pushed to the server via the sync queue, and
// merged back down on mount so a fresh device inherits prior history.
export default function useActivity() {
  const [entries, setEntries] = usePersistentState('nutrichef.activity', []);
  // Maps achievement id -> the date it was first acknowledged (doubles as
  // the "seen" set and the earnedDate exposed on each achievement).
  const [seenAchievements, setSeenAchievements] = usePersistentState('nutrichef.seenAchievements', {});
  const { enqueue, pending } = useSyncQueue();

  const recordActivity = useCallback(
    (recipeName, action, nutrition = {}) => {
      const entry = {
        date: dayKey(new Date()),
        recipe_name: recipeName,
        action,
        calories: nutrition.calories ?? null,
        protein: nutrition.protein ?? null,
        carbs: nutrition.carbs ?? null,
        fat: nutrition.fat ?? null,
      };
      setEntries((prev) => {
        const isDuplicate = prev.some((e) => naturalKey(e) === naturalKey(entry));
        if (isDuplicate) return prev;
        return [...prev.slice(-499), entry];
      });
      // The server dedupes on the same natural key, so enqueuing unconditionally is safe.
      enqueue(entry);
    },
    [setEntries, enqueue]
  );

  // Merge down server history on mount — covers a fresh device (empty
  // localStorage) or one that fell behind another device's synced activity.
  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/sync/activity')
      .then((response) => {
        if (cancelled) return;
        const serverEntries = response.data.entries || [];
        setEntries((prev) => {
          if (serverEntries.length <= prev.length) return prev;
          const seen = new Set(prev.map(naturalKey));
          const merged = [...prev];
          for (const entry of serverEntries) {
            const key = naturalKey(entry);
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(entry);
            }
          }
          return merged.slice(-500);
        });
      })
      .catch((err) => console.error('Failed to merge activity from server:', err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const explored = new Set(entries.map((e) => e.recipe_name)).size;
    const cooked = entries.filter((e) => e.action === 'cooked').length;
    const streak = computeStreak(entries);
    const nextMilestone = MILESTONES.find((m) => m > explored) ?? null;
    const prevMilestone = [...MILESTONES].reverse().find((m) => m <= explored) ?? 0;
    const base = { explored, cooked, streak, nextMilestone, prevMilestone };

    const achievements = ACHIEVEMENTS.map((a) => {
      const earned = a.test(entries, base);
      return { ...a, earned, earnedDate: earned ? seenAchievements[a.id] ?? null : null };
    });

    return { ...base, achievements };
  }, [entries, seenAchievements]);

  // Achievements earned but not yet acknowledged — the caller celebrates
  // these once, then calls markAchievementsSeen to record today's date.
  const newlyEarned = useMemo(
    () => stats.achievements.filter((a) => a.earned && !seenAchievements[a.id]),
    [stats.achievements, seenAchievements]
  );

  const markAchievementsSeen = useCallback(() => {
    if (newlyEarned.length === 0) return;
    const today = dayKey(new Date());
    setSeenAchievements((prev) => {
      const next = { ...prev };
      newlyEarned.forEach((a) => {
        next[a.id] = today;
      });
      return next;
    });
  }, [newlyEarned, setSeenAchievements]);

  const lastWeek = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffKey = dayKey(cutoff);
    return entries.filter((e) => e.date >= cutoffKey);
  }, [entries]);

  return { entries, recordActivity, stats, lastWeek, pendingSync: pending, newlyEarned, markAchievementsSeen };
}
