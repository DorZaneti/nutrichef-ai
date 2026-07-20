import { useCallback, useEffect, useRef, useState } from 'react';
import api from './api/client';
import './App.css';
import celebrate from './celebrate';
import AchievementsPanel from './components/AchievementsPanel';
import ChatInterface from './components/ChatInterface';
import IngredientList from './components/IngredientList';
import InsightsPanel from './components/InsightsPanel';
import NutritionCompare from './components/NutritionCompare';
import RecipeCard from './components/RecipeCard';
import SkeletonCard from './components/SkeletonCard';
import TabBar from './components/TabBar';
import Toast from './components/Toast';
import TrendsView from './components/TrendsView';
import useActivity from './hooks/useActivity';
import useCountUp from './hooks/useCountUp';
import useOnlineStatus from './hooks/useOnlineStatus';
import usePersistentState from './hooks/usePersistentState';
import useTheme from './hooks/useTheme';
import useToasts from './hooks/useToasts';

function App() {
  // Persistent, offline-first state — everything survives a reload.
  const [ingredients, setIngredients] = usePersistentState('nutrichef.ingredients', []);
  const [ingredientsUpdatedAt, setIngredientsUpdatedAt] = usePersistentState('nutrichef.ingredientsUpdatedAt', null);
  const [conversationHistory, setConversationHistory] = usePersistentState('nutrichef.conversation', []);
  const [recipes, setRecipes] = usePersistentState('nutrichef.recipes', []);
  const [showRecipes, setShowRecipes] = usePersistentState('nutrichef.showRecipes', false);
  const [recipeDetails, setRecipeDetails] = usePersistentState('nutrichef.recipeDetails', {});
  const [activeTab, setActiveTab] = usePersistentState('nutrichef.activeTab', 'kitchen');

  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [recipeError, setRecipeError] = useState('');

  const [theme, toggleTheme] = useTheme();
  const online = useOnlineStatus();
  const { entries, recordActivity, stats, lastWeek, pendingSync, newlyEarned, markAchievementsSeen } = useActivity();
  const [toasts, showToast] = useToasts();

  const autoSearchQueued = useRef(false);
  const prevExplored = useRef(stats.explored);
  const skipIngredientsSync = useRef(true);

  // Mount-time GET: adopt server ingredients only if they're newer than ours.
  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/sync/ingredients')
      .then((response) => {
        if (cancelled) return;
        const { ingredients: serverIngredients, updated_at } = response.data;
        if (!ingredientsUpdatedAt || updated_at > ingredientsUpdatedAt) {
          skipIngredientsSync.current = true;
          setIngredients(serverIngredients);
          setIngredientsUpdatedAt(updated_at);
        }
      })
      .catch((error) => {
        if (error.response?.status !== 404) console.error('Failed to fetch server ingredients:', error);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced push of local edits. Skips the initial mount and any echo
  // caused by the adoption effect above (both set skipIngredientsSync).
  useEffect(() => {
    if (skipIngredientsSync.current) {
      skipIngredientsSync.current = false;
      return;
    }
    if (!online) return;
    const timer = setTimeout(() => {
      const updatedAt = new Date().toISOString();
      api
        .put('/api/sync/ingredients', { ingredients, updated_at: updatedAt })
        .then(() => setIngredientsUpdatedAt(updatedAt))
        .catch((error) => console.error('Failed to sync ingredients:', error));
    }, 1000);
    return () => clearTimeout(timer);
  }, [ingredients, online, setIngredientsUpdatedAt]);

  const addIngredient = useCallback(
    (name, weight) => {
      const clean = name.trim();
      if (!clean) return;
      const grams = parseFloat(weight) || 0;
      setIngredients((prev) => {
        const idx = prev.findIndex((i) => i.name.toLowerCase() === clean.toLowerCase());
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], weight_grams: next[idx].weight_grams + grams };
          return next;
        }
        return [...prev, { name: clean, weight_grams: grams }];
      });
    },
    [setIngredients]
  );

  // Chat extracted ingredients: add them, then auto-search — no extra tap needed.
  const addExtractedIngredients = useCallback(
    (extracted) => {
      const valid = extracted.filter((ing) => ing.name && ing.weight_grams > 0);
      if (valid.length === 0) return;
      valid.forEach((ing) => addIngredient(ing.name, ing.weight_grams));
      showToast(
        valid.length === 1
          ? `Added ${valid[0].name} from chat`
          : `Added ${valid.length} ingredients from chat`,
        'success'
      );
      autoSearchQueued.current = true;
    },
    [addIngredient, showToast]
  );

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Nutrition appears automatically after a search — no "load all" tap needed.
  const loadAllNutrition = useCallback(
    async (recipesList) => {
      const missing = recipesList.filter((r) => !recipeDetails[r.id]);
      if (missing.length === 0) return;
      setLoadingAll(true);
      try {
        const response = await api.post('/api/recipes/details', { ids: missing.map((r) => r.id) });
        setRecipeDetails((prev) => ({ ...prev, ...response.data.details }));
      } catch (error) {
        console.error('Error fetching nutrition batch:', error);
      } finally {
        setLoadingAll(false);
      }
    },
    [recipeDetails, setRecipeDetails]
  );

  const findRecipes = useCallback(async () => {
    if (ingredients.length === 0) {
      setRecipeError('Please add some ingredients first!');
      return;
    }
    if (!online) {
      setShowRecipes(true);
      showToast('Offline — showing your last results', 'info');
      return;
    }

    setIsLoadingRecipes(true);
    setRecipeError('');
    setShowRecipes(true);

    try {
      const response = await api.post('/api/recipes', {
        ingredients: ingredients.map((ing) => ing.name),
      });
      setRecipes(response.data.recipes);
      loadAllNutrition(response.data.recipes);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setRecipeError('Failed to fetch recipes. Please try again.');
    } finally {
      setIsLoadingRecipes(false);
    }
  }, [ingredients, online, setRecipes, setShowRecipes, showToast, loadAllNutrition]);

  // Frictionless flow: run the search automatically after chat adds ingredients.
  useEffect(() => {
    if (autoSearchQueued.current && ingredients.length > 0) {
      autoSearchQueued.current = false;
      findRecipes();
    }
  }, [ingredients, findRecipes]);

  // Celebrate milestones as they're crossed.
  useEffect(() => {
    if (stats.explored > prevExplored.current && stats.explored === stats.prevMilestone) {
      showToast(`🏆 Milestone: ${stats.explored} recipes explored!`, 'success');
      celebrate();
    }
    prevExplored.current = stats.explored;
  }, [stats.explored, stats.prevMilestone, showToast]);

  // Celebrate newly-earned achievements — one toast per badge, one confetti
  // burst total, then mark them seen so this never re-fires for the same badge.
  useEffect(() => {
    if (newlyEarned.length === 0) return;
    newlyEarned.forEach((a) => showToast(`${a.icon} Achievement unlocked: ${a.title}`, 'success'));
    celebrate();
    markAchievementsSeen();
  }, [newlyEarned, showToast, markAchievementsSeen]);

  // Recipe details are cached locally, so revisits (and offline views) are instant.
  const loadRecipeDetails = useCallback(
    async (recipeId) => {
      if (recipeDetails[recipeId]) return recipeDetails[recipeId];
      const response = await api.get(`/api/recipe/${recipeId}`);
      setRecipeDetails((prev) => ({ ...prev, [recipeId]: response.data }));
      return response.data;
    },
    [recipeDetails, setRecipeDetails]
  );

  const handleViewed = useCallback(
    (recipe, nutrition) => recordActivity(recipe.name, 'viewed', nutrition || {}),
    [recordActivity]
  );

  const handleCooked = useCallback(
    (recipe, nutrition) => {
      recordActivity(recipe.name, 'cooked', nutrition || {});
      showToast(`🍽️ Logged: you cooked ${recipe.name}!`, 'success');
    },
    [recordActivity, showToast]
  );

  const clearAll = () => {
    setIngredients([]);
    setConversationHistory([]);
    setRecipes([]);
    setShowRecipes(false);
    setRecipeError('');
  };

  const milestoneProgress = stats.nextMilestone
    ? Math.min(100, (stats.explored / stats.nextMilestone) * 100)
    : 100;
  const displayedExplored = useCountUp(stats.explored);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>🍳 NutriChef AI</h1>
            <p className="subtitle">Your Personal Recipe & Nutrition Assistant</p>
          </div>
          <div className="header-widgets">
            {stats.streak > 0 && (
              <div className="streak-badge" title={`${stats.streak} day streak — keep it going!`}>
                🔥 {stats.streak} day{stats.streak > 1 ? 's' : ''}
              </div>
            )}
            {stats.explored > 0 && stats.nextMilestone && (
              <div className="milestone" title={`${stats.explored} recipes explored — next milestone at ${stats.nextMilestone}`}>
                <span className="milestone-label">
                  {displayedExplored}/{stats.nextMilestone} recipes
                </span>
                <div className="milestone-track">
                  <div className="milestone-fill" style={{ width: `${milestoneProgress}%` }} />
                </div>
              </div>
            )}
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </header>

      {!online && (
        <div className="offline-banner">
          📡 You're offline — your ingredients, chat, and saved recipes still work. Changes sync when you're back.
          {pendingSync > 0 && ` (${pendingSync} pending)`}
        </div>
      )}

      <TabBar activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'kitchen' && (
        <div className="main-content">
          <div className="left-panel">
            <ChatInterface
              ingredients={ingredients}
              conversationHistory={conversationHistory}
              setConversationHistory={setConversationHistory}
              onExtractedIngredients={addExtractedIngredients}
              online={online}
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

            {recipeError && <div className="error-banner">{recipeError}</div>}

            {showRecipes && (
              <>
                {recipes.length > 0 && (
                  <NutritionCompare recipes={recipes} detailsById={recipeDetails} loadingAll={loadingAll} />
                )}

                <div className="recipes-section">
                  <div className="recipes-header">
                    <h2>Recipe Suggestions</h2>
                    {!isLoadingRecipes && <p className="recipes-count">{recipes.length} recipes found</p>}
                  </div>

                  {isLoadingRecipes ? (
                    <div className="recipes-grid">
                      <SkeletonCard />
                      <SkeletonCard />
                      <SkeletonCard />
                    </div>
                  ) : recipes.length === 0 ? (
                    <div className="no-recipes">
                      <p>No recipes found with your current ingredients.</p>
                      <p>Try adding more ingredients or removing some to see different options.</p>
                    </div>
                  ) : (
                    <div className="recipes-grid">
                      {recipes.map((recipe, i) => (
                        <RecipeCard
                          key={recipe.id}
                          recipe={recipe}
                          index={i}
                          details={recipeDetails[recipe.id]}
                          loadDetails={loadRecipeDetails}
                          onViewed={handleViewed}
                          onCooked={handleCooked}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="tab-content">
          <TrendsView entries={entries} theme={theme} online={online} />
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="tab-content">
          <InsightsPanel lastWeek={lastWeek} stats={stats} online={online} showToast={showToast} />
          <AchievementsPanel achievements={stats.achievements} />
        </div>
      )}

      <Toast toasts={toasts} />
    </div>
  );
}

export default App;
