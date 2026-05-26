# 🚀 Quick Setup Guide

## Get Started in 5 Minutes!

### Step 1: Get Your FREE API Keys

**Groq API Key** (No credit card!):
1. Go to https://console.groq.com/keys
2. Sign up with Google/GitHub
3. Create a new API key
4. Copy it (you'll need it in step 3)

**Spoonacular API Key** (150 free calls/day):
1. Go to https://spoonacular.com/food-api
2. Sign up for free account
3. Get your API key from dashboard
4. Copy it (you'll need it in step 3)

### Step 2: Install Dependencies

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

### Step 3: Configure API Key

In the `backend` folder:
```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your API keys:
# GROQ_API_KEY=gsk_...
# SPOONACULAR_API_KEY=...
```

### Step 4: Run the Application

**Terminal 1 - Start Backend:**
```bash
cd backend
python main.py
```
✅ Backend running at http://localhost:8000

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev
```
✅ Frontend running at http://localhost:3000

### Step 5: Use the App!

1. Open http://localhost:3000 in your browser
2. Type: "I have chicken breast 300g and rice 200g"
3. Click "Find Recipes"
4. Explore recipes and nutrition info!

---

## Quick Test

Try these example messages:
- "I have chicken 300g, rice 200g, broccoli 150g"
- "What can I make with eggs and pasta?"
- "Give me a healthy recipe"
- "I want something quick and easy"

---

## Troubleshooting

**Backend won't start?**
- Make sure you have Python 3.8+: `python --version`
- Install dependencies: `pip install -r requirements.txt`
- Check your API key in `.env`

**Frontend won't start?**
- Make sure you have Node.js 16+: `node --version`
- Install dependencies: `npm install`
- Clear cache: `rm -rf node_modules && npm install`

**Can't connect to backend?**
- Make sure backend is running on port 8000
- Check console for CORS errors
- Ensure both servers are running

---

## Project Structure Quick Reference

```
nutrichef-ai/
├── backend/           # FastAPI server
│   ├── main.py       # Main application
│   ├── nutrition_db.py  # Nutrition data
│   ├── recipe_db.py     # Recipe database
│   └── .env          # Your API key (create this!)
└── frontend/         # React app
    ├── src/
    │   ├── App.jsx   # Main component
    │   └── components/  # UI components
    └── package.json
```

---

## Next Steps

1. ✅ Test the basic functionality
2. 📝 Read the full README.md
3. 🎨 Customize the UI
4. 🚀 Deploy to production (see DEPLOYMENT.md)
5. 🌟 Add to your portfolio!

---

**Need help?** Check the full README.md or open an issue on GitHub.

**Happy Cooking! 🍳**
