import { useState } from 'react';
import { useI18n } from '../i18n';
import './NutritionCompare.css';

const METRICS = [
  { key: 'calories', unit: 'kcal', color: 'var(--chart-calories)' },
  { key: 'protein', unit: 'g', color: 'var(--chart-protein)' },
  { key: 'carbs', unit: 'g', color: 'var(--chart-carbs)' },
  { key: 'fat', unit: 'g', color: 'var(--chart-fat)' },
];

// Horizontal bar chart comparing per-serving nutrition across the recipes
// whose details have been loaded. Metric chips toggle what's plotted.
function NutritionCompare({ recipes, detailsById, loadingAll }) {
  const { t } = useI18n();
  const [metric, setMetric] = useState(METRICS[0]);
  const unit = t(`unit.${metric.unit}`);

  const rows = recipes
    .map((r) => ({ recipe: r, nutrition: detailsById[r.id]?.nutrition?.per_serving }))
    .filter((row) => row.nutrition && row.nutrition[metric.key] != null);

  const max = Math.max(...rows.map((row) => row.nutrition[metric.key]), 1);

  return (
    <div className="nutrition-compare">
      <div className="compare-header">
        <h3>{t('compare.title')}</h3>
        <div className="metric-toggle" role="group" aria-label={t('compare.metric')}>
          {METRICS.map((m) => (
            <button
              key={m.key}
              aria-pressed={metric.key === m.key}
              className={`metric-chip ${metric.key === m.key ? 'active' : ''}`}
              onClick={() => setMetric(m)}
            >
              {t(`macro.${m.key}`)}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="compare-empty">
          {loadingAll ? t('compare.loading') : t('compare.empty')}
        </p>
      ) : (
        <div className="compare-bars">
          {rows
            .slice()
            .sort((a, b) => b.nutrition[metric.key] - a.nutrition[metric.key])
            .map(({ recipe, nutrition }) => {
              const value = nutrition[metric.key];
              return (
                <div key={recipe.id} className="compare-row" title={`${recipe.name}: ${Math.round(value)} ${unit}`}>
                  <span className="compare-name" lang="en" dir="ltr">
                    {recipe.name}
                  </span>
                  <div className="compare-track" aria-hidden="true">
                    <div
                      className="compare-fill"
                      style={{ width: `${(value / max) * 100}%`, background: metric.color }}
                    />
                  </div>
                  <span className="compare-value">
                    {Math.round(value)} {unit}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default NutritionCompare;
