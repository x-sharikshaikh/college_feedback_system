# College Feedback System (Rebuilt)

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

1) Copy `backend/.env.example` to `backend/.env`
2) Install deps and run dev:
	- cd backend
	- npm install
	- npm run prisma:generate
	- npm run dev

Frontend

1) Install deps and run dev:
	- cd frontend
	- npm install
	- npm run dev

Docker (optional)

- docker compose up --build

## Roadmap (Commits)

1. chore: init repo + structure
2. feat(backend): auth, RBAC, survey models, Prisma setup
3. feat(frontend): app shell, auth pages, dashboard
4. feat(core): survey builder, feedback submission, analytics
5. test: Jest + Cypress
6. chore: docker + CI
