# 🚀 Quick Setup Guide

## Get Started in 5 Minutes!

### Step 1: Get Your Anthropic API Key

**Anthropic API Key** (pay-per-token):
1. Go to https://console.anthropic.com/keys
2. Sign up or log in
3. Create a new API key
4. Copy it (you'll need it in Step 3)

> **Recipes** are sourced from [TheMealDB](https://www.themealdb.com) — completely free, no key required!

---

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

---

### Step 3: Configure API Key

In the `backend` folder:
```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your Anthropic key:
# ANTHROPIC_API_KEY=sk-ant-...
```

---

### Step 4: Run the Application

**Terminal 1 — Start Backend:**
```bash
cd backend
python main.py
```
✅ Backend running at http://localhost:8000  
✨ Browser opens http://localhost:3000 automatically!

**Terminal 2 — Start Frontend:**
```bash
cd frontend
npm run dev
```
✅ Frontend running at http://localhost:3000

---

### Step 5: Use the App!

1. Open http://localhost:3000 in your browser
2. Type: "I have chicken breast 300g and rice 200g"
3. Click **Find Recipes**
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
- Check your `ANTHROPIC_API_KEY` in `backend/.env`

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
├── backend/
│   ├── main.py        # FastAPI app + Claude AI integration
│   ├── requirements.txt
│   └── .env           # Your API key (create this!)
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   └── components/
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
