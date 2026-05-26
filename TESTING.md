# 🧪 Testing Guide for NutriChef AI

This guide will help you test the application thoroughly to ensure everything works correctly.

---

## ✅ Pre-Deployment Checklist

### Environment Setup
- [ ] Backend `.env` file created with valid API key
- [ ] All dependencies installed (Python + Node)
- [ ] Both servers can start without errors
- [ ] Frontend can connect to backend

---

## 🔍 Manual Testing Scenarios

### Test 1: Basic Chat Functionality

**Objective:** Verify AI conversation works

**Steps:**
1. Start both backend and frontend
2. Open http://localhost:3000
3. Type: "Hello, what can you do?"
4. Expected: AI responds with greeting and capabilities

**Pass Criteria:**
- ✅ Message appears in chat
- ✅ AI responds within 2-3 seconds
- ✅ Response is relevant and helpful

---

### Test 2: Ingredient Parsing

**Objective:** Test ingredient extraction from natural language

**Test Cases:**

**Case 2.1:** Simple ingredient
```
Input: "I have chicken breast 300g"
Expected: Ingredient "chicken breast" (300g) appears in ingredient list
```

**Case 2.2:** Multiple ingredients
```
Input: "I have chicken 300g, rice 200g, and broccoli 150g"
Expected: All three ingredients appear correctly
```

**Case 2.3:** Different weight formats
```
Input: "I have 500 grams of pasta"
Expected: Pasta (500g) appears
```

**Case 2.4:** Typos and variations
```
Input: "I have chiken 300g"
Expected: AI should handle gracefully or ask for clarification
```

**Pass Criteria:**
- ✅ Ingredients parsed correctly
- ✅ Weights extracted accurately
- ✅ Items appear in ingredient panel
- ✅ Can handle multiple formats

---

### Test 3: Recipe Matching

**Objective:** Verify recipe suggestions work correctly

**Test Case 3.1:** Perfect Match
```
Ingredients: chicken breast 300g, rice 200g, broccoli 150g, olive oil 10g
Action: Click "Find Recipes"
Expected: "Classic Grilled Chicken with Rice" appears with 100% match
```

**Test Case 3.2:** Partial Match
```
Ingredients: chicken breast 300g, rice 200g
Action: Click "Find Recipes"
Expected: Multiple recipes appear with 60%+ match
```

**Test Case 3.3:** No Match
```
Ingredients: chocolate 100g
Action: Click "Find Recipes"
Expected: "No recipes found" message
```

**Pass Criteria:**
- ✅ Recipes appear within 1 second
- ✅ Match percentage is accurate
- ✅ Missing ingredients are highlighted
- ✅ No crashes on edge cases

---

### Test 4: Nutritional Calculations

**Objective:** Ensure calorie calculations are accurate

**Test Case:**
```
Ingredients: 
- chicken breast 100g (should be ~165 calories)
- rice 100g (should be ~130 calories)

Expected Total: ~295 calories
```

**Manual Verification:**
1. Add ingredients
2. Click "Find Recipes"
3. Check recipe card nutrition
4. Verify: Total calories ≈ sum of ingredient calories

**Pass Criteria:**
- ✅ Calories calculated correctly (±5%)
- ✅ Protein/carbs/fat shown
- ✅ Per-serving calculation is accurate
- ✅ All macros add up correctly

---

### Test 5: User Interface

**Objective:** Test UI responsiveness and interactions

**Test 5.1:** Responsive Design
```
1. Open on desktop (1920x1080)
   Expected: Two-column layout
2. Resize to tablet (768px)
   Expected: Stacked layout
3. Resize to mobile (375px)
   Expected: Single column, readable
```

**Test 5.2:** Component Interactions
```
1. Add ingredient → Should appear in list
2. Remove ingredient → Should disappear
3. Clear all → All ingredients removed
4. Chat scroll → Auto-scrolls to bottom
5. Recipe expand → Instructions appear
```

**Test 5.3:** Loading States
```
1. Send chat message → Loading indicator appears
2. Find recipes → Button shows "loading" state
3. Long response → Typing animation works
```

**Pass Criteria:**
- ✅ All breakpoints work
- ✅ No layout breaks
- ✅ Buttons have hover states
- ✅ Loading indicators appear

---

### Test 6: Error Handling

**Objective:** Verify graceful error handling

**Test 6.1:** Backend Down
```
1. Stop backend server
2. Try to send chat message
Expected: Error message, app doesn't crash
```

**Test 6.2:** Invalid API Key
```
1. Use wrong API key in .env
2. Try to chat
Expected: Error message about authentication
```

**Test 6.3:** Network Timeout
```
Simulate slow connection
Expected: Timeout message, retry option
```

**Pass Criteria:**
- ✅ No console errors
- ✅ User-friendly error messages
- ✅ App remains functional
- ✅ Can recover from errors

---

## 🤖 Automated Testing (Future)

### Backend Unit Tests

**nutrition_db.py tests:**
```python
def test_get_nutrition_exact_match():
    result = get_ingredient_nutrition("chicken breast", 100)
    assert result["calories"] == 165
    assert result["protein"] == 31

def test_get_nutrition_scaling():
    result = get_ingredient_nutrition("rice", 200)
    assert result["calories"] == 260  # 130 * 2

def test_ingredient_not_found():
    result = get_ingredient_nutrition("unknown", 100)
    assert result is None
```

**recipe_db.py tests:**
```python
def test_find_recipes_perfect_match():
    ingredients = ["chicken breast", "rice", "olive oil"]
    results = find_matching_recipes(ingredients)
    assert len(results) > 0
    assert results[0]["match_percentage"] >= 60

def test_find_recipes_no_match():
    ingredients = ["chocolate"]
    results = find_matching_recipes(ingredients)
    assert len(results) == 0
```

### Frontend Component Tests

**ChatInterface tests:**
```javascript
test('sends message on form submit', () => {
  // Render component
  // Fill input
  // Click send
  // Verify API call made
});

test('displays typing indicator while loading', () => {
  // Send message
  // Verify loading state appears
});
```

**IngredientList tests:**
```javascript
test('displays ingredients correctly', () => {
  const ingredients = [{name: "chicken", weight: 300}];
  // Render with ingredients
  // Verify display
});

test('removes ingredient on click', () => {
  // Click remove button
  // Verify ingredient removed
});
```

---

## 📊 Performance Testing

### Load Testing
```bash
# Test API endpoints
curl http://localhost:8000/api/ingredients

# Measure response time
time curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

**Expected Response Times:**
- GET /api/ingredients: < 50ms
- POST /api/chat: < 1000ms
- POST /api/recipes: < 200ms

### Memory Testing
```bash
# Monitor backend memory
ps aux | grep python

# Monitor frontend bundle size
npm run build
# Check dist/ folder size
```

**Expected:**
- Backend memory: < 100MB
- Frontend bundle: < 500KB

---

## 🐛 Known Issues & Workarounds

### Issue 1: CORS Errors
**Symptom:** Can't connect frontend to backend
**Fix:** Ensure backend CORS allows localhost:3000

### Issue 2: API Key Invalid
**Symptom:** 401 Authentication Error
**Fix:** Verify API key in `.env` file

### Issue 3: Port Already in Use
**Symptom:** Can't start server
**Fix:** Kill process on port or use different port

---

## 📝 Test Report Template

```markdown
# Test Report - NutriChef AI

**Date:** [Date]
**Tester:** [Name]
**Version:** [Version]

## Test Results

### Chat Functionality: ✅ Pass / ❌ Fail
- Basic conversation: [ ]
- Ingredient parsing: [ ]
- Context retention: [ ]

### Recipe Matching: ✅ Pass / ❌ Fail
- Perfect match: [ ]
- Partial match: [ ]
- No match: [ ]

### Nutrition Calculation: ✅ Pass / ❌ Fail
- Accurate calories: [ ]
- Macro breakdown: [ ]
- Per-serving: [ ]

### User Interface: ✅ Pass / ❌ Fail
- Desktop layout: [ ]
- Mobile layout: [ ]
- Interactions: [ ]

### Error Handling: ✅ Pass / ❌ Fail
- Backend down: [ ]
- Invalid input: [ ]
- Network issues: [ ]

## Bugs Found

| # | Description | Severity | Status |
|---|-------------|----------|--------|
| 1 | [Description] | High/Med/Low | Open/Fixed |

## Overall Status: ✅ Ready for Production / ⚠️ Needs Work
```

---

## 🎯 Production Readiness Checklist

Before deploying:
- [ ] All manual tests pass
- [ ] No console errors
- [ ] Responsive on all devices
- [ ] Error handling works
- [ ] API key is secure
- [ ] HTTPS enabled
- [ ] CORS configured for production domain
- [ ] Environment variables set
- [ ] Backup plan in place
- [ ] Monitoring set up

---

## 📞 Testing Support

If you encounter issues during testing:
1. Check browser console for errors
2. Verify backend logs
3. Test API endpoints directly with curl
4. Review network tab in DevTools
5. Confirm all dependencies installed

**Happy Testing! 🧪**
