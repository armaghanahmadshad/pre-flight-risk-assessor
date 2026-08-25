import { useState } from 'react';

// ── Theme tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          '#0f172a',
  surface:     '#1e293b',
  surfaceHigh: '#273449',
  border:      '#334155',
  borderGlow:  '#3b82f6',
  text:        '#f1f5f9',
  muted:       '#94a3b8',
  accent:      '#38bdf8',
  green:       '#4ade80',
  greenDim:    '#166534',
  greenBg:     '#052e16',
  greenBorder: '#16a34a',
  red:         '#f87171',
  redDim:      '#991b1b',
  redBg:       '#2d0a0a',
  redBorder:   '#dc2626',
  yellow:      '#fbbf24',
  code:        '#0d1117',
};

const LEVEL_COLORS = {
  CRITICAL: { color: C.red,    border: C.redBorder,   bg: C.redBg   },
  HIGH:     { color: C.yellow, border: C.yellow,       bg: '#1c1505' },
  LOW:      { color: C.green,  border: C.greenBorder,  bg: C.greenBg },
};

const STATUS_COLORS = {
  pass: { color: C.green, border: C.greenBorder, bg: C.greenBg },
  fail: { color: C.red,   border: C.redBorder,   bg: C.redBg   },
};

// ── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={handleCopy} style={s.copyBtn}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [report,    setReport]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [fixing,    setFixing]    = useState(false);
  const [error,     setError]     = useState(null);
  const [fixMsg,    setFixMsg]    = useState(null);

  async function runAssessment() {
    setLoading(true);
    setError(null);
    setFixMsg(null);
    try {
      const res = await fetch('/api/assess-deployment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      setReport(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function applyFixes() {
    setFixing(true);
    setFixMsg(null);
    try {
      const res = await fetch('/api/apply-fixes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setFixMsg(data.message);
      // Automatically re-run the assessment so the UI reflects the fixed state
      await runAssessment();
    } catch (err) {
      setError(err.message);
    } finally {
      setFixing(false);
    }
  }

  const anyFail    = report?.checks?.some((c) => c.status === 'fail');
  const levelColor = report ? LEVEL_COLORS[report.level] ?? LEVEL_COLORS['LOW'] : null;
  const isBusy     = loading || fixing;

  return (
    <div style={s.page}>
      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <div>
            <h1 style={s.title}>✈ Pre-Flight Release Risk Assessor</h1>
            <p style={s.subtitle}>
              Powered by{' '}
              <span style={s.ibmBadge}>IBM Bob 2.0 Parallel Subagents</span>
              {' '}— run concurrent pre-deployment health checks before shipping to production.
            </p>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={s.main}>

        {/* Action bar */}
        <div style={s.actionBar}>
          <button
            style={isBusy ? { ...s.btnPrimary, ...s.btnDisabled } : s.btnPrimary}
            onClick={runAssessment}
            disabled={isBusy}
          >
            {loading ? <><span style={s.spinner} /> Assessing…</> : '▶  Run Assessment'}
          </button>

          {anyFail && (
            <button
              style={isBusy ? { ...s.btnFix, ...s.btnDisabled } : s.btnFix}
              onClick={applyFixes}
              disabled={isBusy}
            >
              {fixing
                ? <><span style={{ ...s.spinner, borderTopColor: C.green }} /> Applying fixes…</>
                : '⚡  Apply Auto-Remediation (via Bob Subagent)'}
            </button>
          )}
        </div>

        {/* Fix success banner */}
        {fixMsg && (
          <div style={s.successBanner}>
            <span style={{ color: C.green, fontWeight: 700 }}>✓</span> {fixMsg}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={s.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Report card */}
        {report && (
          <div style={s.card}>

            {/* Score row */}
            <div style={s.scoreRow}>
              <div style={s.scoreBlock}>
                <span style={s.scoreLabel}>Risk Score</span>
                <span style={{
                  ...s.scoreValue,
                  color: levelColor?.color,
                  textShadow: `0 0 24px ${levelColor?.color}66`,
                }}>
                  {report.riskScore}
                </span>
              </div>
              <div style={s.scoreRight}>
                <span style={{
                  ...s.levelBadge,
                  color:       levelColor?.color,
                  borderColor: levelColor?.border,
                  background:  levelColor?.bg,
                  boxShadow:   `0 0 12px ${levelColor?.border}55`,
                }}>
                  {report.level}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div style={s.divider} />

            {/* Checks */}
            <h2 style={s.checksHeading}>Pre-Flight Checks</h2>
            <ul style={s.checkList}>
              {report.checks.map((check) => {
                const sc = STATUS_COLORS[check.status];
                return (
                  <li key={check.name} style={{
                    ...s.checkItem,
                    borderColor: sc.border,
                    boxShadow:   check.status === 'fail'
                      ? `0 0 0 1px ${sc.border}44, inset 0 0 20px ${sc.border}0d`
                      : `0 0 0 1px ${sc.border}33`,
                  }}>
                    {/* Check header */}
                    <div style={s.checkTop}>
                      <span style={s.checkName}>{check.name}</span>
                      <span style={{
                        ...s.statusChip,
                        color:      sc.color,
                        background: sc.bg,
                        border:     `1px solid ${sc.border}`,
                      }}>
                        {check.status === 'pass' ? '✓' : '✗'} {check.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Detail */}
                    <p style={s.checkDetail}>{check.detail}</p>

                    {/* Remediation snippet — only for failed checks */}
                    {check.status === 'fail' && check.remediation && (
                      <div style={s.remediation}>
                        <div style={s.remediationHeader}>
                          <span style={s.remediationLabel}>⚙ Remediation</span>
                          <CopyButton text={check.remediation} />
                        </div>
                        <pre style={s.codeBlock}>{check.remediation}</pre>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight:   '100vh',
    background:  C.bg,
    fontFamily:  '-apple-system, "Segoe UI", system-ui, sans-serif',
    color:       C.text,
  },
  header: {
    background:  C.surface,
    borderBottom: `1px solid ${C.border}`,
    padding:     '20px 32px',
  },
  headerInner: {
    maxWidth: '860px',
    margin:   '0 auto',
  },
  title: {
    margin:     0,
    fontSize:   '20px',
    fontWeight: 700,
    color:      C.text,
    letterSpacing: '-0.01em',
  },
  subtitle: {
    margin:   '6px 0 0',
    fontSize: '13px',
    color:    C.muted,
  },
  ibmBadge: {
    color:       C.accent,
    fontWeight:  600,
    background:  '#0c2a3f',
    padding:     '1px 7px',
    borderRadius: '4px',
    border:      `1px solid ${C.accent}55`,
    fontSize:    '12px',
  },
  main: {
    maxWidth: '860px',
    margin:   '36px auto',
    padding:  '0 24px',
  },
  actionBar: {
    display:   'flex',
    flexWrap:  'wrap',
    gap:       '12px',
    alignItems: 'center',
    marginBottom: '20px',
  },
  btnPrimary: {
    display:      'inline-flex',
    alignItems:   'center',
    gap:          '8px',
    padding:      '10px 22px',
    fontSize:     '14px',
    fontWeight:   600,
    background:   C.borderGlow,
    color:        '#ffffff',
    border:       'none',
    borderRadius: '6px',
    cursor:       'pointer',
    letterSpacing: '0.01em',
  },
  btnFix: {
    display:      'inline-flex',
    alignItems:   'center',
    gap:          '8px',
    padding:      '10px 22px',
    fontSize:     '14px',
    fontWeight:   600,
    background:   C.greenBg,
    color:        C.green,
    border:       `1px solid ${C.greenBorder}`,
    borderRadius: '6px',
    cursor:       'pointer',
    letterSpacing: '0.01em',
    boxShadow:    `0 0 12px ${C.greenBorder}44`,
  },
  btnDisabled: {
    opacity: 0.5,
    cursor:  'not-allowed',
  },
  spinner: {
    display:      'inline-block',
    width:        '12px',
    height:       '12px',
    border:       '2px solid rgba(255,255,255,0.2)',
    borderTop:    '2px solid #ffffff',
    borderRadius: '50%',
    animation:    'spin 0.7s linear infinite',
  },
  successBanner: {
    marginBottom: '16px',
    padding:      '10px 16px',
    background:   C.greenBg,
    border:       `1px solid ${C.greenBorder}`,
    borderRadius: '6px',
    fontSize:     '13px',
    color:        C.text,
  },
  errorBox: {
    marginBottom: '16px',
    padding:      '10px 16px',
    background:   C.redBg,
    border:       `1px solid ${C.redBorder}`,
    borderRadius: '6px',
    color:        C.red,
    fontSize:     '13px',
  },
  card: {
    background:   C.surface,
    border:       `1px solid ${C.border}`,
    borderRadius: '10px',
    padding:      '28px',
  },
  scoreRow: {
    display:    'flex',
    alignItems: 'flex-end',
    gap:        '24px',
    marginBottom: '24px',
  },
  scoreBlock: {
    display:       'flex',
    flexDirection: 'column',
  },
  scoreRight: {
    display:    'flex',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize:      '11px',
    fontWeight:    700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color:         C.muted,
    marginBottom:  '4px',
  },
  scoreValue: {
    fontSize:   '64px',
    fontWeight: 800,
    lineHeight: 1,
  },
  levelBadge: {
    display:       'inline-block',
    padding:       '5px 16px',
    borderRadius:  '99px',
    fontSize:      '13px',
    fontWeight:    800,
    letterSpacing: '0.08em',
    border:        '1px solid',
  },
  divider: {
    height:       '1px',
    background:   C.border,
    marginBottom: '24px',
  },
  checksHeading: {
    margin:        '0 0 16px',
    fontSize:      '13px',
    fontWeight:    700,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color:         C.muted,
  },
  checkList: {
    listStyle: 'none',
    margin:    0,
    padding:   0,
    display:   'flex',
    flexDirection: 'column',
    gap:       '12px',
  },
  checkItem: {
    padding:      '16px 18px',
    background:   C.surfaceHigh,
    borderRadius: '8px',
    border:       '1px solid',
  },
  checkTop: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   '6px',
  },
  checkName: {
    fontSize:   '14px',
    fontWeight: 600,
    color:      C.text,
  },
  statusChip: {
    display:       'inline-block',
    padding:       '2px 10px',
    borderRadius:  '99px',
    fontSize:      '11px',
    fontWeight:    700,
    letterSpacing: '0.06em',
  },
  checkDetail: {
    margin:     0,
    fontSize:   '13px',
    color:      C.muted,
    lineHeight: 1.6,
  },
  remediation: {
    marginTop:    '14px',
    borderTop:    `1px solid ${C.border}`,
    paddingTop:   '14px',
  },
  remediationHeader: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   '8px',
  },
  remediationLabel: {
    fontSize:      '11px',
    fontWeight:    700,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color:         C.yellow,
  },
  codeBlock: {
    margin:       0,
    padding:      '12px 14px',
    background:   C.code,
    border:       `1px solid ${C.border}`,
    borderRadius: '6px',
    fontSize:     '12px',
    fontFamily:   '"SF Mono", "Fira Code", "Consolas", monospace',
    color:        '#a5f3fc',
    overflowX:    'auto',
    lineHeight:   1.6,
    whiteSpace:   'pre',
  },
  copyBtn: {
    padding:      '3px 10px',
    fontSize:     '11px',
    fontWeight:   600,
    background:   C.surfaceHigh,
    color:        C.muted,
    border:       `1px solid ${C.border}`,
    borderRadius: '4px',
    cursor:       'pointer',
  },
};

// Inject keyframe for spinner (runs once)
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(styleTag);
}
