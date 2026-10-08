import { useI18n } from '../i18n';
import './TodaySummary.css';

const R = 16;
const CIRC = 2 * Math.PI * R;

// Header widget: calories eaten today against the daily target, plus protein.
// Opens the goals sheet — the one place targets are set.
function TodaySummary({ todayTotals, targets, onOpenProfile }) {
  const { t } = useI18n();
  const kcal = Math.round(todayTotals.calories);
  const protein = Math.round(todayTotals.protein);
  const kcalTarget = targets.daily_kcal;
  const proteinTarget = targets.daily_protein_g;
  const fraction = kcalTarget ? Math.min(1, kcal / kcalTarget) : 0;
  const over = kcalTarget && kcal > kcalTarget;

  return (
    <button
      className="today-summary"
      onClick={onOpenProfile}
      aria-label={`${t('today.aria', { kcal, protein })}. ${t('header.profile')}`}
    >
      <svg viewBox="0 0 40 40" className="today-ring" aria-hidden="true">
        <circle cx="20" cy="20" r={R} className="today-ring-track" />
        {kcalTarget && (
          <circle
            cx="20"
            cy="20"
            r={R}
            className={`today-ring-fill ${over ? 'over' : ''}`}
            strokeDasharray={`${fraction * CIRC} ${CIRC}`}
            transform="rotate(-90 20 20)"
          />
        )}
      </svg>
      <span className="today-text" aria-hidden="true">
        <span className="today-title">{t('today.title')}</span>
        <span className="today-kcal">
          {kcalTarget ? t('today.kcal', { eaten: kcal, target: kcalTarget }) : t('today.kcalNoTarget', { eaten: kcal })}
        </span>
        <span className="today-protein">
          {proteinTarget
            ? t('today.proteinTarget', { eaten: protein, target: proteinTarget })
            : kcalTarget
              ? t('today.protein', { eaten: protein })
              : t('today.setGoals')}
        </span>
      </span>
    </button>
  );
}

export default TodaySummary;
