# Frontend (React + Vite + Tailwind)

Scripts
- npm run dev
- npm run build
- npm run preview

Env
- VITE_API_URL=http://localhost:4000

E2E (Cypress)
- Install deps: npm install
- Start backend: from ../backend run npm run dev (API on http://localhost:4000)
- Start frontend: npm run dev (Vite on http://localhost:5173)
- Open Cypress: npm run cy:open
- Headless run: set CYPRESS_API_URL=http://localhost:4000; npm run cy:run

Notes
- The smoke spec seeds users via API and uses localStorage token for auth.
- Override API base for tests with CYPRESS_API_URL or cypress.config.ts env.
