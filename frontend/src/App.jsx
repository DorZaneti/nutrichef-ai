import { useState } from 'react';
import axios from 'axios';
import './App.css';
import ChatInterface from './components/ChatInterface';
import IngredientList from './components/IngredientList';
import RecipeCard from './components/RecipeCard';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [ingredients, setIngredients] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [showRecipes, setShowRecipes] = useState(false);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [recipeError, setRecipeError] = useState('');

  const addIngredient = (name, weight) => {
    const newIngredient = {
      name: name.trim(),
      weight_grams: parseFloat(weight)
    };
    setIngredients(prev => [...prev, newIngredient]);
  };

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const findRecipes = async () => {
    if (ingredients.length === 0) {
      setRecipeError('Please add some ingredients first!');
      return;
    }

    setIsLoadingRecipes(true);
    setRecipeError('');

    try {
      const ingredientNames = ingredients.map(ing => ing.name);
      const response = await axios.post(`${API_BASE_URL}/api/recipes`, {
        ingredients: ingredientNames
      });
      setRecipes(response.data.recipes);
      setShowRecipes(true);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setRecipeError('Failed to fetch recipes. Please try again.');
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  const clearAll = () => {
    setIngredients([]);
    setConversationHistory([]);
    setRecipes([]);
    setShowRecipes(false);
    setRecipeError('');
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🍳 NutriChef AI</h1>
          <p className="subtitle">Your Personal Recipe & Nutrition Assistant</p>
        </div>
      </header>

      <div className="main-content">
        <div className="left-panel">
          <ChatInterface
            ingredients={ingredients}
            conversationHistory={conversationHistory}
            setConversationHistory={setConversationHistory}
            addIngredient={addIngredient}
          />
        </div>

        <div className="right-panel">
          <IngredientList
            ingredients={ingredients}
            removeIngredient={removeIngredient}
            findRecipes={findRecipes}
            clearAll={clearAll}
            addIngredient={addIngredient}
            isLoading={isLoadingRecipes}
          />

          {recipeError && (
            <div className="error-banner">
              {recipeError}
            </div>
          )}

          {showRecipes && (
            <div className="recipes-section">
              <div className="recipes-header">
                <h2>Recipe Suggestions</h2>
                <p className="recipes-count">{recipes.length} recipes found</p>
              </div>

              {recipes.length === 0 ? (
                <div className="no-recipes">
                  <p>No recipes found with your current ingredients.</p>
                  <p>Try adding more ingredients or removing some to see different options.</p>
                </div>
              ) : (
                <div className="recipes-grid">
                  {recipes.map((recipe, index) => (
                    <RecipeCard key={index} recipe={recipe} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
