# 🍳 NutriChef AI — Your Personal Recipe & Nutrition Assistant

An intelligent AI-powered web application that helps you discover recipes based on your available ingredients and provides detailed nutritional information. Built with **React + Vite**, **FastAPI**, powered by **Claude AI** (Anthropic) and **TheMealDB** (free, no API key required).

![Status](https://img.shields.io/badge/Status-Active-success)
![React](https://img.shields.io/badge/React-18.2.0-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-green)
![Python](https://img.shields.io/badge/Python-3.8+-blue)
![Claude](https://img.shields.io/badge/AI-Claude%20(Anthropic)-blueviolet)

---

## ✨ Features

- 🤖 **AI-Powered Chat** — Natural conversation with Claude (`claude-sonnet-4-6`) about your ingredients
- 🧠 **Smart Ingredient Extraction** — Claude (`claude-haiku-4-5`) automatically parses names and weights from plain text
- 🔍 **Real Recipe Search** — Thousands of recipes sourced from TheMealDB (100% free)
- 📊 **Nutrition Estimates** — AI-generated calorie, protein, carbs & fat breakdown per recipe
- 🖼️ **Recipe Images** — Beautiful dish photos from TheMealDB
- 📝 **Step-by-Step Instructions** — Full cooking instructions for every recipe
- 🌐 **Auto-opens Browser** — Starting the backend automatically opens `http://localhost:3000`
- 📱 **Responsive Design** — Works on desktop and mobile

---

## 🏗️ Tech Stack

### Frontend
| Tech | Version | Role |
|------|---------|------|
| React | 18.2.0 | UI library |
| Vite | 5.x | Dev server & bundler |
| Axios | 1.6.x | HTTP client |

### Backend
| Tech | Version | Role |
|------|---------|------|
| FastAPI | 0.109.0 | REST API framework |
| Uvicorn | 0.27.0 | ASGI server |
| Anthropic SDK | ≥0.40.0 | Claude AI integration |
| httpx | 0.27.0 | Async HTTP client (TheMealDB) |
| Pydantic | 2.5.3 | Data validation |

### AI Models (Claude)
| Model | Used for |
|-------|---------|
| `claude-sonnet-4-6` | Conversational chat agent |
| `claude-haiku-4-5` | Ingredient extraction & nutrition estimation (fast, structured JSON output) |

### External APIs
| API | Cost | Key required |
|-----|------|-------------|
| [Anthropic Claude](https://console.anthropic.com) | Pay-per-token | ✅ Yes |
| [TheMealDB](https://www.themealdb.com/api.php) | Free | ❌ No |

---

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- npm
- **Anthropic API key** — [Get one at console.anthropic.com](https://console.anthropic.com/keys)

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/nutrichef-ai.git
cd nutrichef-ai
```

### 2. Backend setup

```bash
cd backend

# (Optional) create a virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Edit `backend/.env` and add your key:

```env
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

### 4. Run the app

**Terminal 1 — Frontend:**
```bash
cd frontend
npm run dev
# Vite starts on http://localhost:3000
```

**Terminal 2 — Backend:**
```bash
cd backend
python main.py
# FastAPI starts on http://localhost:8000
# Browser opens http://localhost:3000 automatically ✨
```

---

## 📖 How to Use

1. **Chat with the AI** — Type what ingredients you have in the chat panel
   > *"I have 300g chicken breast, 2 eggs, and some garlic"*

2. **Review your ingredients** — The right panel shows parsed ingredients with weights

3. **Find recipes** — Click **Find Recipes** to search TheMealDB with your ingredients

4. **Explore results** — Each card shows match %, nutrition breakdown, and full instructions

5. **Cook and enjoy!**

---

## 🔌 API Endpoints

### `POST /api/chat`
Send a message and receive a Claude response + extracted ingredients.

```json
// Request
{
  "message": "I have 300g chicken and 2 eggs",
  "conversation_history": [],
  "current_ingredients": []
}

// Response
{
  "response": "Great! Chicken and eggs are a fantastic combo...",
  "conversation_history": [...],
  "extracted_ingredients": [
    { "name": "chicken", "weight_grams": 300 },
    { "name": "egg", "weight_grams": 100 }
  ]
}
```

### `POST /api/recipes`
Search for recipes by ingredient names.

```json
// Request
{ "ingredients": ["chicken", "egg", "garlic"] }

// Response
{
  "recipes": [
    {
      "id": "52772",
      "name": "Teriyaki Chicken Casserole",
      "image": "https://...",
      "match_percentage": 66.7,
      "used_ingredients": ["chicken"],
      "missed_ingredients": ["soy sauce", "...]
    }
  ],
  "count": 8
}
```

### `GET /api/recipe/{id}`
Full recipe details including instructions and AI-estimated nutrition.

```json
{
  "id": "52772",
  "name": "Teriyaki Chicken Casserole",
  "servings": 4,
  "nutrition": { "calories": 520, "protein": 38, "carbs": 45, "fat": 18 },
  "instructions": ["Preheat oven to 350°F...", "..."],
  "ingredients": ["3 cups rice", "1 kg chicken breast", "..."]
}
```

### `GET /api/health`
```json
{ "status": "healthy", "anthropic_configured": true }
```

---

## 🗂️ Project Structure

```
nutrichef-ai/
├── backend/
│   ├── main.py              # FastAPI app — all routes and Claude integration
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Your API keys (git-ignored)
│   └── .env.example         # Template
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatInterface.jsx
│   │   │   ├── IngredientList.jsx
│   │   │   └── RecipeCard.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🔮 Future Enhancements

- [ ] User authentication & saved recipes
- [ ] Dietary filters (vegan, gluten-free, etc.)
- [ ] Shopping list generation
- [ ] Meal planning calendar
- [ ] Image upload for ingredient recognition
- [ ] Voice input support
- [ ] Multi-language support

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch — `git checkout -b feature/my-feature`
3. Commit your changes — `git commit -m 'Add my feature'`
4. Push to the branch — `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 👤 Author

**Dor**
- GitHub: [@yourusername](https://github.com/yourusername)

---

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for the Claude API
- [TheMealDB](https://www.themealdb.com) for the free recipe database
- React and FastAPI communities

---

*Made with ❤️ and Claude AI*
