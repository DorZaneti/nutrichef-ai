import { useMemo } from 'react';

const TOKENS = [
  'chart-protein',
  'chart-carbs',
  'chart-fat',
  'chart-calories',
  'chart-track',
  'text-1',
  'text-2',
  'text-3',
  'border',
  'surface',
  'surface-2',
  'primary',
];

// Recharts needs concrete color strings, not CSS custom properties. Resolves
// the design tokens via getComputedStyle; pass the current theme value so
// callers re-resolve whenever it flips (the tokens themselves don't change,
// only what they resolve to).
export default function useChartColors(theme) {
  return useMemo(() => {
    const styles = getComputedStyle(document.documentElement);
    const colors = {};
    for (const token of TOKENS) {
      colors[token] = styles.getPropertyValue(`--${token}`).trim();
    }
    return colors;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
}
