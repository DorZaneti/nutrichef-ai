import { useEffect, useState } from 'react';
import api from '../api/client';
import usePersistentState from '../hooks/usePersistentState';
import { locale, useI18n } from '../i18n';
import './InsightsPanel.css';
import SuggestionCards from './SuggestionCards';

const BULLETS = [
  { key: 'went_well', icon: '✅' },
  { key: 'bottleneck', icon: '🚧' },
  { key: 'adjustment', icon: '🎯' },
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
function InsightsPanel({ lastWeek, stats, online, showToast, profile }) {
  const { t, lang } = useI18n();
  const [cached, setCached] = usePersistentState('nutrichef.insights', null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/insights', {
        activity: lastWeek,
        streak_days: stats.streak,
        recipes_explored: stats.explored,
        profile,
      });
      setCached({
        insights: response.data.insights,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error generating insights:', error);
      showToast(error.response?.status === 429 ? t('common.dailyLimit') : t('insights.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate when this tab is opened, if this week's insight isn't
  // cached locally yet — the server also caches per device+week, so this
  // never triggers a redundant Claude call once someone's generated it today.
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
    <section className="insights-panel" aria-labelledby="insights-title">
      <SuggestionCards online={online} showToast={showToast} />

      <div className="insights-header">
        <h3 id="insights-title">📈 {t('insights.title')}</h3>
        <button className="insights-btn" onClick={generate} disabled={loading || !online}>
          {loading ? t('insights.loading') : cached ? t('insights.refresh') : t('insights.generate')}
        </button>
      </div>

      {!online && <p className="insights-hint">{t('insights.offline')}</p>}

      {cached ? (
        <>
          <div className="insights-bullets">
            {BULLETS.map((b) => (
              <div key={b.key} className="insight-bullet">
                <span className="insight-icon" aria-hidden="true">
                  {b.icon}
                </span>
                <div>
                  <p className="insight-title">{t(`insights.${b.key}`)}</p>
                  <p className="insight-text" dir="auto">
                    {cached.insights[b.key]}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="insights-timestamp">
            {t('insights.generated', { date: new Date(cached.generatedAt).toLocaleString(locale(lang)) })}
          </p>
        </>
      ) : (
        !loading && (
          <p className="insights-hint">{t('insights.empty')}</p>
        )
      )}
    </section>
  );
}

export default InsightsPanel;
