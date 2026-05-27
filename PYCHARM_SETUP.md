# 🐍 Running NutriChef AI in PyCharm

Complete guide for running the project in PyCharm IDE.

---

## 📋 Prerequisites

- PyCharm (Community or Professional)
- Python 3.8+ installed
- Node.js 16+ installed

---

## 🚀 Step-by-Step Setup

### Step 1: Extract the Project

1. Unzip `nutrichef-ai.zip` to your desired location
2. Remember the folder path (e.g., `C:\Users\YourName\nutrichef-ai`)

---

### Step 2: Open in PyCharm

1. Open PyCharm
2. Click **File** → **Open**
3. Navigate to the `nutrichef-ai` folder
4. Click **OK**
5. If asked "Trust and Open Project?", click **Trust Project**

---

### Step 3: Create Virtual Environment (Recommended)

#### Option A: PyCharm Auto-Setup
1. PyCharm should detect `requirements.txt` and show a banner
2. Click **"Create virtual environment using requirements.txt"**
3. Wait for packages to install

#### Option B: Manual Setup
1. Click **File** → **Settings** (Windows/Linux) or **PyCharm** → **Preferences** (Mac)
2. Go to **Project: nutrichef-ai** → **Python Interpreter**
3. Click the gear icon ⚙️ → **Add**
4. Select **Virtualenv Environment** → **New Environment**
5. Click **OK**
6. Open PyCharm Terminal (bottom of window)
7. Run:
   ```bash
   pip install -r backend/requirements.txt
   ```

---

### Step 4: Get Your Anthropic API Key

1. Open browser: https://console.anthropic.com/keys
2. Sign up or log in
3. Click **"Create API Key"**
4. Copy the key (starts with `sk-ant-`)

> **Recipes** come from [TheMealDB](https://www.themealdb.com) — free, no key needed!

---

### Step 5: Configure Environment Variables

1. In PyCharm, open `backend/.env.example`
2. Right-click on the `backend` folder → **New** → **File**
3. Name it `.env` (exactly, with the dot!)
4. Copy this content:

```bash
# Anthropic API Key (get from https://console.anthropic.com/keys)
ANTHROPIC_API_KEY=paste_your_key_here
```

5. Replace `paste_your_key_here` with your actual API key
6. Save the file (Ctrl+S / Cmd+S)

**⚠️ IMPORTANT:** The file should look like:
```
ANTHROPIC_API_KEY=sk-ant-abc123xyz...
```
(No quotes, no extra spaces!)

---

### Step 6: Run the Backend

#### Method A: Using Run Configuration (Recommended)

1. Right-click on `backend/main.py`
2. Select **"Run 'main'"**
3. PyCharm will create a run configuration automatically

**Or create a permanent run configuration:**
1. Click **Run** → **Edit Configurations**
2. Click **+** → **Python**
3. Name: `Backend Server`
4. Script path: Browse to `backend/main.py`
5. Working directory: Select `backend` folder
6. Click **OK**
7. Click the green ▶️ play button

#### Method B: Using Terminal

1. Open PyCharm Terminal (Alt+F12 / Option+F12)
2. Navigate to backend:
   ```bash
   cd backend
   ```
3. Run:
   ```bash
   python main.py
   ```

**✅ Success!** You should see:
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
🌐 Opening http://localhost:3000 ...
```

**Keep this running!** Don't close this terminal/run window.

---

### Step 7: Run the Frontend

#### Option A: New PyCharm Terminal (Easiest)

1. Click the **+** next to your current terminal tab
2. Select **"Local Terminal"**
3. Navigate to frontend:
   ```bash
   cd frontend
   ```
4. Install dependencies (first time only):
   ```bash
   npm install
   ```
5. Run development server:
   ```bash
   npm run dev
   ```

#### Option B: External Terminal

1. Open your system terminal (CMD, PowerShell, Terminal)
2. Navigate to project:
   ```bash
   cd path/to/nutrichef-ai/frontend
   ```
3. Install and run:
   ```bash
   npm install
   npm run dev
   ```

**✅ Success!** You should see:
```
  VITE v5.0.11  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

---

### Step 8: Open the Application

1. Open your browser
2. Go to: **http://localhost:3000**
3. You should see the NutriChef AI interface!

---

## 🎮 Using the Application

### Try These Examples:

1. **Simple Ingredient Input:**
   ```
   You: I have chicken, rice, and broccoli
   ```

2. **Ask for Recipes:**
   ```
   You: What can I make with these ingredients?
   ```

3. **Click "Find Recipes"** to see real recipes from TheMealDB

4. **Click "Show Details"** on any recipe to see:
   - Full ingredients list
   - Step-by-step instructions
   - AI-estimated nutritional information
   - Recipe image

---

## 🐛 Troubleshooting

### Problem: "ModuleNotFoundError: No module named 'anthropic'"

**Solution:**
```bash
# In PyCharm terminal:
cd backend
pip install -r requirements.txt
```

---

### Problem: "ANTHROPIC_API_KEY is not set"

**Solution:**
1. Check that you created the `.env` file in the `backend/` folder
2. Make sure the file is named exactly `.env` (not `.env.txt`)
3. Check that your Anthropic API key is pasted correctly
4. Restart the backend server

---

### Problem: Port 8000 already in use

**Solution:**
```bash
# Stop any existing Python processes
# Then in backend/main.py, change the last line to:
uvicorn.run(app, host="0.0.0.0", port=8001)  # Use different port
```

---

### Problem: Frontend won't connect to backend

**Solution:**
1. Make sure backend is running (check terminal for "Uvicorn running")
2. Check backend URL in `frontend/src/App.jsx` and `frontend/src/components/RecipeCard.jsx`
3. Should be: `http://localhost:8000`

---

### Problem: npm not found

**Solution:**
You need to install Node.js:
1. Download from: https://nodejs.org/
2. Install it
3. Restart PyCharm
4. Try again

---

## 🎯 PyCharm Pro Tips

### 1. Split View for Both Servers

1. Run backend
2. Click the split icon in terminal (top right of terminal)
3. Open new terminal in split
4. Run frontend
5. Now you see both at once!

### 2. Create Run Configurations

**Backend Configuration:**
- Name: Backend
- Script: `backend/main.py`
- Working dir: `backend/`

**Frontend Configuration:**
- Name: Frontend
- Type: npm
- Command: run
- Scripts: dev
- Working dir: `frontend/`

Then use the dropdown to switch between them!

### 3. Enable Hot Reload

- Backend: Already enabled (uvicorn auto-reloads)
- Frontend: Already enabled (Vite hot reload)

Just save your files and see changes instantly!

---

## 📁 Project Structure in PyCharm

```
nutrichef-ai/
├── backend/              # 🐍 Python backend
│   ├── main.py          # ← Run this file
│   ├── requirements.txt
│   ├── .env            # ← Create this with your API key
│   └── .env.example
│
├── frontend/            # ⚛️ React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── components/
│   ├── package.json
│   └── vite.config.js
│
└── README.md            # Full documentation
```

---

## ✅ Final Checklist

Before you start coding:

- [ ] PyCharm opened the project
- [ ] Virtual environment created
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] `.env` file created with `ANTHROPIC_API_KEY`
- [ ] Backend running (http://localhost:8000)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Frontend running (http://localhost:3000)
- [ ] Browser shows the app
- [ ] You can chat with the AI
- [ ] Recipes load when you click "Find Recipes"

---

## 🎓 Next Steps

1. **Test the application** — Try different ingredients
2. **Read README.md** — Full documentation
3. **Customize it** — Change colors, add features
4. **Deploy it** — See DEPLOYMENT.md

---

## 💡 Common PyCharm Tasks

### Install New Package
```bash
# In PyCharm terminal:
pip install package-name
```

### Restart Backend
- Click the red stop square ⏹️
- Click the green play button ▶️

### View Logs
- Check the Run/Debug console at bottom
- Look for errors in red text

### Debug Backend
1. Set breakpoint (click left margin of line)
2. Click bug icon 🐛 instead of play ▶️
3. Inspect variables when it stops

---

## 🆘 Still Having Issues?

1. **Check PyCharm Terminal** for error messages
2. **Verify your API key** is correct in `.env`
3. **Restart PyCharm** (File → Invalidate Caches / Restart)
4. **Check Python version**: Should be 3.8+
   ```bash
   python --version
   ```

---

## 🎉 You're All Set!

Your NutriChef AI is now running in PyCharm!

**Happy Coding! 🐍✨**
