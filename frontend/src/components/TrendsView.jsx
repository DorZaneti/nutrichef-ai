import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  Brush,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/client';
import useChartColors from '../hooks/useChartColors';
import './TrendsView.css';

const SERIES = [
  { key: 'calories', label: 'Calories', color: 'chart-calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', color: 'chart-protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', color: 'chart-carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', color: 'chart-fat', unit: 'g' },
];

const RANGES = [
  { id: '7d', label: '7D', days: 7 },
  { id: '30d', label: '30D', days: 30 },
  { id: '90d', label: '90D', days: 90 },
  { id: 'all', label: 'All', days: null },
];

function formatDateLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function CustomTooltip({ active, payload, label, colors }) {
  if (!active || !payload) return null;
  const visible = payload.filter((entry) => entry.value != null);
  if (visible.length === 0) return null;
  return (
    <div
      className="trends-tooltip"
      style={{ background: colors.surface, borderColor: colors.border, color: colors['text-1'] }}
    >
      <p className="trends-tooltip-date">{formatDateLabel(label)}</p>
      {visible.map((entry) => {
        const isCalorieSeries = entry.dataKey === 'calories' || entry.dataKey === 'calories_projected';
        return (
          <p key={entry.dataKey} className="trends-tooltip-row" style={{ color: entry.color }}>
            <span>{entry.name}</span>
            <strong>
              {Math.round(entry.value)} {isCalorieSeries ? 'kcal' : 'g'}
            </strong>
          </p>
        );
      })}
    </div>
  );
}

// Nutrition trend chart. Prefers server-computed daily aggregates + a
// least-squares projection (GET /api/trends) when online; falls back to a
// local aggregation of the activity log when offline. Only 'cooked' entries
// count toward nutrition — viewing a recipe shouldn't inflate the trend for
// something never actually eaten.
function TrendsView({ entries, theme, online }) {
  const colors = useChartColors(theme);
  const [range, setRange] = useState('30d');
  const [hidden, setHidden] = useState(() => new Set());
  const [serverTrends, setServerTrends] = useState(null);

  useEffect(() => {
    if (!online) {
      setServerTrends(null);
      return;
    }
    let cancelled = false;
    api
      .get('/api/trends', { params: { days: 3650 } })
      .then((response) => {
        if (!cancelled) setServerTrends(response.data);
      })
      .catch((error) => {
        console.error('Failed to fetch trends from server:', error);
        if (!cancelled) setServerTrends(null);
      });
    return () => {
      cancelled = true;
    };
  }, [online]);

  const dailyData = useMemo(() => {
    if (serverTrends) {
      return serverTrends.daily.map((d) => ({
        date: d.date,
        calories: d.calories,
        protein: d.protein,
        carbs: d.carbs,
        fat: d.fat,
      }));
    }
    const cooked = entries.filter((e) => e.action === 'cooked' && e.calories != null);
    const byDate = new Map();
    for (const e of cooked) {
      const existing = byDate.get(e.date) || { date: e.date, calories: 0, protein: 0, carbs: 0, fat: 0 };
      existing.calories += e.calories || 0;
      existing.protein += e.protein || 0;
      existing.carbs += e.carbs || 0;
      existing.fat += e.fat || 0;
      byDate.set(e.date, existing);
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, serverTrends]);

  const rangeDef = RANGES.find((r) => r.id === range);
  const filteredData = useMemo(() => {
    if (!rangeDef.days) return dailyData;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rangeDef.days);
    const cutoffKey = cutoff.toISOString().slice(0, 10);
    return dailyData.filter((d) => d.date >= cutoffKey);
  }, [dailyData, rangeDef]);

  // Append the server projection as a separate dashed series, duplicating the
  // last historical point into it so the dashed line connects continuously.
  const projection = serverTrends?.projection ?? [];
  const chartData = useMemo(() => {
    if (projection.length === 0 || filteredData.length === 0) return filteredData;
    const merged = filteredData.map((d) => ({ ...d, calories_projected: null }));
    merged[merged.length - 1] = {
      ...merged[merged.length - 1],
      calories_projected: merged[merged.length - 1].calories,
    };
    projection.forEach((p) => {
      merged.push({ date: p.date, calories: null, protein: null, carbs: null, fat: null, calories_projected: p.calories });
    });
    return merged;
  }, [filteredData, projection]);

  const todayRef = filteredData.length > 0 ? filteredData[filteredData.length - 1].date : null;

  const toggleSeries = (key) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (dailyData.length === 0) {
    return (
      <div className="trends-view">
        <h2>📈 Nutrition Trends</h2>
        <p className="trends-hint">Cook a few recipes and your nutrition trends will show up here.</p>
      </div>
    );
  }

  return (
    <div className="trends-view">
      <div className="trends-header">
        <h2>📈 Nutrition Trends</h2>
        <div className="range-toggle" role="tablist" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={range === r.id}
              className={`range-chip ${range === r.id ? 'active' : ''}`}
              onClick={() => setRange(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="trends-legend">
        {SERIES.map((s) => (
          <button
            key={s.key}
            className={`legend-chip ${hidden.has(s.key) ? 'off' : ''}`}
            style={{ '--chip-color': colors[s.color] }}
            onClick={() => toggleSeries(s.key)}
          >
            <span className="legend-dot" />
            {s.label}
          </button>
        ))}
      </div>

      {filteredData.length === 0 ? (
        <p className="trends-hint">No cooked recipes in this range yet — try a wider range.</p>
      ) : (
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
            <XAxis dataKey="date" tickFormatter={formatDateLabel} stroke={colors['text-3']} tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" stroke={colors['text-3']} tick={{ fontSize: 12 }} width={50} />
            <YAxis yAxisId="right" orientation="right" stroke={colors['text-3']} tick={{ fontSize: 12 }} width={40} />
            <Tooltip content={<CustomTooltip colors={colors} />} />
            <Legend content={() => null} />
            {todayRef && projection.length > 0 && (
              <ReferenceLine
                x={todayRef}
                yAxisId="left"
                stroke={colors['text-3']}
                strokeDasharray="3 3"
                label={{ value: 'Today', position: 'insideTopLeft', fill: colors['text-3'], fontSize: 11 }}
              />
            )}
            <Area
              yAxisId="left"
              dataKey="calories"
              name="Calories"
              hide={hidden.has('calories')}
              stroke={colors['chart-calories']}
              fill={colors['chart-calories']}
              fillOpacity={0.18}
              strokeWidth={2}
              connectNulls
            />
            {projection.length > 0 && (
              <Line
                yAxisId="left"
                dataKey="calories_projected"
                name="Projected"
                hide={hidden.has('calories')}
                stroke={colors['chart-calories']}
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            )}
            <Line
              yAxisId="right"
              dataKey="protein"
              name="Protein"
              hide={hidden.has('protein')}
              stroke={colors['chart-protein']}
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              dataKey="carbs"
              name="Carbs"
              hide={hidden.has('carbs')}
              stroke={colors['chart-carbs']}
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              dataKey="fat"
              name="Fat"
              hide={hidden.has('fat')}
              stroke={colors['chart-fat']}
              strokeWidth={2}
              dot={false}
            />
            <Brush dataKey="date" height={24} stroke={colors.primary} tickFormatter={formatDateLabel} travellerWidth={8} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default TrendsView;
