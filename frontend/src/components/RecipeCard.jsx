import { useState } from 'react';
import { useI18n } from '../i18n';
import MacroDonut from './MacroDonut';
import './RecipeCard.css';

const PORTIONS = [0.5, 1, 1.5, 2];
const MACROS = ['calories', 'protein', 'carbs', 'fat'];

function formatPortion(n) {
  if (n === 0.5) return '½';
  if (n === 1.5) return '1½';
  return String(n);
}

export function scaleNutrition(perServing, servings) {
  return Object.fromEntries(MACROS.map((m) => [m, Math.round((perServing[m] || 0) * servings * 10) / 10]));
}

function RecipeCard({ recipe, index = 0, details, nutritionLoading, loadDetails, onViewed, onAte, bestFit }) {
  const { t, lang } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [portion, setPortion] = useState(1);
  const [logged, setLogged] = useState(false);
  const [view, setView] = useState('serving');

  const nutrition = details?.nutrition;
  const perServing = nutrition?.per_serving;
  const detailsId = `recipe-details-${recipe.id}`;

  const matchClass =
    recipe.match_percentage >= 80 ? 'match-high' : recipe.match_percentage >= 60 ? 'match-mid' : 'match-low';

  const handleExpand = async () => {
    if (!isExpanded && !details) {
      setLoading(true);
      try {
        const full = await loadDetails(recipe.id);
        setDetailError('');
        onViewed(recipe, full.nutrition?.per_serving);
      } catch (error) {
        console.error('Error fetching recipe details:', error);
        setDetailError(t('card.detailError'));
        setLoading(false);
        return;
      }
      setLoading(false);
    } else if (!isExpanded && details) {
      onViewed(recipe, perServing);
    }
    setIsExpanded(!isExpanded);
  };

  const handleAte = () => {
    onAte(recipe, scaleNutrition(perServing, portion), portion);
    setLogged(true);
  };

  return (
    <article className="recipe-card" style={{ '--i': index }} aria-labelledby={`recipe-name-${recipe.id}`}>
      <div className="recipe-card-header">
        {recipe.image && <img src={recipe.image} alt="" className="recipe-image" loading="lazy" />}
        <h3 className="recipe-name" id={`recipe-name-${recipe.id}`} lang="en" dir="ltr">
          {recipe.name}
        </h3>
        <div className="recipe-badges">
          <span className={`badge match-badge ${matchClass}`}>{t('card.match', { pct: recipe.match_percentage })}</span>
          {bestFit && <span className="badge best-fit-badge">{t('card.bestFit')}</span>}
        </div>
      </div>

      <div className="card-nutrition">
        {perServing ? (
          <>
            <span className="card-kcal">
              <strong>{Math.round(perServing.calories)}</strong> {t('card.kcal')}
            </span>
            <span className="card-protein">
              <strong>{t('fmt.grams', { n: Math.round(perServing.protein) })}</strong> {t('card.protein')}
            </span>
            <span className="card-per">{t('card.perServing')}</span>
            <span
              className={`badge confidence-badge confidence-${nutrition.confidence}`}
              title={t('card.confidenceTitle', { pct: Math.round((nutrition.usda_share ?? 0) * 100) })}
            >
              {t(`card.confidence.${nutrition.confidence}`)}
            </span>
          </>
        ) : (
          nutritionLoading && <span className="card-calculating">{t('card.calculating')}</span>
        )}
      </div>

      <div className="ingredients-section">
        <h4>{t('card.youHave', { n: recipe.used_ingredients.length })}</h4>
        <ul className="ingredients-tags">
          {recipe.used_ingredients.map((ing) => (
            <li key={ing} className="ingredient-tag required">
              ✓ {ing}
            </li>
          ))}
        </ul>

        {recipe.missed_ingredients?.length > 0 && (
          <>
            <h4 className="optional-header">{t('card.youNeed', { n: recipe.missed_ingredients.length })}</h4>
            <ul className="ingredients-tags" lang="en">
              {recipe.missed_ingredients.map((ing) => (
                <li key={ing} className="ingredient-tag optional">
                  {ing}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <button
        className="expand-btn"
        onClick={handleExpand}
        disabled={loading}
        aria-expanded={isExpanded}
        aria-controls={detailsId}
      >
        {loading ? `⏳ ${t('card.loading')}` : isExpanded ? `▲ ${t('card.hide')}` : `▼ ${t('card.show')}`}
      </button>

      {detailError && (
        <div className="detail-error" role="alert">
          {detailError}
        </div>
      )}

      <div id={detailsId} className={`details-section ${isExpanded && details ? 'expanded' : ''}`}>
        {details && (
          <div className="details-section-inner">
            {perServing && (
              <div className="ate-box">
                <p className="ate-label" id={`portion-label-${recipe.id}`}>
                  {t('card.portionLabel')}{' '}
                  <span className="ate-servings">({t('card.servings', { n: details.servings })})</span>
                </p>
                <div className="portion-picker" role="group" aria-labelledby={`portion-label-${recipe.id}`}>
                  {PORTIONS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`portion-btn ${portion === p ? 'active' : ''}`}
                      aria-pressed={portion === p}
                      aria-label={t('card.portionAria', { n: p })}
                      dir="ltr"
                      onClick={() => {
                        setPortion(p);
                        setLogged(false);
                      }}
                    >
                      {formatPortion(p)}
                    </button>
                  ))}
                  <button className="cooked-btn" onClick={handleAte} disabled={logged}>
                    {logged
                      ? t('card.logged')
                      : `🍽️ ${t('card.ate')} · ${Math.round(perServing.calories * portion)} ${t('card.kcal')}`}
                  </button>
                </div>
              </div>
            )}

            {perServing && (
              <div className="nutrition-info">
                <div className="nutrition-head">
                  <h4>{t('card.nutrition')}</h4>
                  <div className="view-toggle" role="group" aria-label={t('card.nutrition')}>
                    {['serving', 'total'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={`view-chip ${view === v ? 'active' : ''}`}
                        aria-pressed={view === v}
                        onClick={() => setView(v)}
                      >
                        {t(v === 'serving' ? 'card.viewPerServing' : 'card.viewTotal')}
                      </button>
                    ))}
                  </div>
                </div>
                <MacroDonut nutrition={view === 'serving' ? perServing : nutrition.total} />

                {nutrition.breakdown?.length > 0 && (
                  <details className="breakdown">
                    <summary>{t('card.howCalculated')}</summary>
                    <table className="breakdown-table">
                      <tbody>
                        {nutrition.breakdown.map((b, i) => (
                          <tr key={i}>
                            <td lang="en" dir="ltr">
                              {b.ingredient}
                            </td>
                            <td className="num">{t('fmt.grams', { n: b.grams })}</td>
                            <td className="num">
                              {b.calories} {t('unit.kcal')}
                            </td>
                            <td>
                              <span className={`source-tag source-${b.source}`} title={b.match || ''}>
                                {t(`card.source.${b.source}`)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                )}
              </div>
            )}

            {lang === 'he' && <p className="english-note">{t('card.englishNote')}</p>}

            {details.ingredients?.length > 0 && (
              <div className="full-ingredients-section">
                <h4>{t('card.ingredients')}</h4>
                <ul className="ingredient-list-ul" lang="en" dir="ltr">
                  {details.ingredients.map((ing, i) => (
                    <li key={i}>{ing}</li>
                  ))}
                </ul>
              </div>
            )}

            {details.instructions?.length > 0 && (
              <div className="instructions-section">
                <h4>{t('card.instructions')}</h4>
                <ol className="instructions-list" lang="en" dir="ltr">
                  {details.instructions.map((instruction, i) => (
                    <li key={i}>{instruction}</li>
                  ))}
                </ol>
              </div>
            )}

            {details.source_url && (
              <div className="source-link">
                <a href={details.source_url} target="_blank" rel="noopener noreferrer">
                  🔗 {t('card.original')}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default RecipeCard;
