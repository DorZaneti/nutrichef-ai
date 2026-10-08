import { useEffect, useState } from 'react';
import api from '../api/client';
import usePersistentState from '../hooks/usePersistentState';
import { useI18n } from '../i18n';
import './SuggestionCards.css';

const SEVERITY_ICON = { high: '🔥', medium: '⚠️', low: '💡' };

// Localized title/message from the suggestion's type + params; the server's
// English text is the fallback for any type the UI doesn't know yet.
function localize(t, s) {
  const base = `suggestion.${s.type}`;
  if (!s.params || t(`${base}.title`) === `${base}.title`) return { title: s.title, message: s.message };
  let message = t(`${base}.message`, s.params);
  if (s.type === 'protein_low' && s.params.target) message += t(`${base}.target`, s.params);
  return { title: t(`${base}.title`, s.params), message };
}

// Server-computed rule-based nudges (streak at risk, low protein, plateauing
// exploration, browsing without cooking) — at most 2, most severe first.
function SuggestionCards({ online, showToast }) {
  const { t } = useI18n();
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
          showToast?.(`🔥 ${localize(t, streakSuggestion).title}`, 'info');
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
      {suggestions.map((s) => {
        const { title, message } = localize(t, s);
        return (
          <div key={s.id} className={`suggestion-card severity-${s.severity}`}>
            <span className="suggestion-icon" aria-hidden="true">
              {SEVERITY_ICON[s.severity] ?? '💡'}
            </span>
            <div className="suggestion-body">
              <p className="suggestion-title">{title}</p>
              <p className="suggestion-message">{message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SuggestionCards;
