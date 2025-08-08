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

## Optional: Enable Redis-backed rate limiting

Set REDIS_URL in backend/.env, for example:

```ini
REDIS_URL=redis://localhost:6379
```

If REDIS_URL is not set or Redis is unreachable, the app falls back to in-memory rate limits.

## Roadmap (Commits)

1. chore: init repo + structure
2. feat(backend): auth, RBAC, survey models, Prisma setup
3. feat(frontend): app shell, auth pages, dashboard
4. feat(core): survey builder, feedback submission, analytics
5. test: Jest + Cypress
6. chore: docker + CI

## API highlights

- Auth
	- POST /api/auth/register (requires confirmPassword)
	- POST /api/auth/login
- Surveys
	- GET /api/surveys (students see only published + open)
	- GET /api/surveys/:id
	- POST /api/surveys (faculty/admin)
	- PUT /api/surveys/:id (faculty/admin)
	- POST /api/surveys/:id/publish (faculty/admin)
	- POST /api/surveys/:id/complete (faculty/admin)
	- DELETE /api/surveys/:id (faculty/admin)
	- POST /api/surveys/:id/submit (auth)
	- GET /api/surveys/:id/my-response (auth; non-anonymous only)
	- PUT /api/surveys/:id/response (auth; edit own response)
	- GET /api/surveys/:id/analytics (faculty/admin)
	- GET /api/surveys/:id/export.{csv|xlsx|pdf} (faculty/admin)
- Users (admin)
	- GET /api/users, GET /api/users/:id
	- PATCH /api/users/:id (edit role, lock account)
	- DELETE /api/users/:id (safe cascade: detach responses, delete feedbacks)

## Features cheatsheet
- Survey builder: drag-and-drop sections and questions with required flags and description.
- Student flow: one submission per non-anonymous survey; can view and edit via my-response; edit button only when published and open.
- Accessibility: required inputs have aria-invalid and aria-describedby.
- Admin: manage users (list/detail/delete), change roles, lock accounts; deletes are audit-logged.

## Backend tests
Run Jest tests:

```powershell
cd backend
npm test
```

Included:
- updateMyResponse required validation
- admin delete safety (responses detached, feedbacks removed)

## Start/Stop (Windows PowerShell)

Dev start

```powershell
# Backend dev (Express + TS)
cd backend
npm run dev

# Frontend dev (Vite) in another PowerShell
cd ../frontend
npm run dev
```

Dev stop (kill all running dev servers)

```powershell
# Stop any node/npm processes (safe for local dev)
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Stop-Process -Name npm -Force -ErrorAction SilentlyContinue

# Verify ports are free (no output means free)
netstat -ano | findstr ":4000"
netstat -ano | findstr ":4001"
netstat -ano | findstr ":5175"
```

If the backend starts twice (both 4000 and 4001), stop processes above and start once.

## Environment alignment

- Frontend API base: `frontend/.env`

```ini
VITE_API_URL=http://localhost:4000
```

Ensure backend is listening on 4000. If it falls back to 4001, either stop the extra instance and restart, or temporarily set `VITE_API_URL` to `http://localhost:4001` and restart the frontend.

## Health checks

- Backend: `GET http://localhost:4000/api/health` should return 200 OK.
- Frontend banner: if API is down or URL mismatch, a red banner appears near the top.

## Seed credentials

Local testing admin:

- email: `gojosatoru@gmail.com`
- password: `Satoru@123
`

If login shows "Invalid credentials", ensure the API is reachable and the email is trimmed/lowercased (server does this automatically).

## Troubleshooting

- Port in use: stop all node/npm processes as shown above, then start again.
- CORS: ensure backend `CORS_ORIGIN` includes `http://127.0.0.1:5175` and `http://localhost:5173` if needed.
- Frontend can’t reach API: confirm `VITE_API_URL` matches backend port and restart Vite.
- Lint issues: `npm run lint` inside both `backend/` and `frontend/`.
