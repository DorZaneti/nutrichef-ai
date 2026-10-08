import { useCallback, useEffect, useMemo } from 'react';
import api from '../api/client';
import usePersistentState from './usePersistentState';

export const DEFAULT_PROFILE = {
  goal: 'maintain',
  daily_kcal: null,
  daily_protein_g: null,
  diet: 'none',
  allergies: [],
  sex: null,
  age: null,
  height_cm: null,
  weight_kg: null,
  activity: null,
};

// Mifflin–St Jeor × activity factor. Mirrors backend/app/services/targets.py — keep in sync.
const ACTIVITY_FACTORS = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
const GOAL_CALORIE_FACTOR = { lose: 0.8, maintain: 1.0, gain: 1.1 };
const GOAL_PROTEIN_PER_KG = { lose: 1.6, maintain: 1.2, gain: 1.6 };

export function computedTargets(profile) {
  if (!profile?.sex || !profile.weight_kg || !profile.height_cm || !profile.age) {
    return { daily_kcal: null, daily_protein_g: null };
  }
  const base = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age;
  const bmr = profile.sex === 'male' ? base + 5 : base - 161;
  const tdee = bmr * (ACTIVITY_FACTORS[profile.activity] ?? ACTIVITY_FACTORS.light);
  return {
    daily_kcal: Math.round(tdee * GOAL_CALORIE_FACTOR[profile.goal ?? 'maintain']),
    daily_protein_g: Math.round(profile.weight_kg * GOAL_PROTEIN_PER_KG[profile.goal ?? 'maintain']),
  };
}

export function dailyTargets(profile) {
  const computed = computedTargets(profile);
  return {
    daily_kcal: profile?.daily_kcal || computed.daily_kcal,
    daily_protein_g: profile?.daily_protein_g || computed.daily_protein_g,
  };
}

// Goals, diet and allergies. Local-first like everything else; mirrored to
// the server so suggestions and insights can use the same targets.
export default function useProfile(lang) {
  const [profile, setProfile] = usePersistentState('nutrichef.profile', null);

  useEffect(() => {
    if (profile) {
      api.put('/api/profile', { ...profile, language: lang }).catch(() => {});
      return;
    }
    let cancelled = false;
    api
      .get('/api/profile')
      .then((response) => {
        if (!cancelled) setProfile({ ...DEFAULT_PROFILE, ...response.data.profile });
      })
      .catch((error) => {
        if (error.response?.status !== 404) console.error('Failed to fetch profile:', error);
      });
    return () => {
      cancelled = true;
    };
    // Only on mount and when the language changes — saves push their own PUT.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const saveProfile = useCallback(
    (next) => {
      setProfile(next);
      api.put('/api/profile', { ...next, language: lang }).catch((error) => console.error('Failed to save profile:', error));
    },
    [lang, setProfile]
  );

  const targets = useMemo(() => dailyTargets(profile), [profile]);
  // What the chat agent, recipe search and insights receive.
  const apiProfile = useMemo(() => (profile ? { ...profile, language: lang } : { language: lang }), [profile, lang]);

  return { profile, saveProfile, targets, apiProfile };
}
