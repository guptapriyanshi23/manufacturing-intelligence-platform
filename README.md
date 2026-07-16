# Manufacturing Intelligence Platform (MIP)

MIP is a production-grade industrial monitoring application containing a FastAPI backend service linked to a TimescaleDB/PostgreSQL datastore, and a TypeScript + React/Vite web interface.

---

##  Project Structure

```
├── backend/                  # FastAPI Application Code
│   ├── app/
│   │   ├── core/             # Enums, Security, Database Connections, Configs
│   │   ├── models/           # SQLAlchemy DB Models (Alerts, Advisories, Users, Hierarchy)
│   │   ├── modules/          # Business logic, Schemas, Routers, Services
│   │   └── migrations/       # Alembic Migration Scripts and env.py
│   ├── alembic.ini           # Alembic config file
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React SPA + TypeScript + Vite
│   ├── src/
│   │   ├── api/              # API Clients and client.ts
│   │   ├── types/            # TypeScript Interface files (enums, api_types, hierarchy)
│   │   ├── pages/            # View components (Dashboard, Alerts, Advisories, RCA, Admin)
│   │   └── layouts/          # Page Wrapper components
│   └── package.json          # Node dependencies
└── docker-compose.yml        # Orchestration services definition
```

---

## ⚡ Running the Backend Locally

### 1. Requirements
Ensure you have **Python 3.10+** installed.

### 2. Configure Environment Variables
Create a `.env` file in the `backend/` directory:
```bash
DATABASE_URL=postgresql+asyncpg://postgres:postgrespass@20.86.82.226:5432/mip
SECRET_KEY=your_secret_key_here
ENABLE_JWT_LOGIN=true
ENABLE_SSO_LOGIN=true
```

### 3. Setup Virtual Environment & Dependencies
From the workspace root directory:
```powershell
# Create venv
python -m venv backend/venv

# Activate virtual environment
# On Windows PowerShell:
.\backend\venv\Scripts\Activate.ps1
# On Windows CMD:
.\backend\venv\Scripts\activate.bat
# On Unix/macOS:
source backend/venv/bin/activate

# Install required python packages
pip install -r backend/requirements.txt
```

### 4. Run Server
Execute uvicorn setting Python path to resolve the `backend` package directory:
```powershell
# Windows PowerShell
$env:PYTHONPATH="."
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# Windows CMD
set PYTHONPATH=.
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# Unix/macOS Bash
PYTHONPATH=. python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend will be active at: `http://127.0.0.1:8000`  
Interactive Swagger docs: `http://127.0.0.1:8000/docs`

---

## 🗄️ Database Migrations (Alembic)

All migrations are controlled through Alembic. When executing migration commands from the **workspace root folder**, you must pass the configuration file pointer `-c backend/alembic.ini` and set `PYTHONPATH="."`.

### 1. Check Migration Status
Displays the active database schema revision:
```powershell
# Windows PowerShell
$env:PYTHONPATH="."
alembic -c backend/alembic.ini current

# Unix/macOS Bash
PYTHONPATH=. alembic -c backend/alembic.ini current
```

### 2. Create / Autogenerate a New Schema Migration
Auto-generates a migration script by comparing code models against the active database layout:
```powershell
# Windows PowerShell
$env:PYTHONPATH="."
alembic -c backend/alembic.ini revision --autogenerate -m "describe_migration_changes"

# Unix/macOS Bash
PYTHONPATH=. alembic -c backend/alembic.ini revision --autogenerate -m "describe_migration_changes"
```

### 3. Apply Upgrade Migrations
Executes all pending migrations to catch up the database layout to the latest model classes:
```powershell
# Windows PowerShell
$env:PYTHONPATH="."
alembic -c backend/alembic.ini upgrade head

# Unix/macOS Bash
PYTHONPATH=. alembic -c backend/alembic.ini upgrade head
```

### 4. Revert / Downgrade Migrations
Rolls back database changes to a previous revision:
```powershell
# Rollback 1 level:
$env:PYTHONPATH="."
alembic -c backend/alembic.ini downgrade -1

# Rollback to specific version:
$env:PYTHONPATH="."
alembic -c backend/alembic.ini downgrade <revision_id>
```

---

## Running the Frontend Locally

### 1. Requirements
Ensure you have **Node.js (v18+)** installed.

### 2. Configure Environment Variables
Create a `.env` file in the `frontend/` directory:
```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 3. Install & Start Web App
Navigate to the `frontend/` directory:
```bash
cd frontend

# Install Node modules
npm install

# Start Vite hot reloading dev server
npm run dev
```
Development Server will launch at: `http://localhost:5173`

### 4. Build Production Bundle
To compile and check TypeScript syntax check and bundle:
```bash
npm run build
```
Compiled static assets will be output in `frontend/dist/`.

---

## 🐳 Running inside Docker

MIP can be orchestrated in containers using the root `docker-compose.yml`:
```bash
# Build and run containers
docker-compose up --build
```
This boots up backend, frontend, and local PostgreSQL container services configured in the docker-compose environment.
