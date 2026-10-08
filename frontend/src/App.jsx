import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from './api/client';
import './App.css';
import celebrate from './celebrate';
import AchievementsPanel from './components/AchievementsPanel';
import ChatInterface from './components/ChatInterface';
import IngredientList from './components/IngredientList';
import InsightsPanel from './components/InsightsPanel';
import NutritionCompare from './components/NutritionCompare';
import ProfileSheet from './components/ProfileSheet';
import ProgressSummary from './components/ProgressSummary';
import RecipeCard from './components/RecipeCard';
import SkeletonCard from './components/SkeletonCard';
import TabBar from './components/TabBar';
import Toast from './components/Toast';
import TodaySummary from './components/TodaySummary';
import TrendsView from './components/TrendsView';
import useActivity from './hooks/useActivity';
import useLanguage from './hooks/useLanguage';
import useOnlineStatus from './hooks/useOnlineStatus';
import usePersistentState from './hooks/usePersistentState';
import useProfile from './hooks/useProfile';
import useTheme from './hooks/useTheme';
import useToasts from './hooks/useToasts';
import { LanguageContext } from './i18n';

// Details cached before per-serving USDA nutrition existed have a different shape.
try {
  localStorage.removeItem('nutrichef.recipeDetails');
} catch {
  // storage unavailable — nothing to clean up
}

// Nutrition that fell back to estimates because USDA was briefly unavailable
// is shown, but refetched next time instead of being trusted from cache.
const hasFinalNutrition = (details) => Boolean(details?.nutrition?.per_serving) && !details.nutrition.incomplete;

function App() {
  const i18n = useLanguage();
  const { t, lang, setLang } = i18n;

  // Persistent, offline-first state — everything survives a reload.
  const [ingredients, setIngredients] = usePersistentState('nutrichef.ingredients', []);
  const [ingredientsUpdatedAt, setIngredientsUpdatedAt] = usePersistentState('nutrichef.ingredientsUpdatedAt', null);
  const [conversationHistory, setConversationHistory] = usePersistentState('nutrichef.conversation', []);
  const [recipes, setRecipes] = usePersistentState('nutrichef.recipes', []);
  const [showRecipes, setShowRecipes] = usePersistentState('nutrichef.showRecipes', false);
  const [recipeDetails, setRecipeDetails] = usePersistentState('nutrichef.recipeDetails.v2', {});
  const [activeTab, setActiveTab] = usePersistentState('nutrichef.activeTab', 'kitchen');
  const [nudgeDismissed, setNudgeDismissed] = usePersistentState('nutrichef.goalsNudgeDismissed', false);

  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [recipeError, setRecipeError] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);

  const [theme, toggleTheme] = useTheme();
  const online = useOnlineStatus();
  const { entries, recordActivity, stats, lastWeek, todayTotals, pendingSync, newlyEarned, markAchievementsSeen } =
    useActivity();
  const { profile, saveProfile, targets, apiProfile } = useProfile(lang);
  const [toasts, showToast] = useToasts();

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

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Nutrition appears automatically after a search — no extra tap needed.
  const loadAllNutrition = useCallback(
    async (recipesList) => {
      const missing = recipesList.filter((r) => !hasFinalNutrition(recipeDetails[r.id]));
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

  const showRecipeResults = useCallback(
    (list) => {
      setRecipes(list);
      setShowRecipes(true);
      setRecipeError('');
      loadAllNutrition(list);
    },
    [setRecipes, setShowRecipes, loadAllNutrition]
  );

  const findRecipes = useCallback(async () => {
    if (ingredients.length === 0) {
      setRecipeError(t('recipes.errorEmpty'));
      return;
    }
    if (!online) {
      setShowRecipes(true);
      showToast(t('recipes.offline'), 'info');
      return;
    }

    setIsLoadingRecipes(true);
    setRecipeError('');
    setShowRecipes(true);

    try {
      const response = await api.post('/api/recipes', {
        ingredients: ingredients.map((ing) => ing.name),
        profile: apiProfile,
      });
      showRecipeResults(response.data.recipes);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setRecipeError(t('recipes.errorFetch'));
    } finally {
      setIsLoadingRecipes(false);
    }
  }, [ingredients, online, apiProfile, setShowRecipes, showToast, showRecipeResults, t]);

  const logMeal = useCallback(
    (name, nutrition, servings) => {
      recordActivity(name, 'cooked', nutrition, servings);
      showToast(t('toast.logged', { name, kcal: Math.round(nutrition.calories || 0) }), 'success');
    },
    [recordActivity, showToast, t]
  );

  // Things the chat agent did through its tools, applied to local state.
  const handleAgentAction = useCallback(
    (action) => {
      if (action.type === 'update_ingredients') {
        const removed = new Set((action.remove || []).map((n) => n.toLowerCase()));
        if (removed.size > 0) setIngredients((prev) => prev.filter((i) => !removed.has(i.name.toLowerCase())));
        const added = (action.add || []).filter((i) => i.name);
        added.forEach((i) => addIngredient(i.name, i.weight_grams));
        if (added.length === 1) showToast(t('toast.added1', { name: added[0].name }), 'success');
        else if (added.length > 1) showToast(t('toast.addedN', { n: added.length }), 'success');
      } else if (action.type === 'show_recipes') {
        showRecipeResults(action.recipes || []);
      } else if (action.type === 'log_meal') {
        const { recipe_name: name, servings, ...nutrition } = action.entry;
        logMeal(name, nutrition, servings);
      }
    },
    [addIngredient, setIngredients, showRecipeResults, logMeal, showToast, t]
  );

  // Milestones get a toast; confetti is saved for achievements.
  useEffect(() => {
    if (stats.explored > prevExplored.current && stats.explored === stats.prevMilestone) {
      showToast(t('toast.milestone', { n: stats.explored }), 'success');
    }
    prevExplored.current = stats.explored;
  }, [stats.explored, stats.prevMilestone, showToast, t]);

  // Celebrate newly-earned achievements — one toast per badge, one confetti
  // burst total, then mark them seen so this never re-fires for the same badge.
  useEffect(() => {
    if (newlyEarned.length === 0) return;
    newlyEarned.forEach((a) =>
      showToast(t('toast.achievement', { icon: a.icon, title: t(`ach.${a.id}.title`) }), 'success')
    );
    celebrate();
    markAchievementsSeen();
  }, [newlyEarned, showToast, markAchievementsSeen, t]);

  // Recipe details are cached locally, so revisits (and offline views) are instant.
  const loadRecipeDetails = useCallback(
    async (recipeId) => {
      if (hasFinalNutrition(recipeDetails[recipeId])) return recipeDetails[recipeId];
      const response = await api.get(`/api/recipe/${recipeId}`);
      setRecipeDetails((prev) => ({ ...prev, [recipeId]: response.data }));
      return response.data;
    },
    [recipeDetails, setRecipeDetails]
  );

  const handleViewed = useCallback(
    (recipe, perServing) => recordActivity(recipe.name, 'viewed', perServing || {}),
    [recordActivity]
  );

  const handleAte = useCallback(
    (recipe, nutrition, servings) => logMeal(recipe.name, nutrition, servings),
    [logMeal]
  );

  // The recipe that best fits what's left today: the most protein per serving
  // among those that still fit the remaining calories.
  const bestFitId = useMemo(() => {
    if (!targets.daily_kcal) return null;
    const withNutrition = recipes
      .map((r) => ({ id: r.id, n: recipeDetails[r.id]?.nutrition?.per_serving }))
      .filter((r) => r.n);
    if (withNutrition.length < 2) return null;
    const remaining = targets.daily_kcal - todayTotals.calories;
    const fits = withNutrition.filter((r) => r.n.calories <= remaining);
    const pool = fits.length > 0 ? fits : withNutrition;
    return pool.reduce((best, r) => (r.n.protein > best.n.protein ? r : best)).id;
  }, [recipes, recipeDetails, targets.daily_kcal, todayTotals.calories]);

  const handleSaveProfile = (next) => {
    saveProfile(next);
    setProfileOpen(false);
    showToast(t('toast.profileSaved'), 'success');
  };

  const clearAll = () => {
    setIngredients([]);
    setConversationHistory([]);
    setRecipes([]);
    setShowRecipes(false);
    setRecipeError('');
  };

  return (
    <LanguageContext.Provider value={i18n}>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <div className="header-title">
              <h1>🍳 NutriChef AI</h1>
              <p className="subtitle">{t('app.subtitle')}</p>
            </div>
            <div className="header-widgets">
              <TodaySummary todayTotals={todayTotals} targets={targets} onOpenProfile={() => setProfileOpen(true)} />
              <button
                className="icon-btn lang-toggle"
                onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
                aria-label={t('header.languageAria')}
                lang={lang === 'he' ? 'en' : 'he'}
              >
                {t('header.language')}
              </button>
              <button
                className="icon-btn theme-toggle"
                onClick={toggleTheme}
                aria-label={theme === 'light' ? t('header.toDark') : t('header.toLight')}
                title={theme === 'light' ? t('header.toDark') : t('header.toLight')}
              >
                <span aria-hidden="true">{theme === 'light' ? '🌙' : '☀️'}</span>
              </button>
            </div>
          </div>
        </header>

        {!online && (
          <div className="offline-banner" role="status">
            📡 {t('offline.banner')}
            {pendingSync > 0 && t('offline.pending', { n: pendingSync })}
          </div>
        )}

        <TabBar activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'kitchen' && (
          <main className="main-content">
            {!profile && !nudgeDismissed && (
              <div className="goals-nudge">
                <span>🎯 {t('nudge.text')}</span>
                <div className="goals-nudge-actions">
                  <button className="btn-link" onClick={() => setNudgeDismissed(true)}>
                    {t('nudge.dismiss')}
                  </button>
                  <button className="btn-small" onClick={() => setProfileOpen(true)}>
                    {t('nudge.cta')}
                  </button>
                </div>
              </div>
            )}

            {/* Primary path on the left (stacks first on mobile): ingredients → recipes. */}
            <div className="left-panel">
              <IngredientList
                ingredients={ingredients}
                removeIngredient={removeIngredient}
                findRecipes={findRecipes}
                clearAll={clearAll}
                addIngredient={addIngredient}
                isLoading={isLoadingRecipes}
              />

              {recipeError && (
                <div className="error-banner" role="alert">
                  {recipeError}
                </div>
              )}

              {showRecipes && (
                <section className="recipes-section" aria-labelledby="recipes-title" aria-busy={isLoadingRecipes}>
                  <div className="recipes-header">
                    <h2 id="recipes-title">{t('recipes.title')}</h2>
                    {!isLoadingRecipes && <p className="recipes-count">{t('recipes.count', { n: recipes.length })}</p>}
                  </div>

                  {isLoadingRecipes ? (
                    <div className="recipes-grid">
                      <SkeletonCard />
                      <SkeletonCard />
                      <SkeletonCard />
                    </div>
                  ) : recipes.length === 0 ? (
                    <div className="no-recipes">
                      <p>{t('recipes.none')}</p>
                      <p>{t('recipes.noneHint')}</p>
                    </div>
                  ) : (
                    <div className="recipes-grid">
                      {recipes.map((recipe, i) => (
                        <RecipeCard
                          key={recipe.id}
                          recipe={recipe}
                          index={i}
                          details={recipeDetails[recipe.id]}
                          nutritionLoading={loadingAll}
                          loadDetails={loadRecipeDetails}
                          onViewed={handleViewed}
                          onAte={handleAte}
                          bestFit={recipe.id === bestFitId}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {showRecipes && recipes.length > 1 && (
                <NutritionCompare recipes={recipes} detailsById={recipeDetails} loadingAll={loadingAll} />
              )}
            </div>

            <div className="right-panel">
              <ChatInterface
                ingredients={ingredients}
                conversationHistory={conversationHistory}
                setConversationHistory={setConversationHistory}
                onAgentAction={handleAgentAction}
                online={online}
                profile={apiProfile}
                todayTotals={todayTotals}
              />
            </div>
          </main>
        )}

        {activeTab === 'trends' && (
          <main className="tab-content">
            <TrendsView entries={entries} theme={theme} online={online} />
          </main>
        )}

        {activeTab === 'insights' && (
          <main className="tab-content">
            <ProgressSummary stats={stats} />
            <InsightsPanel
              lastWeek={lastWeek}
              stats={stats}
              online={online}
              showToast={showToast}
              profile={apiProfile}
            />
            <AchievementsPanel achievements={stats.achievements} />
          </main>
        )}

        <ProfileSheet
          open={profileOpen}
          profile={profile}
          onSave={handleSaveProfile}
          onClose={() => setProfileOpen(false)}
        />

        <Toast toasts={toasts} />
      </div>
    </LanguageContext.Provider>
  );
}

export default App;
