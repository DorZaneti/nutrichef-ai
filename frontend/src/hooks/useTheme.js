import { useEffect } from 'react';
import usePersistentState from './usePersistentState';

const systemPrefersDark = () =>
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

export default function useTheme() {
  const [theme, setTheme] = usePersistentState(
    'nutrichef.theme',
    systemPrefersDark() ? 'dark' : 'light'
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return [theme, toggleTheme];
}
