# College Feedback System (Rebuilt)

[![CI](https://github.com/x-sharikshaikh/college_feedback_system/actions/workflows/ci.yml/badge.svg)](https://github.com/x-sharikshaikh/college_feedback_system/actions)

A modern, secure, and scalable College Feedback System.

Tech Stack
- Frontend: React.js, Tailwind CSS, Axios, Recharts
- Backend: Node.js (Express) with TypeScript, Prisma ORM, JWT, bcrypt
- Database: PostgreSQL (primary), Redis (optional)
- AI (optional): Python FastAPI with scikit-learn/NLTK for sentiment analysis
- Testing: Jest (backend), Cypress (frontend)
- Deployment: Docker, GitHub Actions

## Monorepo Layout
- `backend/` Express + TS + Prisma
- `frontend/` React + Tailwind
- `ai-service/` FastAPI (optional)
- `.github/workflows/` CI pipelines

## Quick Start

Prerequisites

- Node.js 20+
- Docker (optional for DB/stack)

Backend

1) Create `backend/.env` (example values):

```
PORT=4000
JWT_SECRET=change-me
CORS_ORIGIN=http://localhost:5173,http://localhost:5175
DATABASE_URL=postgresql://feedback:feedback@localhost:5432/feedback?schema=public
```

2) Install deps and run dev:

```powershell
cd backend
npm install
npx prisma generate
npm run dev
```

Frontend

1) Install deps and run dev:

```powershell
cd frontend
npm install
npm run dev
```

Docker (optional)

```powershell
docker compose up --build
```

## End-to-End tests (Cypress)

Local, with backend already running on 4000:

```powershell
$env:CYPRESS_API_URL='http://localhost:4000'
cd frontend
npm run dev:e2e
# in another PowerShell
cd frontend
npm run cy:run
```

One-shot (frontend + backend + tests) from frontend folder:

```powershell
cd frontend
npm run e2e:with-be
```

If `concurrently` isn’t found, run:

```powershell
cd frontend
npm install
```

## Roadmap (Commits)

1. chore: init repo + structure
2. feat(backend): auth, RBAC, survey models, Prisma setup
3. feat(frontend): app shell, auth pages, dashboard
4. feat(core): survey builder, feedback submission, analytics
5. test: Jest + Cypress
6. chore: docker + CI
