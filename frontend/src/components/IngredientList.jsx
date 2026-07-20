import { useState } from 'react';
import './IngredientList.css';

const QUICK_ADD = [
  { name: 'Chicken', grams: 300 },
  { name: 'Rice', grams: 200 },
  { name: 'Egg', grams: 100 },
  { name: 'Tomato', grams: 120 },
  { name: 'Onion', grams: 150 },
  { name: 'Garlic', grams: 10 },
  { name: 'Pasta', grams: 200 },
  { name: 'Cheese', grams: 100 },
];

function IngredientList({ ingredients, removeIngredient, findRecipes, clearAll, addIngredient, isLoading }) {
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

  return (
    <div className="ingredient-list">
      <div className="ingredient-list-header">
        <h2>Your Ingredients</h2>
        {ingredients.length > 0 && (
          <button onClick={clearAll} className="clear-all-btn">
            Clear All
          </button>
        )}
      </div>

      <form onSubmit={handleManualAdd} className="manual-add-form">
        <input
          type="text"
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          placeholder="Ingredient name"
          className="manual-input"
        />
        <input
          type="number"
          value={manualWeight}
          onChange={(e) => setManualWeight(e.target.value)}
          placeholder="Weight (g) optional"
          min="1"
          className="manual-input weight-input"
        />
        <button type="submit" className="add-btn" disabled={!manualName.trim()}>
          Add
        </button>
      </form>

      <div className="quick-add-row">
        {QUICK_ADD.filter((q) => !have.has(q.name.toLowerCase())).map((q) => (
          <button
            key={q.name}
            className="quick-add-chip"
            onClick={() => addIngredient(q.name, q.grams)}
            title={`Add ${q.name} (${q.grams}g)`}
          >
            + {q.name}
          </button>
        ))}
      </div>

      {ingredients.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🥗</div>
          <p>No ingredients added yet</p>
          <p className="hint">Use the chat, the chips above, or the form to add ingredients!</p>
        </div>
      ) : (
        <>
          <div className="ingredients-grid">
            {ingredients.map((ingredient, index) => (
              <div key={`${ingredient.name}-${index}`} className="ingredient-item">
                <div className="ingredient-info">
                  <span className="ingredient-name">{ingredient.name}</span>
                  <span className="ingredient-weight">{ingredient.weight_grams > 0 ? `${ingredient.weight_grams}g` : ''}</span>
                </div>
                <button
                  onClick={() => removeIngredient(index)}
                  className="remove-btn"
                  title="Remove ingredient"
                  aria-label={`Remove ${ingredient.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="ingredient-summary">
            <div className="summary-item">
              <span className="summary-label">Total Ingredients:</span>
              <span className="summary-value">{ingredients.length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Weight:</span>
              <span className="summary-value">
                {ingredients.reduce((sum, ing) => sum + ing.weight_grams, 0).toFixed(0)}g
              </span>
            </div>
          </div>

          <button onClick={findRecipes} className="find-recipes-btn" disabled={isLoading}>
            {isLoading ? '🔍 Finding Recipes…' : 'Find Recipes'}
          </button>
        </>
      )}
    </div>
  );
}

export default IngredientList;
