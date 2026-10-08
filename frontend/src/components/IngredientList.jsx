import { useState } from 'react';
import { useI18n } from '../i18n';
import './IngredientList.css';

const QUICK_ADD = [
  { key: 'chicken', grams: 300 },
  { key: 'rice', grams: 200 },
  { key: 'eggs', grams: 100 },
  { key: 'tomato', grams: 120 },
  { key: 'onion', grams: 150 },
  { key: 'garlic', grams: 10 },
  { key: 'pasta', grams: 200 },
  { key: 'cheese', grams: 100 },
];

function IngredientList({ ingredients, removeIngredient, findRecipes, clearAll, addIngredient, isLoading }) {
  const { t } = useI18n();
  const [manualName, setManualName] = useState('');
  const [manualWeight, setManualWeight] = useState('');

  const handleManualAdd = (e) => {
    e.preventDefault();
    if (manualName.trim()) {
      addIngredient(manualName.trim(), parseFloat(manualWeight) || 0);
      setManualName('');
      setManualWeight('');
    }
  };

  const have = new Set(ingredients.map((i) => i.name.toLowerCase()));
  const quickAdd = QUICK_ADD.map((q) => ({ ...q, name: t(`quick.${q.key}`) })).filter(
    (q) => !have.has(q.name.toLowerCase())
  );
  const totalGrams = ingredients.reduce((sum, ing) => sum + ing.weight_grams, 0).toFixed(0);

  return (
    <section className="ingredient-list" aria-labelledby="ingredients-title">
      <div className="ingredient-list-header">
        <h2 id="ingredients-title">{t('ingredients.title')}</h2>
        {ingredients.length > 0 && (
          <button onClick={clearAll} className="clear-all-btn">
            {t('ingredients.clear')}
          </button>
        )}
      </div>

      <form onSubmit={handleManualAdd} className="manual-add-form">
        <label htmlFor="ingredient-name" className="visually-hidden">
          {t('ingredients.nameLabel')}
        </label>
        <input
          id="ingredient-name"
          type="text"
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          placeholder={t('ingredients.namePlaceholder')}
          className="manual-input"
          autoComplete="off"
        />
        <label htmlFor="ingredient-grams" className="visually-hidden">
          {t('ingredients.weightLabel')}
        </label>
        <input
          id="ingredient-grams"
          type="number"
          inputMode="decimal"
          value={manualWeight}
          onChange={(e) => setManualWeight(e.target.value)}
          placeholder={t('ingredients.weightPlaceholder')}
          min="1"
          className="manual-input weight-input"
        />
        <button type="submit" className="add-btn" disabled={!manualName.trim()}>
          {t('ingredients.add')}
        </button>
      </form>

      {quickAdd.length > 0 && (
        <div className="quick-add-row">
          {quickAdd.map((q) => (
            <button
              key={q.key}
              className="quick-add-chip"
              onClick={() => addIngredient(q.name, q.grams)}
              aria-label={t('ingredients.quickAdd', { name: q.name, grams: q.grams })}
            >
              + {q.name}
            </button>
          ))}
        </div>
      )}

      {ingredients.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">
            🥗
          </div>
          <p>{t('ingredients.empty')}</p>
          <p className="hint">{t('ingredients.emptyHint')}</p>
        </div>
      ) : (
        <>
          <ul className="ingredients-grid">
            {ingredients.map((ingredient, index) => (
              <li key={`${ingredient.name}-${index}`} className="ingredient-item">
                <div className="ingredient-info">
                  <span className="ingredient-name">{ingredient.name}</span>
                  <span className="ingredient-weight">
                    {ingredient.weight_grams > 0 ? t('fmt.grams', { n: ingredient.weight_grams }) : ''}
                  </span>
                </div>
                <button
                  onClick={() => removeIngredient(index)}
                  className="remove-btn"
                  aria-label={t('ingredients.remove', { name: ingredient.name })}
                >
                  <span aria-hidden="true">✕</span>
                </button>
              </li>
            ))}
          </ul>

          <p className="ingredient-summary">
            {t('ingredients.summary', { n: ingredients.length, grams: totalGrams })}
          </p>

          <button onClick={findRecipes} className="find-recipes-btn" disabled={isLoading}>
            {isLoading ? `🔍 ${t('ingredients.finding')}` : t('ingredients.find')}
          </button>
        </>
      )}
    </section>
  );
}

export default IngredientList;
