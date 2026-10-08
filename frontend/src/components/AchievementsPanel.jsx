import { locale, useI18n } from '../i18n';
import './AchievementsPanel.css';

// Horizontal progression timeline — earned badges glow with the brand
// gradient, locked ones sit flat in --surface-3 until unlocked.
function AchievementsPanel({ achievements }) {
  const { t, lang } = useI18n();
  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <section className="achievements-panel" aria-labelledby="achievements-title">
      <div className="achievements-header">
        <h3 id="achievements-title">🏆 {t('achievements.title')}</h3>
        <span className="achievements-count">
          {earnedCount}/{achievements.length}
        </span>
      </div>

      <ul className="achievements-timeline">
        {achievements.map((a) => (
          <li
            key={a.id}
            className={`achievement-node ${a.earned ? 'earned' : 'locked'}`}
            title={t(`ach.${a.id}.desc`)}
          >
            <div className="achievement-badge" aria-hidden="true">
              {a.earned ? a.icon : '🔒'}
            </div>
            <p className="achievement-title">
              {t(`ach.${a.id}.title`)}
              {!a.earned && <span className="visually-hidden"> ({t('achievements.locked')})</span>}
            </p>
            <p className="visually-hidden">{t(`ach.${a.id}.desc`)}</p>
            {a.earned && a.earnedDate && (
              <p className="achievement-date">{new Date(a.earnedDate).toLocaleDateString(locale(lang))}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default AchievementsPanel;
