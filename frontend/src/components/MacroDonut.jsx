import { useI18n } from '../i18n';
import './MacroDonut.css';

const SEGMENTS = [
  { key: 'protein', color: 'var(--chart-protein)' },
  { key: 'carbs', color: 'var(--chart-carbs)' },
  { key: 'fat', color: 'var(--chart-fat)' },
];

const R = 42;
const CIRC = 2 * Math.PI * R;

// SVG donut showing the protein/carbs/fat split of a recipe.
function MacroDonut({ nutrition }) {
  const { t } = useI18n();
  const total = SEGMENTS.reduce((sum, s) => sum + (nutrition[s.key] || 0), 0);
  if (!total) return null;

  let offset = 0;
  const arcs = SEGMENTS.map((seg) => {
    const value = nutrition[seg.key] || 0;
    const fraction = value / total;
    const arc = { ...seg, label: t(`macro.${seg.key}`), value, fraction, dashOffset: -offset * CIRC };
    offset += fraction;
    return arc;
  });

  return (
    <div className="macro-donut">
      <svg viewBox="0 0 120 120" className="macro-donut-svg" role="img"
        aria-label={`${t('macro.breakdown')}: ${Math.round(nutrition.calories || 0)} ${t('unit.kcal')}, ${arcs
          .map((a) => `${a.label} ${t('fmt.grams', { n: Math.round(a.value) })}`)
          .join(', ')}`}
      >
        <circle cx="60" cy="60" r={R} className="macro-donut-track" strokeWidth="14" fill="none" />
        {arcs.map((arc) => (
          <circle
            key={arc.key}
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={arc.color}
            strokeWidth="14"
            strokeDasharray={`${arc.fraction * CIRC} ${CIRC}`}
            strokeDashoffset={arc.dashOffset}
            transform="rotate(-90 60 60)"
            className="macro-donut-arc"
          >
            <title>{`${arc.label}: ${Math.round(arc.value)}g (${Math.round(arc.fraction * 100)}%)`}</title>
          </circle>
        ))}
        <text x="60" y="56" textAnchor="middle" className="macro-donut-value">
          {Math.round(nutrition.calories || 0)}
        </text>
        <text x="60" y="72" textAnchor="middle" className="macro-donut-unit">
          {t('unit.kcal')}
        </text>
      </svg>
      <div className="macro-donut-legend">
        {arcs.map((arc) => (
          <div key={arc.key} className="macro-legend-item">
            <span className="macro-legend-dot" style={{ background: arc.color }} aria-hidden="true" />
            <span className="macro-legend-label">{arc.label}</span>
            <span className="macro-legend-value">{t('fmt.grams', { n: Math.round(arc.value) })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MacroDonut;
