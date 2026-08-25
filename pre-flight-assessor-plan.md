# Pre-Flight Release Risk Assessor — Scaffold Plan

## Top-Level Overview

Scaffold a monolithic repository containing two co-located packages:

- **`backend/`** — Node.js / Express server with a single route `POST /api/assess-deployment` that returns a hardcoded mock risk-assessment payload.
- **`frontend/`** — React + Vite single-page app with a dashboard view that triggers the API and renders the response.

No database, no authentication, no external services. All data is mocked inline.  
The goal is to get the full request/response wire working end-to-end so UI and logic can be iterated on separately afterward.

---

## Proposed Directory Tree

```
pre-flight-assessor/
├── package.json                  ← root workspace manifest (npm workspaces)
├── pre-flight-assessor-plan.md
│
├── backend/
│   ├── package.json
│   ├── server.js                 ← Express entry point, mounts routes
│   └── routes/
│       └── assess.js             ← POST /api/assess-deployment handler
│
└── frontend/
    ├── package.json
    ├── vite.config.js            ← proxy /api → backend :3001
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        └── components/
            └── Dashboard.jsx     ← single dashboard view
```

---

## Sub-Tasks

---

### Sub-Task 1 — Root Workspace Setup

**Intent**  
Create the root `package.json` that declares npm workspaces pointing at `backend/` and `frontend/`. This lets both packages be managed from a single root install and enables a single `npm run dev` to start both servers via a `concurrently` script.

**Expected Outcomes**
- `package.json` exists at root with `"workspaces": ["backend", "frontend"]`
- A `dev` script uses `concurrently` to start both packages simultaneously
- `concurrently` is installed as a root dev dependency

**Todo List**
1. Create root `package.json` with workspace config and `dev` script
2. Add `concurrently` as a root devDependency

**Relevant Context**
- npm workspaces: each sub-package has its own `package.json`; root orchestrates them
- `concurrently` command pattern: `"concurrently \"npm run dev --workspace=backend\" \"npm run dev --workspace=frontend\""`

**Status** — `[x] done`

---

### Sub-Task 2 — Backend Package

**Intent**  
Scaffold the Express server and the single mock route. The server must serve `POST /api/assess-deployment` returning the hardcoded risk payload. CORS must be enabled so the Vite dev server (port 5173) can reach it.

**Expected Outcomes**
- `backend/package.json` with `express` and `cors` dependencies and a `dev` script (`node server.js` or `nodemon`)
- `backend/server.js` starts Express on port `3001`, mounts the assess route, enables CORS
- `backend/routes/assess.js` returns the hardcoded mock payload on POST regardless of request body
- `curl -X POST http://localhost:3001/api/assess-deployment` returns the mock JSON

**Mock Payload to return**
```json
{
  "riskScore": 72,
  "level": "HIGH",
  "checks": [
    { "name": "Test Coverage", "status": "fail", "detail": "Coverage is 58%, below the 80% threshold." },
    { "name": "Open Critical Bugs", "status": "fail", "detail": "3 unresolved P0 bugs found in the milestone." },
    { "name": "Dependency Audit", "status": "pass", "detail": "No known vulnerabilities in production dependencies." },
    { "name": "Migration Scripts", "status": "pass", "detail": "All DB migration scripts are present and reviewed." },
    { "name": "Feature Flag Coverage", "status": "fail", "detail": "2 new features are not gated behind feature flags." }
  ]
}
```

**Todo List**
1. Create `backend/package.json`
2. Create `backend/server.js`
3. Create `backend/routes/assess.js` with the hardcoded mock response

**Relevant Context**
- Port `3001` is chosen to avoid collision with Vite's default `5173`
- `cors()` middleware applied globally is sufficient — no fine-grained origin config needed for a prototype

**Status** — `[x] done`

---

### Sub-Task 3 — Frontend Package

**Intent**  
Scaffold the Vite + React app with a single `Dashboard` component. The dashboard has a button that calls `POST /api/assess-deployment` and renders the returned risk report: the score, risk level badge, and a table/list of named checks each showing pass/fail status and detail text.

**Expected Outcomes**
- `frontend/package.json` with `react`, `react-dom`, `vite`, `@vitejs/plugin-react` dependencies
- `frontend/vite.config.js` proxies `/api` → `http://localhost:3001` (eliminates CORS concerns in dev)
- `frontend/index.html` — standard Vite HTML entry point
- `frontend/src/main.jsx` — React root mount
- `frontend/src/App.jsx` — renders `<Dashboard />`
- `frontend/src/components/Dashboard.jsx` — contains:
  - "Run Assessment" button
  - Loading state while fetch is in flight
  - Risk score display (numeric + level badge coloured by severity)
  - Checklist rendering each check's name, pass/fail chip, and detail string
  - Basic error state if the fetch fails

**Todo List**
1. Create `frontend/package.json`
2. Create `frontend/vite.config.js` with `/api` proxy
3. Create `frontend/index.html`
4. Create `frontend/src/main.jsx`
5. Create `frontend/src/App.jsx`
6. Create `frontend/src/components/Dashboard.jsx`

**Relevant Context**
- Proxy config in Vite: `server.proxy = { '/api': 'http://localhost:3001' }`
- No CSS framework required — inline styles or a plain CSS module are fine for the prototype
- Fetch call: `fetch('/api/assess-deployment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })`

**Status** — `[x] done`

---

## Terminal Commands to Initialize

Run these from the workspace root **after** the plan is approved and files are written by the agent:

```powershell
# 1. Install all workspace dependencies from root
npm install

# 2. Start both backend and frontend dev servers concurrently
npm run dev
```

The backend will be available at `http://localhost:3001` and the frontend at `http://localhost:5173`.

---

## Non-Goals (explicitly out of scope)

- No database or persistent storage
- No authentication or session handling
- No deployment configuration (Docker, CI, etc.)
- No testing setup
- No TypeScript (plain JS for prototype speed)
