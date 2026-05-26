# 🤝 Contributing to NutriChef AI

Thank you for your interest in contributing to NutriChef AI! This guide will help you get started.

---

## 🌟 Ways to Contribute

1. **Add More Ingredients** - Expand the nutrition database
2. **Add More Recipes** - Create new recipe entries
3. **Improve UI/UX** - Enhance the design and user experience
4. **Fix Bugs** - Report or fix issues
5. **Add Features** - Implement new functionality
6. **Improve Documentation** - Make docs clearer and more comprehensive

---

## 📋 Getting Started

### 1. Fork & Clone
```bash
# Fork the repo on GitHub, then:
git clone https://github.com/YOUR_USERNAME/nutrichef-ai.git
cd nutrichef-ai
```

### 2. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 3. Make Changes
Follow the project structure and coding conventions

### 4. Test Your Changes
```bash
# Run the application
# Test manually
# Ensure no regressions
```

### 5. Commit & Push
```bash
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

### 6. Create Pull Request
Open a PR on GitHub with a clear description of your changes

---

## 🎨 Coding Standards

### Python (Backend)

**Style Guide:**
- Follow PEP 8
- Use type hints
- Write docstrings for functions
- Keep functions small and focused

**Example:**
```python
def get_ingredient_nutrition(ingredient_name: str, weight_grams: float) -> dict:
    """
    Get nutrition info for an ingredient
    
    Args:
        ingredient_name: Name of the ingredient
        weight_grams: Weight in grams
        
    Returns:
        Dictionary with nutrition data or None
    """
    # Implementation
```

**Naming Conventions:**
- Functions: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_CASE`
- Private: `_leading_underscore`

### JavaScript (Frontend)

**Style Guide:**
- Use modern ES6+ syntax
- Functional components with hooks
- Descriptive variable names
- Comments for complex logic

**Example:**
```javascript
// Good
const fetchRecipes = async (ingredients) => {
  try {
    const response = await axios.post('/api/recipes', {
      ingredients: ingredients
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching recipes:', error);
    throw error;
  }
};

// Bad
const fr = async (i) => {
  return await axios.post('/api/recipes', {ingredients: i});
};
```

**Naming Conventions:**
- Components: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_CASE`
- Files: `PascalCase.jsx` for components

### CSS

**Conventions:**
- Use class names, avoid IDs
- BEM-like naming: `component-name__element--modifier`
- Mobile-first approach
- Consistent spacing units

**Example:**
```css
/* Good */
.recipe-card {
  padding: 1.5rem;
}

.recipe-card__header {
  margin-bottom: 1rem;
}

.recipe-card__header--featured {
  background: #667eea;
}

/* Bad */
#recipecard {
  padding: 24px;
}

.rc-h {
  margin-bottom: 16px;
}
```

---

## 📦 Adding New Ingredients

**Location:** `backend/nutrition_db.py`

**Steps:**
1. Find USDA nutritional data for your ingredient
2. Add to `NUTRITION_DB` dictionary

**Format:**
```python
"ingredient_name": {
    "calories": 100,      # per 100g
    "protein": 10,        # grams per 100g
    "carbs": 5,           # grams per 100g
    "fat": 3,             # grams per 100g
    "category": "protein" # protein, carb, vegetable, fat, dairy, condiment
}
```

**Example:**
```python
# Adding peanut butter
"peanut butter": {
    "calories": 588,
    "protein": 25,
    "carbs": 20,
    "fat": 50,
    "category": "fat"
}
```

**Sources for Data:**
- USDA FoodData Central: https://fdc.nal.usda.gov/
- Nutritionix: https://www.nutritionix.com/
- MyFitnessPal: https://www.myfitnesspal.com/

---

## 🍽️ Adding New Recipes

**Location:** `backend/recipe_db.py`

**Format:**
```python
{
    "name": "Recipe Name",
    "cuisine": "Type (Italian, Asian, etc.)",
    "difficulty": "Easy/Medium/Hard",
    "cook_time": "30 minutes",
    "servings": 2,
    "required_ingredients": ["ingredient1", "ingredient2"],
    "optional_ingredients": ["optional1", "optional2"],
    "instructions": [
        "Step 1 description",
        "Step 2 description",
        "Step 3 description"
    ]
}
```

**Guidelines:**
- Use ingredients that exist in `nutrition_db.py`
- Write clear, step-by-step instructions
- Include realistic cook times
- Test the recipe yourself if possible!

**Example:**
```python
{
    "name": "Quick Veggie Stir-Fry",
    "cuisine": "Asian",
    "difficulty": "Easy",
    "cook_time": "15 minutes",
    "servings": 2,
    "required_ingredients": ["tofu", "broccoli", "bell pepper", "soy sauce", "rice"],
    "optional_ingredients": ["garlic", "ginger", "sesame oil"],
    "instructions": [
        "Cook rice according to package directions",
        "Cut tofu into cubes and stir-fry until golden",
        "Add vegetables and cook until tender-crisp",
        "Add soy sauce and optional seasonings",
        "Serve over rice"
    ]
}
```

---

## ✨ Adding New Features

### Frontend Features

**Adding a New Component:**
1. Create file in `frontend/src/components/`
2. Create corresponding CSS file
3. Import and use in `App.jsx`

**Example - Adding a Save Button:**

**SaveButton.jsx:**
```javascript
import './SaveButton.css';

function SaveButton({ recipe, onSave }) {
  const handleSave = () => {
    // Save logic
    onSave(recipe);
  };

  return (
    <button className="save-button" onClick={handleSave}>
      ⭐ Save Recipe
    </button>
  );
}

export default SaveButton;
```

**SaveButton.css:**
```css
.save-button {
  padding: 0.75rem 1.5rem;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.save-button:hover {
  background: #d97706;
  transform: translateY(-2px);
}
```

### Backend Features

**Adding a New Endpoint:**

**In main.py:**
```python
@app.get("/api/saved-recipes/{user_id}")
def get_saved_recipes(user_id: str):
    """
    Get user's saved recipes
    """
    try:
        # Implementation
        saved = get_user_saved_recipes(user_id)
        return {"recipes": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 🐛 Bug Reporting

**Before Reporting:**
1. Check if it's already reported
2. Try to reproduce consistently
3. Check if it's a known issue

**Bug Report Template:**
```markdown
**Bug Description:**
Clear description of the bug

**Steps to Reproduce:**
1. Go to...
2. Click on...
3. See error

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Environment:**
- OS: [e.g. Windows 10]
- Browser: [e.g. Chrome 120]
- Version: [e.g. 1.0.0]

**Screenshots:**
If applicable

**Console Errors:**
Any error messages
```

---

## 🔍 Code Review Process

All contributions go through code review:

**Checklist for Reviewers:**
- [ ] Code follows style guidelines
- [ ] Changes are well-documented
- [ ] No breaking changes (or documented if necessary)
- [ ] Tests pass (when we add them)
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Accessible
- [ ] Performance impact considered

---

## 📚 Documentation

When adding features, update:
- [ ] README.md - If user-facing feature
- [ ] QUICKSTART.md - If affects setup
- [ ] DEPLOYMENT.md - If affects deployment
- [ ] FILE_STRUCTURE.md - If adding new files
- [ ] Code comments - Always!

---

## 🎯 Priority Areas for Contribution

**High Priority:**
1. Add more ingredients to database
2. Add more diverse recipes
3. Improve mobile responsiveness
4. Add unit tests

**Medium Priority:**
1. User authentication
2. Save favorite recipes
3. Shopping list generator
4. Dietary filters

**Nice to Have:**
1. Image upload for ingredients
2. Voice input
3. Meal planning calendar
4. Recipe ratings

---

## 💡 Feature Ideas

Looking for inspiration? Here are some ideas:

### Easy
- Add 20 more ingredients
- Add 10 more recipes
- Improve error messages
- Add more quick action buttons
- Theme customization

### Medium
- Ingredient search autocomplete
- Recipe favorites system
- Export shopping list
- Print recipe functionality
- Ingredient substitution suggestions

### Advanced
- User accounts & authentication
- Image recognition for ingredients
- Meal planning calendar
- Integration with grocery APIs
- Social features (share recipes)
- Multi-language support

---

## ⚖️ License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## 🙏 Recognition

Contributors will be:
- Listed in README.md
- Credited in release notes
- Given a shoutout on social media (if desired)

---

## 📞 Questions?

- Open an issue for questions
- Join discussions in GitHub Discussions
- Check existing issues and PRs

---

## Code of Conduct

**Be Respectful:**
- Be kind and courteous
- Respect different viewpoints
- Give and receive constructive feedback
- Focus on what's best for the community

**Be Professional:**
- Use welcoming and inclusive language
- Be patient with newcomers
- Help others learn and grow
- Give credit where due

**Zero Tolerance:**
- Harassment
- Trolling
- Spam
- Malicious code

---

**Thank you for contributing to NutriChef AI! 🎉**

Every contribution, no matter how small, helps make this project better for everyone.
