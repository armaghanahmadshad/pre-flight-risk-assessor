const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

const LOCAL_PATH   = path.join(__dirname, '../../mock_data/local_state.json');
const STAGING_PATH = path.join(__dirname, '../../mock_data/staging_state.json');

// Re-read staging on every request so changes from /api/apply-fixes are reflected
function readData() {
  const local   = JSON.parse(fs.readFileSync(LOCAL_PATH,   'utf8'));
  const staging = JSON.parse(fs.readFileSync(STAGING_PATH, 'utf8'));
  return { local, staging };
}

// ── Subagent 1: Environment Variable check ───────────────────────────────────
async function checkEnvVariables(local, staging) {
  const missing = local.environment_variables.filter(
    (v) => !staging.environment_variables.includes(v)
  );
  if (missing.length === 0) {
    return {
      name:        'Environment Variables',
      status:      'pass',
      detail:      'All required environment variables are present in staging.',
      remediation: null,
    };
  }
  return {
    name:        'Environment Variables',
    status:      'fail',
    detail:      `Missing in staging: ${missing.join(', ')}.`,
    remediation: missing.map((v) => `export ${v}="sk_live_..."`).join('\n'),
  };
}

// ── Subagent 2: Database Index check ────────────────────────────────────────
async function checkDatabaseIndexes(local, staging) {
  const missing = local.indexes.filter(
    (idx) => !staging.indexes.includes(idx)
  );
  if (missing.length === 0) {
    return {
      name:        'Database Indexes',
      status:      'pass',
      detail:      'All required database indexes are present in staging.',
      remediation: null,
    };
  }
  return {
    name:        'Database Indexes',
    status:      'fail',
    detail:      `Missing in staging: ${missing.join(', ')}.`,
    remediation: missing
      .map((idx) => {
        // Derive table name from index convention: <table>_<col>_idx
        const table = idx.split('_')[0];
        const col   = idx.replace(`${table}_`, '').replace('_idx', '');
        return `CREATE INDEX CONCURRENTLY ${idx} ON ${table}(${col});`;
      })
      .join('\n'),
  };
}

// ── POST /api/assess-deployment ──────────────────────────────────────────────
router.post('/assess-deployment', async (req, res) => {
  const { local, staging } = readData();

  // Both subagents run concurrently — neither waits for the other
  const [envCheck, idxCheck] = await Promise.all([
    checkEnvVariables(local, staging),
    checkDatabaseIndexes(local, staging),
  ]);

  const checks  = [envCheck, idxCheck];
  const anyFail = checks.some((c) => c.status === 'fail');

  res.json({
    riskScore: anyFail ? 90 : 10,
    level:     anyFail ? 'CRITICAL' : 'LOW',
    checks,
  });
});

// ── POST /api/apply-fixes ────────────────────────────────────────────────────
router.post('/apply-fixes', (req, res) => {
  const local = JSON.parse(fs.readFileSync(LOCAL_PATH, 'utf8'));

  // Overwrite staging with a deep-synced copy of local
  const synced = {
    environment_variables: [...local.environment_variables],
    database_tables:       [...local.database_tables],
    indexes:               [...local.indexes],
  };

  fs.writeFileSync(STAGING_PATH, JSON.stringify(synced, null, 2), 'utf8');

  res.json({
    success: true,
    message: 'Staging synchronized with production criteria.',
  });
});

module.exports = router;
