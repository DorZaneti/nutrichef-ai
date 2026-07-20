import { useState } from 'react';
import MacroDonut from './MacroDonut';
import './RecipeCard.css';

function RecipeCard({ recipe, index = 0, details, loadDetails, onViewed, onCooked }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [cookedLogged, setCookedLogged] = useState(false);

  const matchClass =
    recipe.match_percentage >= 80 ? 'match-high' : recipe.match_percentage >= 60 ? 'match-mid' : 'match-low';

  const handleExpand = async () => {
    if (!isExpanded && !details) {
      setLoading(true);
      try {
        const full = await loadDetails(recipe.id);
        setDetailError('');
        onViewed(recipe, full.nutrition);
      } catch (error) {
        console.error('Error fetching recipe details:', error);
        setDetailError('Failed to load recipe details. Please try again.');
        setLoading(false);
        return;
      }
      setLoading(false);
    } else if (!isExpanded && details) {
      onViewed(recipe, details.nutrition);
    }
    setIsExpanded(!isExpanded);
  };

  const handleCooked = () => {
    onCooked(recipe, details?.nutrition);
    setCookedLogged(true);
  };

  return (
    <div className="recipe-card" style={{ '--i': index }}>
      <div className="recipe-card-header">
        {recipe.image && (
          <img src={recipe.image} alt={recipe.name} className="recipe-image" loading="lazy" />
        )}
        <h3 className="recipe-name">{recipe.name}</h3>
        <div className="recipe-badges">
          <span className={`badge match-badge ${matchClass}`}>
            {recipe.match_percentage}% Match
          </span>
          {recipe.likes > 0 && (
            <span className="badge likes-badge">❤️ {recipe.likes}</span>
          )}
        </div>
      </div>

      <div className="ingredients-section">
        <h4>You Have ({recipe.used_ingredients.length})</h4>
        <div className="ingredients-tags">
          {recipe.used_ingredients.map((ing, index) => (
            <span key={index} className="ingredient-tag required">
              ✓ {ing}
            </span>
          ))}
        </div>

        {recipe.missed_ingredients && recipe.missed_ingredients.length > 0 && (
          <>
            <h4 className="optional-header">You'll Need ({recipe.missed_ingredients.length})</h4>
            <div className="ingredients-tags">
              {recipe.missed_ingredients.map((ing, index) => (
                <span key={index} className="ingredient-tag optional">
                  {ing}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <button className="expand-btn" onClick={handleExpand} disabled={loading}>
        {loading ? '⏳ Loading…' : isExpanded ? '▲ Hide Details' : '▼ Show Details'}
      </button>

      {detailError && <div className="detail-error">{detailError}</div>}

      {details && (
        <div className={`details-section ${isExpanded ? 'expanded' : ''}`}>
        <div className="details-section-inner">
          <div className="recipe-meta">
            {details.servings > 0 && (
              <div className="meta-item">
                <span className="meta-icon">🍽️</span>
                <span>{details.servings} servings</span>
              </div>
            )}
            {details.ready_in_minutes > 0 && (
              <div className="meta-item">
                <span className="meta-icon">⏱️</span>
                <span>{details.ready_in_minutes} min</span>
              </div>
            )}
            <button className="cooked-btn" onClick={handleCooked} disabled={cookedLogged}>
              {cookedLogged ? '✓ Logged!' : '🍳 I cooked this'}
            </button>
          </div>

          {details.nutrition && Object.keys(details.nutrition).length > 0 && (
            <div className="nutrition-info">
              <h4>Nutrition (Total, ~{details.servings} servings)</h4>
              <MacroDonut nutrition={details.nutrition} />
            </div>
          )}

          {details.ingredients && details.ingredients.length > 0 && (
            <div className="full-ingredients-section">
              <h4>Complete Ingredient List</h4>
              <ul className="ingredient-list-ul">
                {details.ingredients.map((ing, index) => (
                  <li key={index}>{ing}</li>
                ))}
              </ul>
            </div>
          )}

          {details.instructions && details.instructions.length > 0 && (
            <div className="instructions-section">
              <h4>Instructions</h4>
              <ol className="instructions-list">
                {details.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </div>
          )}

          {details.source_url && (
            <div className="source-link">
              <a href={details.source_url} target="_blank" rel="noopener noreferrer">
                🔗 View Original Recipe
              </a>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}

export default RecipeCard;
