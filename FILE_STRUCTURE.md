# 📁 NutriChef AI - Complete File Structure

```
nutrichef-ai/
│
├── 📄 README.md                    # Main documentation
├── 📄 QUICKSTART.md               # Quick setup guide  
├── 📄 DEPLOYMENT.md               # Deployment instructions
├── 📄 PROJECT_SUMMARY.md          # Portfolio presentation
├── 📄 .gitignore                  # Git ignore rules
│
├── 📂 backend/                    # FastAPI Backend
│   ├── 📄 main.py                # Main FastAPI application
│   │   ├── FastAPI app initialization
│   │   ├── CORS middleware setup
│   │   ├── Chat endpoint (/api/chat)
│   │   ├── Recipe endpoint (/api/recipes)
│   │   ├── Nutrition endpoint (/api/nutrition)
│   │   └── Ingredients list endpoint (/api/ingredients)
│   │
│   ├── 📄 nutrition_db.py        # Nutrition database
│   │   ├── NUTRITION_DB dictionary (50+ ingredients)
│   │   ├── get_ingredient_nutrition() function
│   │   └── search_ingredients() function
│   │
│   ├── 📄 recipe_db.py           # Recipe database
│   │   ├── RECIPES list (10+ recipes)
│   │   ├── find_matching_recipes() algorithm
│   │   └── get_recipe_by_name() function
│   │
│   ├── 📄 requirements.txt       # Python dependencies
│   │   ├── fastapi==0.109.0
│   │   ├── anthropic==0.18.1
│   │   ├── uvicorn==0.27.0
│   │   └── Other dependencies
│   │
│   └── 📄 .env.example           # Environment variables template
│       └── ANTHROPIC_API_KEY placeholder
│
└── 📂 frontend/                  # React Frontend
    ├── 📄 index.html             # HTML entry point
    ├── 📄 package.json           # Node dependencies
    ├── 📄 vite.config.js         # Vite configuration
    │
    └── 📂 src/
        ├── 📄 main.jsx           # React entry point
        ├── 📄 App.jsx            # Main App component
        ├── 📄 App.css            # Main styles
        │
        └── 📂 components/        # React components
            ├── 📄 ChatInterface.jsx      # AI chat component
            ├── 📄 ChatInterface.css      # Chat styles
            │   ├── Message display
            │   ├── Typing indicator
            │   ├── Quick actions
            │   └── Input form
            │
            ├── 📄 IngredientList.jsx     # Ingredient manager
            ├── 📄 IngredientList.css     # Ingredient styles
            │   ├── Ingredient cards
            │   ├── Summary section
            │   └── Find recipes button
            │
            ├── 📄 RecipeCard.jsx         # Recipe display
            └── 📄 RecipeCard.css         # Recipe styles
                ├── Recipe header
                ├── Nutrition grid
                ├── Ingredients section
                └── Instructions

```

---

## 📊 File Statistics

### Backend (Python)
- **Total Files:** 4 Python files
- **Lines of Code:** ~500 lines
- **Key Files:**
  - `main.py` - 150 lines (API endpoints, Claude integration)
  - `nutrition_db.py` - 150 lines (50+ ingredients with full macros)
  - `recipe_db.py` - 200 lines (10+ recipes with matching algorithm)

### Frontend (React)
- **Total Files:** 8 JSX/CSS files
- **Lines of Code:** ~1000 lines
- **Key Files:**
  - `App.jsx` - 100 lines (Main app logic)
  - `ChatInterface.jsx` - 150 lines (Chat UI and API calls)
  - `IngredientList.jsx` - 100 lines (Ingredient management)
  - `RecipeCard.jsx` - 150 lines (Recipe display)
  - CSS files - 500 lines (Modern styling)

### Documentation
- **Total Files:** 4 markdown files
- **Total Pages:** ~30 pages of documentation
- **Coverage:**
  - README.md - Complete project overview
  - QUICKSTART.md - 5-minute setup guide
  - DEPLOYMENT.md - Production deployment guide
  - PROJECT_SUMMARY.md - Portfolio presentation

---

## 🔑 Key File Descriptions

### Backend Files

**main.py** - The heart of the backend
```python
# Main responsibilities:
1. FastAPI application setup
2. CORS configuration for frontend
3. Anthropic Claude API integration
4. Chat conversation management
5. Recipe matching and nutrition calculations
6. RESTful API endpoints
```

**nutrition_db.py** - Nutrition database
```python
# Contains:
- 50+ ingredients with complete nutritional data
- Calories, protein, carbs, fat per 100g
- Categorization (protein, carb, vegetable, etc.)
- Smart ingredient matching (partial matches)
- Nutrition scaling calculations
```

**recipe_db.py** - Recipe database
```python
# Contains:
- 10+ diverse recipes
- Required and optional ingredients
- Step-by-step instructions
- Difficulty levels and cook times
- Smart matching algorithm (60%+ threshold)
- Missing ingredient detection
```

### Frontend Files

**App.jsx** - Main application component
```javascript
// Manages:
- Global state (ingredients, recipes, conversation)
- API communication
- Component orchestration
- Layout structure
```

**ChatInterface.jsx** - Conversational AI
```javascript
// Features:
- Real-time messaging with Claude
- Message history display
- Typing indicators
- Quick action buttons
- Auto-scrolling chat
```

**IngredientList.jsx** - Ingredient management
```javascript
// Features:
- Ingredient display cards
- Add/remove functionality
- Summary statistics
- Recipe finder trigger
```

**RecipeCard.jsx** - Recipe display
```javascript
// Features:
- Recipe metadata (cuisine, difficulty, time)
- Nutritional breakdown
- Ingredient lists
- Expandable instructions
- Match percentage display
```

---

## 🎨 CSS Architecture

### Design System
```css
Colors:
- Primary: #667eea → #764ba2 (Purple gradient)
- Success: #10b981 (Green)
- Warning: #f59e0b (Amber)
- Error: #ef4444 (Red)
- Neutral: Gray scale

Typography:
- Font: 'Inter' (Modern, clean)
- Headers: 700 weight
- Body: 400 weight
- Small: 300 weight

Spacing:
- Base unit: 0.25rem (4px)
- Common: 0.5rem, 1rem, 1.5rem, 2rem
```

### Component Styles
- **App.css** - Global layout, header, main grid
- **ChatInterface.css** - Chat UI, messages, input
- **IngredientList.css** - Cards, summary, buttons
- **RecipeCard.css** - Recipe layout, nutrition grid

---

## 📦 Dependencies

### Backend Dependencies
```txt
fastapi - Web framework
uvicorn - ASGI server
anthropic - Claude AI SDK
pydantic - Data validation
python-dotenv - Environment variables
httpx - HTTP client
```

### Frontend Dependencies
```json
{
  "react": "UI library",
  "react-dom": "React rendering",
  "axios": "HTTP client",
  "vite": "Build tool"
}
```

---

## 🔄 Data Flow

```
User Input → ChatInterface → Backend API → Claude AI
                ↓                              ↓
        State Update ←──────────────────── AI Response
                ↓
        IngredientList (displays ingredients)
                ↓
        Find Recipes Button
                ↓
        Backend API (recipe matching)
                ↓
        RecipeCard (displays results)
```

---

## 🛠️ Configuration Files

**vite.config.js** - Frontend build configuration
```javascript
- React plugin setup
- Dev server on port 3000
- Proxy API calls to backend
```

**package.json** - Node.js project configuration
```json
- Dependencies list
- Scripts (dev, build, preview)
- Project metadata
```

**.env.example** - Environment variables template
```bash
ANTHROPIC_API_KEY=your_key_here
```

**.gitignore** - Version control exclusions
```
- Python cache files
- Node modules
- Environment files
- Build outputs
```

---

## 📈 Code Metrics

**Total Lines of Code:** ~1,500 lines
- Backend: 500 lines
- Frontend: 1,000 lines

**Component Count:** 3 main React components
**API Endpoints:** 5 endpoints
**Database Entries:** 50+ ingredients, 10+ recipes

**Test Coverage:** Ready for unit tests
**Documentation Coverage:** 100% (all files documented)

---

## 🚀 Getting Started

1. **Read:** README.md for overview
2. **Quick Start:** QUICKSTART.md for 5-min setup
3. **Deploy:** DEPLOYMENT.md for production
4. **Present:** PROJECT_SUMMARY.md for portfolio

---

**Last Updated:** January 2026
