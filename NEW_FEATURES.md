# 🎉 NutriChef AI v2 - Now with Groq + Spoonacular!

## What Changed?

We've upgraded NutriChef AI to use **FREE, better APIs**!

### Before (v1)
- ❌ Claude API (paid, $5-20/month)
- ❌ Manual recipe database (only 10 recipes)
- ❌ Manual nutrition data (only 50 ingredients)
- ❌ No recipe images
- ❌ Limited recipes

### Now (v2) ✨
- ✅ **Groq AI** - FREE, lightning-fast (<1s responses!)
- ✅ **Spoonacular API** - 5000+ REAL recipes
- ✅ **150 free API calls/day** - Perfect for personal use
- ✅ **Beautiful recipe images**
- ✅ **Accurate nutrition from real sources**
- ✅ **Step-by-step instructions for every recipe**

---

## Why This is Better

### 💰 Cost Comparison

**Old Stack (Claude):**
- Claude API: $5-20/month
- Limited by API costs
- **Total: $5-20/month minimum**

**New Stack (Groq + Spoonacular):**
- Groq API: **100% FREE** (generous free tier)
- Spoonacular: **FREE** (150 calls/day)
- **Total: $0/month** for personal use!

### ⚡ Performance

**Groq AI (Llama 3.3):**
- Response time: <1 second
- Model: Llama 3.3 70B (very capable)
- No rate limits on free tier
- Great at conversations

**Spoonacular:**
- 5000+ recipes vs 10 manual recipes
- Real tested recipes from websites
- Actual nutrition data
- Recipe images
- Full cooking instructions

---

## What You Get Now

### 🍳 Real Recipes
Instead of 10 manually-created recipes, you now have access to **thousands of real, tested recipes** from websites like:
- AllRecipes
- Food Network
- Serious Eats
- And many more!

### 📸 Visual Experience
Every recipe includes:
- Professional food photography
- Step-by-step instructions
- Complete ingredient lists
- Cooking times
- Servings

### 📊 Accurate Nutrition
Nutrition data comes from Spoonacular's verified database:
- Calories
- Protein
- Carbs
- Fat
- And more!

### 💬 Fast AI
Groq's Llama 3.3 is:
- As smart as Claude for conversations
- 3-5x faster
- Completely free
- No credit card required

---

## API Limits (Free Tier)

### Groq
- **Requests:** Generous (thousands per day)
- **Speed:** <1 second per response
- **Models:** Llama 3.3 70B, Llama 3.1, Mixtral
- **Cost:** $0

### Spoonacular
- **Requests:** 150 per day
- **Recipes:** 5000+
- **Nutrition:** Full database
- **Cost:** $0 (upgrade to 500/day for $0.006/call if needed)

**For Personal Use:** 150 calls/day is more than enough!
- Each recipe search = 1 call
- Each recipe detail = 1 call
- ~75 recipe lookups per day

---

## How It Works

```
User: "I have chicken and rice"
   ↓
Groq AI: Understands and responds conversationally
   ↓
Backend: Calls Spoonacular API
   ↓
Spoonacular: Returns 10 matching recipes with:
  - Recipe names
  - Images
  - Ingredients you have
  - Ingredients you need
   ↓
User clicks "Show Details"
   ↓
Spoonacular: Returns full recipe:
  - Complete ingredients
  - Step-by-step instructions
  - Nutrition info
  - Cooking time
  - Source link
```

---

## Example Recipe Response

```json
{
  "id": 716429,
  "name": "Pasta with Garlic, Scallions, Cauliflower & Breadcrumbs",
  "image": "https://spoonacular.com/recipeImages/716429-556x370.jpg",
  "servings": 2,
  "ready_in_minutes": 45,
  "nutrition": {
    "calories": 543,
    "protein": 20,
    "carbs": 84,
    "fat": 14
  },
  "instructions": [
    "Bring a large pot of salted water to a boil...",
    "Heat the olive oil in a large skillet...",
    "Add the garlic and red pepper flakes..."
  ],
  "ingredients": [
    "16 ounces pasta",
    "3 tablespoons olive oil",
    "6 cloves garlic, minced",
    ...
  ]
}
```

---

## Upgrading from v1

If you have the old version:

1. **Update Backend:**
   ```bash
   cd backend
   pip install groq requests
   pip uninstall anthropic
   ```

2. **Update .env:**
   ```bash
   # Remove ANTHROPIC_API_KEY
   # Add:
   GROQ_API_KEY=your_groq_key
   SPOONACULAR_API_KEY=your_spoonacular_key
   ```

3. **Replace main.py:**
   Use the new `main.py` from this version

4. **Update Frontend:**
   Replace `RecipeCard.jsx` and `App.jsx`

---

## Getting API Keys (5 minutes)

### Groq (2 minutes)
1. Go to https://console.groq.com
2. Click "Sign in" → Sign up with Google/GitHub
3. Go to "API Keys" in sidebar
4. Click "Create API Key"
5. Copy the key (starts with `gsk_`)

### Spoonacular (3 minutes)
1. Go to https://spoonacular.com/food-api
2. Click "Get Access" → "Start Now"
3. Sign up for free account
4. Go to "My Console" → "Profile"
5. Copy your API key

---

## Future Enhancements

With Spoonacular, you can add:
- **Recipe search filters** (cuisine, diet, intolerances)
- **Wine pairing** suggestions
- **Similar recipes** recommendations
- **Meal planning** features
- **Equipment needed** for each recipe
- **Cost breakdown** per recipe
- **Ingredient substitutions**

All available in Spoonacular API!

---

## Comparison Table

| Feature | v1 (Claude) | v2 (Groq + Spoonacular) |
|---------|-------------|-------------------------|
| Cost | $5-20/month | **FREE** |
| Recipes | 10 manual | **5000+ real** |
| Nutrition | 50 ingredients | **Full database** |
| Images | ❌ None | ✅ Every recipe |
| Instructions | Basic | **Step-by-step** |
| Response Time | 2-3 seconds | **<1 second** |
| API Limits | Paid tiers | **150 free/day** |
| Recipe Quality | Basic | **Professional** |

---

## Bottom Line

**v2 is better in every way:**
- ✅ Completely FREE
- ✅ Faster responses
- ✅ Real recipes with images
- ✅ More accurate nutrition
- ✅ Better user experience
- ✅ Scalable (paid tiers if needed)

**Perfect for:**
- Personal projects
- Portfolio demonstrations
- Learning full-stack development
- Building a real product

---

## Questions?

**"Is Groq really as good as Claude?"**
For conversational tasks like this, yes! Llama 3.3 70B is excellent.

**"Will I hit the 150/day limit?"**
Unlikely for personal use. That's ~75 recipe lookups per day.

**"Can I upgrade if needed?"**
Yes! Spoonacular paid tier is $0.006/call (very cheap).

**"Does this work offline?"**
No, it needs API access. But responses are cached locally.

---

**Enjoy your upgraded NutriChef AI! 🎉**
