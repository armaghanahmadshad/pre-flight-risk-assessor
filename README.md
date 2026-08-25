# ✈ Pre-Flight Release Risk Assessor

A hackathon prototype that simulates **IBM Bob 2.0 Parallel Subagents** running concurrent pre-deployment health checks before shipping to production.

---

## Demo Flow

1. Click **▶ Run Assessment** — two subagents run in parallel and return a `CRITICAL` risk score of **90** with two failing checks and inline remediation commands.
2. Click **⚡ Apply Auto-Remediation (via Bob Subagent)** — the backend synchronises staging with local, the assessment auto-reruns, and the score transitions to a green **LOW / 10** with all `✓ PASS` badges.

---

## Architecture

```
pre-flight-assessor/
├── package.json                  ← npm workspaces root + concurrently dev script
├── mock_data/
│   ├── local_state.json          ← source of truth (production criteria)
│   └── staging_state.json        ← mutable staging state (overwritten on auto-fix)
├── backend/
│   ├── package.json
│   ├── server.js                 ← Express on :3001, CORS enabled
│   └── routes/
│       └── assess.js             ← both API routes + subagent functions
└── frontend/
    ├── package.json
    ├── vite.config.js            ← proxies /api → :3001
    └── src/
        ├── main.jsx
        ├── App.jsx
        └── components/
            └── Dashboard.jsx     ← dark-themed UI, remediation snippets, auto-fix button
```

### How the subagents work

`POST /api/assess-deployment` fires two independent `async` functions via `Promise.all()` — neither waits for the other:

| Subagent | What it checks |
|---|---|
| `checkEnvVariables()` | Diffs `environment_variables` arrays between local and staging |
| `checkDatabaseIndexes()` | Diffs `indexes` arrays between local and staging |

Each subagent returns a check object in the shape `{ name, status, detail, remediation }`. The route aggregates the results and derives `riskScore` and `level` from whether any check failed.

---

## API Reference

### `POST /api/assess-deployment`

Runs both subagents concurrently and returns a risk report.

**Request body:** any JSON (ignored — no input required for the mock)

**Response:**
```json
{
  "riskScore": 90,
  "level": "CRITICAL",
  "checks": [
    {
      "name": "Environment Variables",
      "status": "fail",
      "detail": "Missing in staging: STRIPE_API_KEY.",
      "remediation": "export STRIPE_API_KEY=\"sk_live_...\""
    },
    {
      "name": "Database Indexes",
      "status": "fail",
      "detail": "Missing in staging: transactions_user_id_idx.",
      "remediation": "CREATE INDEX CONCURRENTLY transactions_user_id_idx ON transactions(user_id);"
    }
  ]
}
```

After auto-remediation, re-running assessment returns:
```json
{
  "riskScore": 10,
  "level": "LOW",
  "checks": [
    { "name": "Environment Variables", "status": "pass", "detail": "All required environment variables are present in staging.", "remediation": null },
    { "name": "Database Indexes",      "status": "pass", "detail": "All required database indexes are present in staging.",      "remediation": null }
  ]
}
```

---

### `POST /api/apply-fixes`

Overwrites `mock_data/staging_state.json` with a full copy of `mock_data/local_state.json`.

**Response:**
```json
{
  "success": true,
  "message": "Staging synchronized with production criteria."
}
```

---

## Mock Data

### `mock_data/local_state.json` — source of truth
```json
{
  "environment_variables": ["DB_HOST", "DB_USER", "DB_PASS", "STRIPE_API_KEY"],
  "database_tables": ["users", "transactions", "logs"],
  "indexes": ["users_email_idx", "transactions_user_id_idx"]
}
```

### `mock_data/staging_state.json` — initial staging state (missing entries intentional)
```json
{
  "environment_variables": ["DB_HOST", "DB_USER", "DB_PASS"],
  "database_tables": ["users", "transactions", "logs"],
  "indexes": ["users_email_idx"]
}
```

To reset the demo after running auto-remediation, restore `staging_state.json` to the incomplete state above.

---

## Getting Started

**Prerequisites:** Node.js 18+

```bash
# 1. Install all workspace dependencies from the repo root
npm install

# 2. Start backend (:3001) and frontend (:5173) concurrently
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

To verify the backend independently:
```bash
curl -X POST http://localhost:3001/api/assess-deployment \
  -H "Content-Type: application/json" \
  -d "{}"
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Backend | Node.js + Express 4 |
| Concurrency | npm workspaces + `concurrently` |
| Data | Local JSON files — no database |
| Auth | None — prototype only |

---

## Constraints (by design)

- No database — all state is read from and written to local JSON files
- No authentication
- No TypeScript — plain JS for prototype speed
- The "subagents" are standard `async` functions; `Promise.all()` models the parallel execution pattern
