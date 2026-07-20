import { useState } from 'react';
import './NutritionCompare.css';

const METRICS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: 'var(--chart-calories)' },
  { key: 'protein', label: 'Protein', unit: 'g', color: 'var(--chart-protein)' },
  { key: 'carbs', label: 'Carbs', unit: 'g', color: 'var(--chart-carbs)' },
  { key: 'fat', label: 'Fat', unit: 'g', color: 'var(--chart-fat)' },
];

// Horizontal bar chart comparing nutrition across the recipes whose
// details have been loaded. Metric chips toggle what's plotted.
function NutritionCompare({ recipes, detailsById, loadingAll }) {
  const [metric, setMetric] = useState(METRICS[0]);

  const rows = recipes
    .map((r) => ({ recipe: r, nutrition: detailsById[r.id]?.nutrition }))
    .filter((row) => row.nutrition && row.nutrition[metric.key] != null);

  const max = Math.max(...rows.map((row) => row.nutrition[metric.key]), 1);

  return (
    <div className="nutrition-compare">
      <div className="compare-header">
        <h3>Compare Nutrition</h3>
        <div className="metric-toggle" role="tablist" aria-label="Nutrition metric">
          {METRICS.map((m) => (
            <button
              key={m.key}
              role="tab"
              aria-selected={metric.key === m.key}
              className={`metric-chip ${metric.key === m.key ? 'active' : ''}`}
              onClick={() => setMetric(m)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="compare-empty">
          {loadingAll ? 'Loading nutrition…' : 'Nutrition will appear here once recipes are loaded.'}
        </p>
      ) : (
        <div className="compare-bars">
          {rows
            .slice()
            .sort((a, b) => b.nutrition[metric.key] - a.nutrition[metric.key])
            .map(({ recipe, nutrition }) => {
              const value = nutrition[metric.key];
              return (
                <div key={recipe.id} className="compare-row" title={`${recipe.name}: ${Math.round(value)} ${metric.unit}`}>
                  <span className="compare-name">{recipe.name}</span>
                  <div className="compare-track">
                    <div
                      className="compare-fill"
                      style={{ width: `${(value / max) * 100}%`, background: metric.color }}
                    />
                  </div>
                  <span className="compare-value">
                    {Math.round(value)} {metric.unit}
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
