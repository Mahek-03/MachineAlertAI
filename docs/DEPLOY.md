# MachineAlert AI – Deployment & Production Guide

This guide covers deployment procedures for **Google Cloud Run (Backend API)**, **Firebase Hosting / Vercel / Netlify (Frontend)**, **Docker Compose**, and **Render.com**.

---

## 1. Local Development Quickstart

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- Git

### Backend Setup:
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment (optional)
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed demo industrial machines and historical telemetry
python -m app.seed

# Run FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Backend API will be live at `http://localhost:8000` with Swagger docs at `http://localhost:8000/docs`.

### Frontend Setup:
```bash
# Open new terminal and navigate to frontend directory
cd frontend

# Install npm packages
npm install

# Start Vite dev server
npm run dev
```
Open browser at `http://localhost:5173`.

---

## 2. Docker & Docker Compose Deployment

A production-ready multi-stage container configuration is provided:

```bash
# Build and run backend + frontend together
docker compose up --build -d

# Check running containers
docker compose ps

# View real-time logs
docker compose logs -f
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

---

## 3. Google Cloud Run (Backend Container Deploy)

Google Cloud Run provides serverless container execution with auto-scaling to zero and HTTPS endpoints.

### Step 1: Configure GCP Project and Artifact Registry
```bash
# Set your GCP Project ID
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
gcloud config set project $PROJECT_ID

# Enable required Cloud APIs
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# Create Artifact Registry Docker repository
gcloud artifacts repositories create machinealert-repo \
    --repository-format=docker \
    --location=$REGION \
    --description="MachineAlert AI Containers"
```

### Step 2: Build & Push Backend Container
```bash
cd backend

# Submit Cloud Build
gcloud builds submit --tag $REGION-docker.pkg.dev/$PROJECT_ID/machinealert-repo/machinealert-api:latest .
```

### Step 3: Deploy to Cloud Run
```bash
gcloud run deploy machinealert-api \
    --image $REGION-docker.pkg.dev/$PROJECT_ID/machinealert-repo/machinealert-api:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8000 \
    --memory 1Gi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 5 \
    --set-env-vars="PORT=8000,ENVIRONMENT=production"
```
After deployment, note the public service URL (e.g., `https://machinealert-api-xyz-uc.a.run.app`).

---

## 4. Frontend Cloud Hosting

### Option A: Firebase Hosting
```bash
cd frontend

# Build optimized production bundle
npm run build

# Install Firebase CLI if needed
npm install -g firebase-tools
firebase login

# Initialize Firebase (select Hosting)
firebase init hosting
# - Public directory: dist
# - Single-page app: Yes
# - Overwrite index.html: No

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Option B: Vercel
```bash
cd frontend
npm install -g vercel
vercel deploy --prod
```

### Option C: Netlify
```bash
cd frontend
npm run build
npx netlify-cli deploy --prod --dir=dist
```

---

## 5. Alternative 1-Click Render.com Blueprint

A pre-configured `render.yaml` is located in the project root for deploying on Render's Free tier.

### Render Services
- `machinealert-api`: Python 3.11 Web Service (`rootDir: backend`, `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health check at `/health`).
- `machinealert-web`: Static Site (`rootDir: frontend`, `npm install && npm run build`, `staticPublishPath: dist`, SPA rewrite `/*` -> `/index.html`).

### Deploy Steps
1. Push your repository to GitHub / GitLab.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** $\rightarrow$ **Blueprint**.
3. Select this repository and click **Apply**.
4. Configure the two environment variables in the Render Dashboard (marked with `sync: false`):
   - **`machinealert-api`**:
     - `CORS_ORIGINS`: Set to your frontend static site URL (e.g. `https://machinealert-web.onrender.com`).
   - **`machinealert-web`**:
     - `VITE_API_URL`: Set to your backend API URL (e.g. `https://machinealert-api.onrender.com`).
5. Render builds both services on the Free tier. On startup, the backend automatically seeds SQLite with 10 demo machines, sensor readings, alerts, and maintenance tasks if empty.
