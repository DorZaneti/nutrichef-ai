import { useState } from 'react';
import axios from 'axios';
import './RecipeCard.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function RecipeCard({ recipe }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [fullDetails, setFullDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const getMatchColor = (percentage) => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const handleExpand = async () => {
    if (!isExpanded && !fullDetails) {
      // Fetch full recipe details
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/recipe/${recipe.id}`);
        setFullDetails(response.data);
        setDetailError('');
      } catch (error) {
        console.error('Error fetching recipe details:', error);
        setDetailError('Failed to load recipe details. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="recipe-card">
      <div className="recipe-card-header">
        {recipe.image && (
          <img 
            src={recipe.image} 
            alt={recipe.name} 
            className="recipe-image"
          />
        )}
        <h3 className="recipe-name">{recipe.name}</h3>
        <div className="recipe-badges">
          <span 
            className="badge match-badge"
            style={{ backgroundColor: getMatchColor(recipe.match_percentage) }}
          >
            {recipe.match_percentage}% Match
          </span>
          {recipe.likes > 0 && (
            <span className="badge likes-badge">
              ❤️ {recipe.likes}
            </span>
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

      <button
        className="expand-btn"
        onClick={handleExpand}
        disabled={loading}
      >
        {loading ? '⏳ Loading...' : isExpanded ? '▲ Hide Details' : '▼ Show Details'}
      </button>

      {detailError && <div className="detail-error">{detailError}</div>}

      {isExpanded && fullDetails && (
        <div className="details-section">
          <div className="recipe-meta">
            {fullDetails.servings && (
              <div className="meta-item">
                <span className="meta-icon">🍽️</span>
                <span>{fullDetails.servings} servings</span>
              </div>
            )}
            {fullDetails.ready_in_minutes && (
              <div className="meta-item">
                <span className="meta-icon">⏱️</span>
                <span>{fullDetails.ready_in_minutes} min</span>
              </div>
            )}
          </div>

          {fullDetails.nutrition && Object.keys(fullDetails.nutrition).length > 0 && (
            <div className="nutrition-info">
              <h4>Nutrition (Total)</h4>
              <div className="nutrition-grid">
                {fullDetails.nutrition.calories && (
                  <div className="nutrition-item">
                    <span className="nutrition-value">{Math.round(fullDetails.nutrition.calories)}</span>
                    <span className="nutrition-label">Calories</span>
                  </div>
                )}
                {fullDetails.nutrition.protein && (
                  <div className="nutrition-item">
                    <span className="nutrition-value">{Math.round(fullDetails.nutrition.protein)}g</span>
                    <span className="nutrition-label">Protein</span>
                  </div>
                )}
                {fullDetails.nutrition.carbs && (
                  <div className="nutrition-item">
                    <span className="nutrition-value">{Math.round(fullDetails.nutrition.carbs)}g</span>
                    <span className="nutrition-label">Carbs</span>
                  </div>
                )}
                {fullDetails.nutrition.fat && (
                  <div className="nutrition-item">
                    <span className="nutrition-value">{Math.round(fullDetails.nutrition.fat)}g</span>
                    <span className="nutrition-label">Fat</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {fullDetails.ingredients && fullDetails.ingredients.length > 0 && (
            <div className="full-ingredients-section">
              <h4>Complete Ingredient List</h4>
              <ul className="ingredient-list">
                {fullDetails.ingredients.map((ing, index) => (
                  <li key={index}>{ing}</li>
                ))}
              </ul>
            </div>
          )}

          {fullDetails.instructions && fullDetails.instructions.length > 0 && (
            <div className="instructions-section">
              <h4>Instructions</h4>
              <ol className="instructions-list">
                {fullDetails.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </div>
          )}

          {fullDetails.source_url && (
            <div className="source-link">
              <a href={fullDetails.source_url} target="_blank" rel="noopener noreferrer">
                🔗 View Original Recipe
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RecipeCard;
