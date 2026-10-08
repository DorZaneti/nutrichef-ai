import useCountUp from '../hooks/useCountUp';
import { useI18n } from '../i18n';

// Streak + exploration milestone. Lives on the Progress tab so the header
// stays focused on today's food.
function ProgressSummary({ stats }) {
  const { t } = useI18n();
  const displayedExplored = useCountUp(stats.explored);
  if (stats.streak === 0 && stats.explored === 0) return null;

  const progress = stats.nextMilestone ? Math.min(100, (stats.explored / stats.nextMilestone) * 100) : 100;

  return (
    <section className="progress-summary" aria-label={t('progress.title')}>
      {stats.streak > 0 && <div className="streak-badge">{t('progress.streak', { n: stats.streak })}</div>}
      {stats.explored > 0 && stats.nextMilestone && (
        <div className="milestone">
          <span className="milestone-label">
            {t('progress.milestone', { n: displayedExplored, next: stats.nextMilestone })}
          </span>
          <div
            className="milestone-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={stats.nextMilestone}
            aria-valuenow={stats.explored}
            aria-label={t('progress.milestone', { n: stats.explored, next: stats.nextMilestone })}
          >
            <div className="milestone-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </section>
  );
}

export default ProgressSummary;
