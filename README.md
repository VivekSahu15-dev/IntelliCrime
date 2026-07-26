# IntelliCrime — AI-Driven Crime Analytics Platform

> Karnataka State Police · NCRB Intelligence Platform · Built for SCRB

An AI-powered crime analytics and visualization platform integrating sociological insights, criminological intelligence, and cutting-edge ML/LLM technology for the Karnataka State Police.

---

## Features

- **3D District Risk Map** — Choropleth borders, 3D columns, and heatmap views of all 31 Karnataka districts
- **Crime Hotspot Map** — Spatiotemporal heatmap with Morning / Afternoon / Evening / Night time bands
- **Criminal Network Graph** — Force-directed node graph connecting suspects, victims, and locations
- **AI/ML Predictive Dashboard** — DBSCAN clusters, IsoForest anomaly detection, Prophet forecasting
- **Socio-Economic Correlation** — Overlays poverty, unemployment, literacy on crime data
- **Data Upload Portal** — Upload any NCRB report or crime Excel/CSV; Claude AI analyses it accurately
- **National Comparison** — Karnataka benchmarked against all Indian states
- **Live Alert Banner** — Real-time crime spike detection with pulsing indicators

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Recharts, Leaflet, Vite |
| Backend | FastAPI, SQLAlchemy, SQLite |
| ML | scikit-learn (DBSCAN, IsoForest), Prophet |
| AI | Claude API (Anthropic) |
| Data | NCRB 2024, Karnataka district data |

---

## Project Structure

```
IntelliCrime/
├── api/                    # FastAPI backend
│   ├── main.py             # App entry point + CORS
│   ├── routes.py           # Core data endpoints
│   ├── ml_routes.py        # ML/AI endpoints
│   ├── upload_routes.py    # Smart upload + Claude AI
│   └── database.py         # SQLAlchemy setup
├── frontend/               # React frontend (Vite)
│   └── src/
│       ├── pages/          # 11 pages
│       ├── components/     # Sidebar, AlertBanner, UI
│       └── data/           # Pre-baked Karnataka GeoJSON + SVG data
├── ml/                     # ML pipeline scripts
├── data/                   # NCRB source data + GeoJSON
├── phase1/                 # Data cleaning pipeline
└── intellicrime.db         # SQLite database
```

---

## Local Setup & Execution

### Prerequisites
- Python 3.11+
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/IntelliCrime.git
cd IntelliCrime
```

### 2. Create and activate virtual environment
```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# Mac / Linux
source .venv/bin/activate
```

### 3. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 4. Set your Anthropic API key

**Windows (Command Prompt):**
```cmd
set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Windows (PowerShell):**
```powershell
$env:ANTHROPIC_API_KEY="sk-ant-your-key-here"
```

**Mac / Linux:**
```bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
```

> Get your API key from [console.anthropic.com](https://console.anthropic.com) → API Keys

### 5. Start the backend API
```bash
uvicorn api.main:app --reload --port 8000
```

API will be running at: `http://localhost:8000`
Interactive docs at: `http://localhost:8000/docs`

### 6. Install frontend dependencies and start
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Deployment on Zoho Catalyst

> ⚠️ **Important:** Deployment must be done exclusively on the [Catalyst platform](https://catalyst.zoho.com/promotions.html?cn=KSPH26) to qualify for evaluations.

Catalyst hosts the **backend on AppSail** (Python managed runtime) and the **frontend on Slate** (React hosting). Both are free on Catalyst's plan.

### Prerequisites
```bash
# Install the Catalyst CLI globally
npm install -g zcatalyst-cli

# Login to your Zoho Catalyst account
catalyst login
```

---

### Part A — Deploy Backend (FastAPI → AppSail)

#### Step 1: Create a Catalyst project
Go to [catalyst.zoho.com](https://catalyst.zoho.com) → **New Project** → name it `IntelliCrime` → Create.

#### Step 2: Add `app-config.json` in the project root
```json
{
  "memory": 512,
  "runtime": "python3.9",
  "startup_command": "uvicorn api.main:app --host 0.0.0.0 --port 8000"
}
```

#### Step 3: Initialize Catalyst in your project
```bash
cd IntelliCrime
catalyst init
```
When prompted:
- Select your `IntelliCrime` project
- Select **AppSail** as the component
- Select **Python** as the runtime
- Set source directory to `.` (root)

#### Step 4: Set environment variable on Catalyst console
In the Catalyst console → your project → **AppSail** → **Environment Variables**:
```
Key:   ANTHROPIC_API_KEY
Value: sk-ant-your-key-here
```

#### Step 5: Deploy the backend
```bash
catalyst deploy --only appsail
```

Catalyst gives you a URL like:
```
https://intellicrime-api-<id>.zohocatalyst.com
```

---

### Part B — Deploy Frontend (React → Catalyst Slate)

#### Step 1: Build the frontend for production
Update `frontend/src/utils/api.js` — replace `localhost:8000` with your AppSail URL:
```js
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
```

Then build:
```bash
cd frontend
npm run build
```
This produces a `frontend/dist/` folder.

#### Step 2: Deploy to Catalyst Slate
In the Catalyst console → your project → **Slate** → **New App**:
- Connect your GitHub repo
- Set **Root Directory** to `frontend`
- Set **Build Command** to `npm run build`
- Set **Output Directory** to `dist`
- Add environment variable:
  ```
  VITE_API_URL = https://intellicrime-api-<id>.zohocatalyst.com
  ```
- Click **Deploy**

Catalyst Slate gives you a live URL like:
```
https://intellicrime.<your-project>.zohocatalyst.com
```

#### Step 3: Update CORS in backend
Add your Slate URL to `api/main.py`:
```python
allow_origins=[
    "http://localhost:5173",
    "https://intellicrime.<your-project>.zohocatalyst.com",
]
```
Redeploy: `catalyst deploy --only appsail`

---

### Final Submission Links

```
GitHub Repo : https://github.com/YOUR_USERNAME/IntelliCrime
Live URL    : https://intellicrime.<your-project>.zohocatalyst.com
API Docs    : https://intellicrime-api-<id>.zohocatalyst.com/docs
```

---

## Data Sources

- NCRB Crime in India Report 2024
- Karnataka district socio-economic indicators
- Census 2011 population data

---

## Built With

- [Anthropic Claude](https://anthropic.com) — AI-powered data analysis
- [FastAPI](https://fastapi.tiangolo.com) — Python web framework
- [React](https://react.dev) — Frontend framework
- [Recharts](https://recharts.org) — Data visualization
- [Zoho Catalyst](https://catalyst.zoho.com) — Cloud deployment platform