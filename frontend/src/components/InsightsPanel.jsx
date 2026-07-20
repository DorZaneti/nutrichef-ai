import { useEffect, useState } from 'react';
import api from '../api/client';
import usePersistentState from '../hooks/usePersistentState';
import './InsightsPanel.css';
import SuggestionCards from './SuggestionCards';

const BULLETS = [
  { key: 'went_well', icon: '✅', title: 'What went well' },
  { key: 'bottleneck', icon: '🚧', title: 'The bottleneck' },
  { key: 'adjustment', icon: '🎯', title: 'Best adjustment for next week' },
];

// Monday of the ISO week containing `date`, as YYYY-MM-DD — matches the
// server's _iso_week_start so we can tell if our cached insight is stale.
function isoWeekStart(date) {
  const d = new Date(date);
  const dayIndex = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dayIndex);
  return d.toISOString().slice(0, 10);
}

// AI-generated 3-bullet weekly summary of the user's local activity log.
function InsightsPanel({ lastWeek, stats, online, showToast }) {
  const [cached, setCached] = usePersistentState('nutrichef.insights', null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/insights', {
        activity: lastWeek,
        streak_days: stats.streak,
        recipes_explored: stats.explored,
      });
      setCached({
        insights: response.data.insights,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error generating insights:', error);
      showToast('Could not generate insights. Is the backend running?', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate when this tab is opened, if this week's insight isn't
  // cached locally yet — the server also caches per device+week, so this
  // never triggers a redundant Opus call once someone's generated it today.
  useEffect(() => {
    if (!online) return;
    const currentWeekStart = isoWeekStart(new Date());
    const cachedWeekStart = cached ? isoWeekStart(new Date(cached.generatedAt)) : null;
    if (cachedWeekStart !== currentWeekStart) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="insights-panel">
      <SuggestionCards online={online} showToast={showToast} />

      <div className="insights-header">
        <h3>📈 Weekly Insights</h3>
        <button className="insights-btn" onClick={generate} disabled={loading || !online}>
          {loading ? 'Analyzing your week…' : cached ? 'Refresh' : 'Generate'}
        </button>
      </div>

      {!online && <p className="insights-hint">You're offline — insights will be available when you reconnect.</p>}

      {cached ? (
        <>
          <div className="insights-bullets">
            {BULLETS.map((b) => (
              <div key={b.key} className="insight-bullet">
                <span className="insight-icon">{b.icon}</span>
                <div>
                  <p className="insight-title">{b.title}</p>
                  <p className="insight-text">{cached.insights[b.key]}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="insights-timestamp">
            Generated {new Date(cached.generatedAt).toLocaleString()}
          </p>
        </>
      ) : (
        !loading && (
          <p className="insights-hint">
            Explore and cook recipes during the week, then generate a 3-bullet AI summary of how it went.
          </p>
        )
      )}
    </div>
  );
}

export default InsightsPanel;
