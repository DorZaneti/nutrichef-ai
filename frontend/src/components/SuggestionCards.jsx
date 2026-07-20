import { useEffect, useState } from 'react';
import api from '../api/client';
import usePersistentState from '../hooks/usePersistentState';
import './SuggestionCards.css';

const SEVERITY_ICON = { high: '🔥', medium: '⚠️', low: '💡' };

// Server-computed rule-based nudges (streak at risk, low protein, plateauing
// exploration, browsing without cooking) — at most 2, most severe first.
function SuggestionCards({ online, showToast }) {
  const [suggestions, setSuggestions] = useState([]);
  const [lastNudge, setLastNudge] = usePersistentState('nutrichef.lastStreakNudge', null);

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    api
      .get('/api/suggestions')
      .then((response) => {
        if (cancelled) return;
        const data = response.data.suggestions || [];
        setSuggestions(data);

        const streakSuggestion = data.find((s) => s.type === 'streak_at_risk');
        const today = new Date().toISOString().slice(0, 10);
        if (streakSuggestion && lastNudge !== today) {
          showToast?.(`🔥 ${streakSuggestion.title}`, 'info');
          setLastNudge(today);
        }
      })
      .catch((error) => console.error('Failed to fetch suggestions:', error));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  if (suggestions.length === 0) return null;

  return (
    <div className="suggestion-cards">
      {suggestions.map((s) => (
        <div key={s.id} className={`suggestion-card severity-${s.severity}`}>
          <span className="suggestion-icon">{SEVERITY_ICON[s.severity] ?? '💡'}</span>
          <div className="suggestion-body">
            <p className="suggestion-title">{s.title}</p>
            <p className="suggestion-message">{s.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SuggestionCards;
