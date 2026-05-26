# 🍳 NutriChef AI - Your Personal Recipe & Nutrition Assistant

An intelligent AI-powered web application that helps you discover recipes based on your available ingredients and provides detailed nutritional information. Built with React, FastAPI, powered by **Groq AI** (FREE!) and **Spoonacular API** (real recipes!).

![NutriChef AI](https://img.shields.io/badge/Status-Active-success)
![React](https://img.shields.io/badge/React-18.2.0-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-green)
![Python](https://img.shields.io/badge/Python-3.8+-blue)
![Groq](https://img.shields.io/badge/AI-Groq-orange)

## ✨ Features

- 🤖 **AI-Powered Conversations**: Chat naturally with Groq AI (Llama 3.3) about your ingredients
- 🔍 **Real Recipe Search**: Access thousands of real recipes from Spoonacular
- 📊 **Detailed Nutrition**: Get accurate calorie, protein, carbs, and fat information
- 🖼️ **Recipe Images**: See beautiful photos of each dish
- 📝 **Step-by-Step Instructions**: Complete cooking instructions for every recipe
- 💬 **Conversational Interface**: Natural language processing for easy ingredient input
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- ⚡ **Fast & Free**: Groq's LLM is incredibly fast and has a generous free tier

## 🎯 Why This Stack?

**Groq AI (FREE!):**
- ✅ Lightning-fast responses (<1 second)
- ✅ Generous free tier (no credit card required)
- ✅ Llama 3.3 70B - powerful and conversational
- ✅ Easy to use API

**Spoonacular API (Real Recipes!):**
- ✅ 5000+ recipes with full instructions
- ✅ Accurate nutritional data
- ✅ Beautiful recipe images
- ✅ 150 free API calls/day
- ✅ Real, tested recipes from the web

## 🎯 Use Cases

- **Meal Planning**: Discover what you can cook with ingredients you already have
- **Calorie Tracking**: Monitor your nutritional intake accurately
- **Reduce Food Waste**: Use up ingredients before they expire
- **Cooking Inspiration**: Get creative recipe ideas from your pantry
- **Dietary Goals**: Make informed decisions based on nutritional data

## 🏗️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **Vite** - Fast build tool and dev server
- **Axios** - HTTP client for API calls
- **CSS3** - Custom styling with gradients and animations

### Backend
- **FastAPI** - High-performance Python web framework
- **Groq AI (Llama 3.3)** - FREE lightning-fast LLM
- **Spoonacular API** - Real recipe and nutrition database
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server

### APIs
- **Groq** - Free AI conversations (Llama 3.3 70B)
- **Spoonacular** - 5000+ recipes with nutrition (150 free calls/day)

## 📋 Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn
- **FREE Groq API key** ([Get one here](https://console.groq.com/keys)) - No credit card required!
- **FREE Spoonacular API key** ([Get one here](https://spoonacular.com/food-api)) - 150 calls/day free

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/nutrichef-ai.git
cd nutrichef-ai
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Add your API keys to .env:
# GROQ_API_KEY=your_groq_key_here
# SPOONACULAR_API_KEY=your_spoonacular_key_here
```

**Getting Your FREE API Keys:**

1. **Groq API Key** (No credit card needed!):
   - Go to https://console.groq.com/keys
   - Sign up with Google/GitHub
   - Create a new API key
   - Copy and paste into `.env`

2. **Spoonacular API Key** (150 free calls/day):
   - Go to https://spoonacular.com/food-api
   - Sign up for free account
   - Get your API key from dashboard
   - Copy and paste into `.env`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

### 4. Running the Application

**Terminal 1 - Backend:**
```bash
cd backend
python main.py
# Backend runs on http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:3000
```

### 5. Open Your Browser

Navigate to `http://localhost:3000` and start using NutriChef AI!

## 📖 How to Use

1. **Start a Conversation**: Tell the AI what ingredients you have
   - Example: "I have chicken breast 300g, rice 200g, and broccoli 150g"

2. **View Your Ingredients**: Check the ingredient panel on the right to see what's been added

3. **Get Recipe Suggestions**: Click "Find Recipes" to see what you can make

4. **Explore Recipes**: View nutritional information, ingredients needed, and step-by-step instructions

5. **Cook and Enjoy**: Follow the instructions to prepare your meal!

## 🎨 Features Showcase

### Intelligent Ingredient Parsing
The AI automatically extracts ingredient names and weights from natural language:
```
User: "I have 300g chicken and 200 grams of rice"
AI: ✓ Added chicken (300g) and rice (200g)
```

### Detailed Nutritional Breakdown
Every recipe shows:
- Total calories
- Protein content
- Carbohydrates
- Fat content
- Per-serving calculations

### Recipe Matching Algorithm
- Matches recipes based on available ingredients
- Shows match percentage
- Highlights missing ingredients
- Suggests substitutions

## 🗂️ Project Structure

```
nutrichef-ai/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── nutrition_db.py      # Nutrition database
│   ├── recipe_db.py         # Recipe database
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variables template
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatInterface.jsx
│   │   │   ├── IngredientList.jsx
│   │   │   ├── RecipeCard.jsx
│   │   │   └── *.css
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🔌 API Endpoints

### Chat Endpoint
```http
POST /api/chat
Content-Type: application/json

{
  "message": "I have chicken 300g",
  "conversation_history": [],
  "current_ingredients": []
}
```

### Recipe Suggestions
```http
POST /api/recipes
Content-Type: application/json

{
  "ingredients": [
    {"name": "chicken breast", "weight_grams": 300},
    {"name": "rice", "weight_grams": 200}
  ]
}
```

### Nutrition Info
```http
GET /api/nutrition/{ingredient}?weight=100
```

### List Ingredients
```http
GET /api/ingredients
```

## 🧪 Example Recipes

The app includes 10+ pre-programmed recipes:
- Classic Grilled Chicken with Rice
- Beef Stir-Fry with Vegetables
- Salmon with Roasted Vegetables
- Veggie Pasta Primavera
- Egg Fried Rice
- And more!

## 🔮 Future Enhancements

- [ ] User authentication and profiles
- [ ] Save favorite recipes
- [ ] Shopping list generation
- [ ] Dietary restrictions filtering (vegan, gluten-free, etc.)
- [ ] Integration with external nutrition APIs
- [ ] Meal planning calendar
- [ ] Recipe rating and reviews
- [ ] Image upload for ingredient recognition
- [ ] Voice input support
- [ ] Multi-language support

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

**Dor**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/yourprofile)

## 🙏 Acknowledgments

- Anthropic for Claude AI API
- USDA for nutritional data
- React and FastAPI communities
- All contributors and users

## 📞 Support

If you have any questions or run into issues, please open an issue on GitHub.

---

**Made with ❤️ and AI**
