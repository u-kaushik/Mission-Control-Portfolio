// Mission Control — Scorecard page
// =============================================
// SCORECARD PAGE
// =============================================

// ── Week helpers ──────────────────────────────────────────────────────────
function scorecardMondayOf(d) {
  const dt = new Date(d); const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff); dt.setHours(0,0,0,0); return dt;
}
function scorecardSundayOf(mon) {
  const d = new Date(mon); d.setDate(d.getDate() + 6); return d;
}
function scorecardWeekLabel(mon) {
  const sun = scorecardSundayOf(mon);
  const fmt = (d) => d.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
  return `${fmt(mon)} – ${fmt(sun)}`;
}
function scorecardWeekLabelShort(mon) {
  // Returns two-line HTML: D/M on top, D/M on bottom — for narrow week column headers
  const sun = scorecardSundayOf(mon);
  const fmt = (d) => `${d.getDate()}/${d.getMonth()+1}`;
  return `<span style="display:block;line-height:1.3">${fmt(mon)}</span><span style="display:block;line-height:1.3">${fmt(sun)}</span>`;
}
function scorecardWeekISO(mon) { return mon.toISOString().slice(0, 10); }

let _scorecardWeekOf   = scorecardMondayOf(new Date()); // current Monday
let _scorecardNumWeeks = 4;  // 4 weeks fits without horizontal scroll

function scorecardPrevWeek() { _scorecardWeekOf = new Date(_scorecardWeekOf.getTime() - 7*86400000); renderScorecardPage(); }
function scorecardNextWeek() {
  const nw = new Date(_scorecardWeekOf.getTime() + 7*86400000);
  if (nw <= new Date()) { _scorecardWeekOf = nw; renderScorecardPage(); }
}

// ── Canonical metric owners (agency metrics) ──
const METRIC_OWNERS = {
  'Outreach Sent':     'penny',
  'Meetings Booked':   'penny',
  'Closes':            'penny',
  'Active Clients':    'jarvis',
  'MRR':               'jarvis',
};
// Case-insensitive lookup + keyword fallback (DB metric names may omit £/% suffixes)
const _METRIC_OWNER_LC = {};
Object.keys(METRIC_OWNERS).forEach(k => { _METRIC_OWNER_LC[k.toLowerCase()] = METRIC_OWNERS[k]; });
function _metricOwner(name) {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  const exact = _METRIC_OWNER_LC[n];
  if (exact) return exact;
  const stripped = n.replace(/\s*[\(\)£%]+/g, '').replace(/\s+/g, ' ').trim();
  for (const key of Object.keys(_METRIC_OWNER_LC)) {
    if (key.replace(/\s*[\(\)£%]+/g, '').replace(/\s+/g, ' ').trim() === stripped) return _METRIC_OWNER_LC[key];
  }
  return null;
}

// ── Canonical scorecard metric order (agency) ──
const METRIC_ORDER = [
  'Outreach Sent',
  'Meetings Booked',
  'Closes',
  'Active Clients',
  'MRR',
];
// Fuzzy metric order lookup — strips (£)/(%) for matching
const _METRIC_ORDER_NORM = METRIC_ORDER.map(m => m.toLowerCase().replace(/\s*[\(\)£%]+/g, '').replace(/\s+/g, ' ').trim());
function _metricOrderIndex(name) {
  const n = (name || '').toLowerCase().trim();
  let idx = METRIC_ORDER.findIndex(m => m.toLowerCase() === n);
  if (idx !== -1) return idx;
  const norm = n.replace(/\s*[\(\)£%]+/g, '').replace(/\s+/g, ' ').trim();
  return _METRIC_ORDER_NORM.indexOf(norm);
}
function _canonicalMetricSort(names) {
  return [...names].sort((a, b) => {
    const ai = _metricOrderIndex(a), bi = _metricOrderIndex(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

// ── Auto-populate metrics from live data (agency) ──
const AUTO_METRICS = {
  'Outreach Sent': {
    owner: 'penny',
    compute: async (weekISO, nextMondayISO) => {
      const rows = await sbQuery('outreach_campaigns', { select: 'outreach_sent', 'status': 'eq.Active', 'deleted_at': 'is.null', limit: 200 }, true);
      return (Array.isArray(rows) ? rows : []).reduce((s, r) => s + (Number(r.outreach_sent) || 0), 0);
    }
  },
  'Meetings Booked': {
    owner: 'penny',
    compute: async (weekISO, nextMondayISO) => {
      const rows = await sbQuery('outreach_campaigns', { select: 'meetings_booked', 'status': 'eq.Active', 'deleted_at': 'is.null', limit: 200 }, true);
      return (Array.isArray(rows) ? rows : []).reduce((s, r) => s + (Number(r.meetings_booked) || 0), 0);
    }
  },
  'Closes': {
    owner: 'penny',
    compute: async (weekISO, nextMondayISO) => {
      const rows = await sbQuery('outreach_campaigns', { select: 'closes', 'status': 'eq.Active', 'deleted_at': 'is.null', limit: 200 }, true);
      return (Array.isArray(rows) ? rows : []).reduce((s, r) => s + (Number(r.closes) || 0), 0);
    }
  },
  'Active Clients': {
    owner: 'jarvis',
    compute: async () => {
      const rows = await sbQuery('agency_clients', { select: 'id', 'status': 'eq.Active', 'deleted_at': 'is.null', limit: 500 }, true);
      return Array.isArray(rows) ? rows.length : 0;
    }
  },
  'MRR': {
    owner: 'jarvis',
    compute: async () => {
      const rows = await sbQuery('agency_clients', { select: 'monthly_value', 'status': 'eq.Active', 'deleted_at': 'is.null', limit: 500 }, true);
      return (Array.isArray(rows) ? rows : []).reduce((s, r) => s + (Number(r.monthly_value) || 0), 0);
    }
  },
};

let _scAutoPopRunning = false;
async function scorecardAutoPopulate(weekISO) {
  if (_scAutoPopRunning) return false;
  _scAutoPopRunning = true;
  try {
    const currentMon = scorecardMondayOf(new Date());
    const currentISO = scorecardWeekISO(currentMon);
    if (weekISO !== currentISO) return false;

    const nextMon = new Date(currentMon.getTime() + 7 * 86400000);
    const nextMondayISO = scorecardWeekISO(nextMon);

    // Fetch existing rows for this week
    const existing = await sbQuery('agency_scorecard_metrics', {
      select: 'id,metric_name,owner_id,target_value,actual_value,source',
      'week_of': `eq.${weekISO}`, limit: 50
    }, true);
    const existingArr = Array.isArray(existing) ? existing : [];
    const existingMap = {};
    existingArr.forEach(r => { existingMap[r.metric_name] = r; });
    // Fuzzy lookup: strip (£)/(%) for matching DB metric names to AUTO_METRICS keys
    const _normKey = s => (s || '').toLowerCase().replace(/\s*[\(\)£%]+/g, '').replace(/\s+/g, ' ').trim();
    const _fuzzyFindRow = (metricName) => {
      if (existingMap[metricName]) return existingMap[metricName];
      const norm = _normKey(metricName);
      return existingArr.find(r => _normKey(r.metric_name) === norm) || null;
    };

    const entries = Object.entries(AUTO_METRICS);
    const results = await Promise.allSettled(
      entries.map(([, cfg]) => cfg.compute(weekISO, nextMondayISO))
    );

    let changed = false;
    for (let i = 0; i < entries.length; i++) {
      const [metricName, cfg] = entries[i];
      const result = results[i];
      if (result.status !== 'fulfilled' || result.value == null) continue;

      const actual = result.value;
      const row = _fuzzyFindRow(metricName);

      // Skip if user manually edited this cell (source = 'manual' with a value)
      if (row && row.source === 'manual' && row.actual_value != null) continue;

      // Compute status vs target
      const target = row ? row.target_value : null;
      let status = 'on_track';
      if (target != null && target > 0) {
        const pct = actual / target;
        if (pct < 0.7) status = 'below_goal';
        else if (pct < 0.95) status = 'at_risk';
      }

      if (row) {
        if (row.actual_value === actual) continue; // no change
        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/agency_scorecard_metrics?id=eq.${row.id}`, {
          method: 'PATCH',
          headers: { 'apikey': SUPABASE_SVC, 'Authorization': 'Bearer ' + SUPABASE_SVC,
            'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ metric_name: metricName, actual_value: actual, owner_id: cfg.owner, status, source: 'auto' })
        });
        if (!patchRes.ok) console.warn('[Scorecard] auto-populate PATCH failed:', patchRes.status);
        changed = true;
      } else {
        // Look up target from most recent row for this metric
        let targetValue = null;
        const prev = await sbQuery('agency_scorecard_metrics', {
          select: 'target_value,notes', 'metric_name': `eq.${metricName}`,
          order: 'week_of.desc', limit: 1
        }, true);
        if (Array.isArray(prev) && prev.length > 0) targetValue = prev[0].target_value;

        const postRes = await fetch(`${SUPABASE_URL}/rest/v1/agency_scorecard_metrics`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_SVC, 'Authorization': 'Bearer ' + SUPABASE_SVC,
            'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            metric_name: metricName, owner_id: cfg.owner,
            target_value: targetValue, actual_value: actual,
            week_of: weekISO, status, source: 'auto'
          })
        });
        if (!postRes.ok) console.warn('[Scorecard] auto-populate POST failed:', postRes.status);
        changed = true;
      }
    }
    return changed;
  } catch (e) {
    console.warn('[Scorecard] auto-populate error:', e);
    return false;
  } finally {
    _scAutoPopRunning = false;
  }
}

// ── Shared scorecard table builder (used by both dashboard widget + full page) ──
// cols: Metric (sticky) | Goal (sticky) | Owner (sticky) | [Status sticky — full only] | wk1…wkN oldest→newest
// compact=true  → widget: avatar-only owner (40px), no status col — no scroll on 13 weeks
// compact=false → full-page: avatar+name owner (100px) + status col (70px)
// Red cell = actual < goal; click red = createIssueFromMetric; click green current = edit
function _buildScorecardTable(rows, weeks, containerId, compact = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const currentISO   = scorecardWeekISO(scorecardMondayOf(new Date()));
  const metricNames  = _canonicalMetricSort([...new Set(rows.map(r => r.metric_name))]);
  const getCell      = (name, iso) => rows.find(r => r.metric_name === name && r.week_of === iso);
  const getMetaRow   = (name) => rows.slice().sort((a, b) => b.week_of.localeCompare(a.week_of)).find(r => r.metric_name === name) || { metric_name: name };
  const isBelowGoal  = (actual, target) => actual != null && target != null && Number(actual) < Number(target);
  const weekColW = compact ? 56 : 52;

  // Col widths:
  //   compact   → metric=148, goal=40, owner=46, status=58 (4 sticky)
  //   full-page → metric=155, goal=44, owner=100, status=70 (4 sticky)
  const mW = compact ? 130 : 155, gW = compact ? 40 : 44, oW = compact ? 46 : 100, sW = compact ? 72 : 70;
  const stickyCount = 4;
  // left offsets for sticky cols
  const oLeft = mW + gW;       // 199
  const sLeft = oLeft + oW;    // full: 299

  // Owner cell — canonical owner from METRIC_OWNERS (case-insensitive), fallback to DB row
  const ownerCell = (meta) => {
    const ag = agentInfo(_metricOwner(meta.metric_name) || meta.owner_id);
    if (!ag) return `<span style="font-size:10px;color:var(--text-muted)">${escHtml((meta.owner_id||'—').slice(0,6))}</span>`;
    const avatarHtml = ag.avatar
      ? `<img src="${ag.avatar}?v=${AVATAR_BUST}" alt="${ag.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;pointer-events:none;position:absolute;inset:0" onerror="_avErr(this)"><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:12px">${ag.emoji}</span>`
      : `<span style="font-size:12px;pointer-events:none">${ag.emoji}</span>`;
    const avatarSpan = `<span data-agent-id="${ag.id}" style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;overflow:hidden;flex-shrink:0;cursor:pointer;position:relative">${avatarHtml}</span>`;
    if (compact) return avatarSpan;
    // Full-page: entire cell div is clickable; name has pointer-events:none so click bubbles to data-agent-id
    return `<div data-agent-id="${ag.id}" style="display:flex;align-items:center;gap:6px;cursor:pointer">
      ${avatarSpan}
      <span style="font-size:11px;color:var(--text-secondary);white-space:nowrap;pointer-events:none">${escHtml(ag.name)}</span>
    </div>`;
  };

  // Status cell — full-page only
  const statusCell = (name, goalVal) => {
    const latestCell = weeks.slice().reverse().map(w => getCell(name, w.iso)).find(c => c && c.actual_value != null);
    if (!latestCell) return `<span style="font-size:10px;color:var(--text-muted)">—</span>`;
    const effectiveBelowStatus = isBelowGoal(latestCell.actual_value, latestCell.target_value ?? goalVal);
    return effectiveBelowStatus
      ? `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;background:var(--red-bg);color:var(--red)">Off Track</span>`
      : `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;background:var(--green-bg);color:var(--green)">On Track</span>`;
  };

  const tableHtml = `
    <table class="scorecard-table sc-history-table${compact ? ' sc-compact' : ''}" style="table-layout:fixed;${compact ? 'width:max-content;min-width:100%' : 'width:100%'}">
      <colgroup>
        <col style="width:${mW}px">
        <col style="width:${gW}px">
        <col style="width:${oW}px">
        <col style="width:${sW}px">
        ${weeks.map(() => `<col style="width:${weekColW}px">`).join('')}
      </colgroup>
      <thead>
      <tr style="background:var(--surface-2)">
        <th style="border-right:1px solid var(--border-light)">Metric</th>
        <th style="text-align:center;border-right:1px solid var(--border-light)">Goal</th>
        <th style="${compact ? 'text-align:center;' : ''}border-right:1px solid var(--border-light)">Owner</th>
        <th style="border-right:2px solid var(--border)">Status</th>
        ${weeks.map((w) => {
          const isCur = w.iso === currentISO;
          return `<th style="text-align:center;font-size:9px;padding:4px 2px;vertical-align:middle;${isCur ? 'color:var(--blue);font-weight:800;' : ''}">${w.label}</th>`;
        }).join('')}
      </tr>
      <tr style="background:var(--surface-2)">
        <th style="border-right:1px solid var(--border-light);padding:2px"></th>
        <th style="border-right:1px solid var(--border-light);padding:2px"></th>
        <th style="border-right:1px solid var(--border-light);padding:2px"></th>
        <th style="border-right:2px solid var(--border);padding:2px"></th>
        ${weeks.map((w, idx) => {
          const isCur = w.iso === currentISO;
          return `<th style="text-align:center;padding:2px 4px;font-size:9px;font-weight:700;${isCur ? 'color:var(--blue);' : 'color:var(--text-muted);'}">W${idx+1}</th>`;
        }).join('')}
      </tr>
      </thead>
      <tbody>
        ${metricNames.map(name => {
          const meta    = getMetaRow(name);
          const goalVal = meta.target_value != null ? meta.target_value : null;
          const curCell = getCell(name, currentISO);
          const curBelow = curCell && (curCell.target_value ?? goalVal) != null && isBelowGoal(curCell.actual_value, curCell.target_value ?? goalVal);
          const stripClr = 'var(--border-light)';
          const metricTip = (meta.notes || '').trim();
          return `<tr>
            <td class="${metricTip ? 'sc-metric-tip' : ''}" ${metricTip ? `data-tip="${escHtml(metricTip)}"` : ''} style="font-weight:600;font-size:12px;box-shadow:inset 3px 0 0 ${stripClr};border-right:1px solid var(--border-light);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-left:10px;padding-right:4px">
              ${escHtml(name)}</td>
            <td style="text-align:center;font-size:11px;font-weight:700;color:var(--text-muted);border-right:1px solid var(--border-light)">${goalVal != null ? '≥&nbsp;'+goalVal : '—'}</td>
            <td style="${compact ? 'text-align:center;vertical-align:middle;' : ''}border-right:1px solid var(--border-light);padding:${compact ? '6px 4px' : '5px 8px'}">${ownerCell(meta)}</td>
            <td style="border-right:2px solid var(--border);padding:${compact ? '5px 4px' : '5px 8px'};${compact ? 'text-align:center;' : ''}">${statusCell(name, goalVal)}</td>
            ${weeks.map(w => {
              const cell  = getCell(name, w.iso);
              const isCur = w.iso === currentISO;
              if (!cell) return `<td class="${isCur ? 'sc-cell-current' : ''}" style="text-align:right;color:var(--text-muted);font-size:11px;padding:6px 4px">—</td>`;
              const actual  = cell.actual_value;
              const target  = cell.target_value ?? goalVal;
              const below   = isBelowGoal(actual, target) || (actual === 0 && actual != null);
              const display = actual != null ? Number(actual).toLocaleString() : '—';
              const cls     = [isCur ? 'sc-cell-current' : '', below ? 'sc-cell-below' : ''].filter(Boolean).join(' ');
              const valClr  = below ? '' : (actual === 0 ? 'color:var(--text-muted);' : (isCur ? 'color:var(--blue);' : 'color:var(--green);'));
              const clickAttr = isCur ? `onclick="scorecardEditCell('${cell.id}','${name.replace(/'/g,"\\'")}',${actual ?? 0})"` : '';
              const autoTag = cell.source === 'auto' ? '<span title="Auto-computed from live data" style="font-size:7px;color:var(--blue);margin-left:1px;vertical-align:super;opacity:0.7">A</span>' : '';
              return `<td class="${cls}" style="text-align:right;${valClr}padding:6px 4px;${(isCur||below) ? 'cursor:pointer;' : ''}" ${clickAttr}>
                <span class="sc-cell-val">${display}${autoTag}</span>
              </td>`;
            }).join('')}
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;

  container.innerHTML = tableHtml;
}

async function renderScorecardPage() {
  const bodyEl = document.getElementById('scorecard-metrics-body');
  if (bodyEl) {
    bodyEl.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">Loading metrics…</div>`;
    // Remove previous footer (sibling after body)
    const oldFooter = bodyEl.nextElementSibling;
    if (oldFooter && !oldFooter.id) oldFooter.remove();
  }
  const stripEl = document.getElementById('scorecard-rocks-strip');
  if (stripEl) stripEl.innerHTML = `<div style="padding:10px 0;color:var(--text-muted);font-size:12px">Loading rocks…</div>`;

  try {
    // ── Trailing 13-week window ───────────────────────────────────────────
    const currentMon = scorecardMondayOf(new Date());
    const startMon   = new Date(currentMon.getTime() - 12 * 7 * 86400000);
    const startISO   = scorecardWeekISO(startMon);
    const currentISO = scorecardWeekISO(currentMon);

    const raw = await sbQuery('agency_scorecard_metrics', {
      select:         'id,metric_name,owner_id,target_value,actual_value,week_of,status,notes,source',
      'week_of.gte':  startISO,
      order:          'metric_name.asc,week_of.asc',
      limit:          500
    }, true);
    MC.scorecardRows = Array.isArray(raw) ? raw : [];

    // Build 13 week cols oldest→newest (current = rightmost)
    const weeks = [];
    for (let i = 12; i >= 0; i--) {
      const mon = new Date(currentMon.getTime() - i * 7 * 86400000);
      weeks.push({ iso: scorecardWeekISO(mon), label: scorecardWeekLabelShort(mon) });
    }

    const metricNames = _canonicalMetricSort([...new Set(MC.scorecardRows.map(r => r.metric_name))]);
    const body = document.getElementById('scorecard-metrics-body');
    if (!body) return;

    if (metricNames.length === 0) {
      body.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">No metrics recorded yet.</div>`;
      renderScorecardRocksStrip(); return;
    }

    // Update header week label + below-goal badge
    const hdrEl   = document.getElementById('scorecard-week-label');
    if (hdrEl) hdrEl.textContent = `W/e ${scorecardWeekLabel(currentMon)}`;
    const isBelowGoal = (actual, target) => actual != null && target != null && Number(actual) < Number(target);
    const curWeekRows = MC.scorecardRows.filter(r => r.week_of === currentISO);
    const belowNow    = curWeekRows.filter(r => {
      const meta = MC.scorecardRows.slice().sort((a,b)=>b.week_of.localeCompare(a.week_of)).find(m => m.metric_name === r.metric_name) || r;
      return isBelowGoal(r.actual_value, r.target_value ?? meta.target_value) || r.actual_value === 0;
    }).length;
    const countEl = document.getElementById('scorecard-below-goal-count');
    if (countEl) {
      countEl.textContent = belowNow > 0 ? `${belowNow} below goal` : (curWeekRows.length > 0 ? 'All on track' : '');
      countEl.style.color = belowNow > 0 ? 'var(--red)' : 'var(--green)';
    }

    // Render shared table builder — compact=true: avatar-only owner, no status col, no scroll
    _buildScorecardTable(MC.scorecardRows, weeks, 'scorecard-metrics-body', true);

    // Insert footer AFTER the scrollable body so it stays pinned at the bottom
    body.insertAdjacentHTML('afterend', `
      <div style="padding:6px 14px;font-size:11px;color:var(--text-muted);border-top:1px solid var(--border-light);display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="flex:1;min-width:0">Current week <strong style="color:var(--blue)">highlighted</strong>. Click to edit.</span>
        <span style="display:inline-flex;gap:10px;align-items:center;flex-shrink:0">
          <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:7px;height:7px;border-radius:50%;background:var(--green);display:inline-block"></span>On Track</span>
          <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:7px;height:7px;border-radius:50%;background:var(--red);display:inline-block"></span>Off Track</span>
        </span>
      </div>`);

    renderScorecardRocksStrip();

  } catch (err) {
    console.warn('[Scorecard] render error:', err);
    const bodyFallback = document.getElementById('scorecard-metrics-body');
    if (bodyFallback) bodyFallback.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">Scorecard data unavailable.<br><button onclick="renderScorecardPage()" class="btn-header" style="margin-top:10px">Retry</button></div>`;
  }
}

async function scorecardEditCell(rowId, metricName, currentVal) {
  const input = prompt(`Update actual for "${metricName}" (current: ${currentVal ?? 0}):`, currentVal ?? 0);
  if (input === null) return;
  const newVal = parseFloat(input);
  if (isNaN(newVal)) return alert('Please enter a valid number.');
  try {
    // Determine status automatically vs target
    const row = MC.scorecardRows.find(r => r.id === rowId);
    const target = row ? row.target_value : null;
    let newStatus = 'on_track';
    if (target != null) {
      const pct = target > 0 ? newVal / target : 1;
      if (pct < 0.7)       newStatus = 'below_goal';
      else if (pct < 0.95) newStatus = 'at_risk';
    }
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/agency_scorecard_metrics?id=eq.${rowId}`, {
      method: 'PATCH',
      headers: { 'apikey': SUPABASE_SVC, 'Authorization': 'Bearer ' + SUPABASE_SVC, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ actual_value: newVal, status: newStatus, source: 'manual' })
    });
    if (!resp.ok) throw new Error(await resp.text());
    await renderScorecardPage();
    if (document.getElementById('page-scorecard').classList.contains('active')) renderScorecardFullPage();
  } catch (e) {
    console.error('[Scorecard] update failed', e);
    showToast('Failed to update metric');
  }
}

// ── Create Issue from a below-goal scorecard cell ─────────────────────────
async function createIssueFromMetric(metricName, actual, target, weekISO) {
  const weekFmt = (() => { try { return new Date(weekISO+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); } catch { return weekISO; } })();
  const confirmed = confirm(
    `Create an Issue for "${metricName}"?\n\n` +
    `Week:   ${weekFmt}\n` +
    `Actual: ${actual ?? '—'}  |  Goal: ≥ ${target ?? '—'}\n\n` +
    `This will add a new Issue to the Issues table and open the Issues page.`
  );
  if (!confirmed) return;

  // Find the metric owner — canonical map (case-insensitive) takes precedence over DB
  const canonicalOwner = _metricOwner(metricName);
  const metaRow = (MC.scorecardRows || []).slice()
    .sort((a, b) => b.week_of.localeCompare(a.week_of))
    .find(r => r.metric_name === metricName);
  const ownerId = canonicalOwner || metaRow?.owner_id || null;
  const ownerAgent = ownerId ? agentInfo(ownerId) : null;

  const issueTitle       = `${metricName} missed goal — ${weekFmt}`;
  const issueDescription = `Scorecard alert: "${metricName}" recorded ${actual ?? 'no value'} against a goal of ≥ ${target ?? 'unknown'} for the week of ${weekFmt}.\n\nOwner: ${ownerAgent ? ownerAgent.name : (ownerId || 'unassigned')}. Identify root cause and define corrective action.`;

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/issues`, {
      method:  'POST',
      headers: {
        'apikey':        SUPABASE_SVC,
        'Authorization': 'Bearer ' + SUPABASE_SVC,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation'
      },
      body: JSON.stringify({
        title:       issueTitle,
        description: issueDescription,
        status:      'open',
        priority:    'high',
        source:      'scorecard',
        assigned_to: ownerId,
        created_at:  new Date().toISOString()
      })
    });
    if (!resp.ok) throw new Error(await resp.text());
    const created = await resp.json();
    const issueId = Array.isArray(created) ? created[0]?.id : created?.id;
    console.info('[Scorecard] Issue created:', issueId);
    navigateTo('issues');
  } catch (e) {
    console.error('[Scorecard] createIssue failed', e);
    showToast('Failed to create Issue');
  }
}

function renderScorecardRocksStrip() {
  const strip = document.getElementById('scorecard-rocks-strip');
  if (!strip) return;
  // Show current quarter rocks
  const now = new Date();
  const currentQ = now >= new Date('2026-04-01') ? 2 : 1;
  const qRocks = MC.allRocks.filter(r => r.quarter === currentQ);
  const rocks = qRocks.length > 0 ? qRocks : MC.allRocks.slice(0, 7);

  if (rocks.length === 0) {
    strip.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:4px 0">No Rocks yet. <button onclick="navigateTo('projects')" style="color:var(--blue);background:none;border:none;cursor:pointer;font-family:inherit;font-weight:600">Go to Rocks →</button></div>`;
    return;
  }

  const qMeta = Q_META[currentQ] || {};
  strip.innerHTML = `
    <div style="margin-bottom:8px">
      <span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em">${qMeta.emoji||'<i class="ph-thin ph-mountains"></i>'} ${qMeta.label||'Current Quarter'} · ${qMeta.period||''}</span>
    </div>
    ${rocks.map(r => {
      const rockNum  = MC.allRocks.indexOf(r) + 1;
      const accent   = MC.rockAccent[rockNum] || 'var(--primary)';
      const pct      = Math.min(100, Math.max(0, r.progress || 0));
      const stKey    = r.status || 'on_track';
      const stLabel  = { on_track:'On Track', at_risk:'At Risk', off_track:'Off Track', complete:'Complete' }[stKey] || stKey;
      const stIcons  = { on_track:'\u2713', at_risk:'\u26A0', off_track:'\u2716', complete:'\u2605' };
      const stIcon   = stIcons[stKey] || '';
      const agent    = agentInfo(r.owner_id);
      const shortTitle   = (r.title||'').replace(/^Rock \d+: /,'').slice(0,60);
      const cir = 2 * Math.PI * 10;
      const dOff = cir - (cir * pct / 100);
      return `<div style="padding:10px 12px;background:var(--surface-2);border:1px solid var(--border-light);border-radius:var(--radius-xs);cursor:pointer;margin-bottom:6px;transition:box-shadow 0.2s,transform 0.15s,border-color 0.2s;position:relative;overflow:hidden" onclick="navigateToRock('${r.id}')"
                   onmouseenter="this.style.boxShadow='var(--shadow-sm)';this.style.transform='translateY(-1px)'" onmouseleave="this.style.boxShadow='none';this.style.transform='none'">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="position:relative;width:26px;height:26px;flex-shrink:0">
            <svg style="position:absolute;inset:0;transform:rotate(-90deg)" viewBox="0 0 26 26">
              <circle cx="13" cy="13" r="10" fill="none" stroke="var(--border)" stroke-width="2"/>
              <circle cx="13" cy="13" r="10" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-dasharray="${cir}" stroke-dashoffset="${dOff}" style="transition:stroke-dashoffset 0.5s"/>
            </svg>
            <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:${accent}">R${rockNum}</span>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:11.5px;font-weight:600;color:var(--text-primary);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(shortTitle)}</div>
          </div>
          ${agent
            ? `<span data-agent-id="${agent.id}" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--surface);border:1.5px solid var(--border-light);cursor:pointer;position:relative">
                ${agent.avatar
                  ? `<img src="${agent.avatar}?v=${AVATAR_BUST}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;pointer-events:none;position:absolute;inset:0" onerror="_avErr(this)"><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:10px">${agent.emoji}</span>`
                  : `<span style="font-size:10px;pointer-events:none">${agent.emoji}</span>`}
              </span>`
            : ''}
          <span class="rock-card-status-badge rock-status-${stKey}" style="font-size:9px;flex-shrink:0">${stIcon ? `<span style="font-size:8px">${stIcon}</span> ` : ''}${stLabel}</span>
        </div>
      </div>`;
    }).join('')}`;
}

// =============================================
// SCORECARD FULL PAGE
// =============================================

// Quarter date ranges for filtering
// Q ranges: lastWeek = last Monday of the quarter (13-week anchor)
const SC_Q_RANGES = {
  '1': { lastWeek: '2026-03-30', label: 'Q1 · 13 weeks ending Mar 2026' },
  '2': { lastWeek: '2026-06-29', label: 'Q2 · 13 weeks ending Jun 2026' },
};
let _scFullQ = 'current'; // 'current' | '1' | '2'

function setRocksQ(btn, q) {
  MC.rocksFilter = q;
  document.querySelectorAll('.rocks-q-tab').forEach(b => {
    const active = b === btn;
    b.style.background = active ? 'var(--surface)' : 'none';
    b.style.color      = active ? 'var(--text-primary)' : 'var(--text-secondary)';
    b.style.boxShadow  = active ? 'var(--shadow-xs)' : 'none';
    b.classList.toggle('active', active);
  });
  renderProjectsPage();
}

function setScorecardQ(btn, q) {
  _scFullQ = q;
  document.querySelectorAll('.sc-q-tab').forEach(b => {
    const active = b === btn;
    b.style.background    = active ? 'var(--surface)' : 'none';
    b.style.color         = active ? 'var(--text-primary)' : 'var(--text-secondary)';
    b.style.boxShadow     = active ? 'var(--shadow-xs)' : 'none';
  });
  renderScorecardFullPage();
}

async function renderScorecardFullPage() {
  const body = document.getElementById('sc-full-table-body');
  if (!body) return;
  body.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px"><span class="spinner-sm"></span></div>`;

  try {
    const now        = new Date();
    const currentMon = scorecardMondayOf(now);
    const currentISO = scorecardWeekISO(currentMon);

    // ── Always 13 weeks — anchor week depends on tab ─────────────────────
    let anchorMon, rangeLabel;
    if (_scFullQ === 'current') {
      anchorMon  = currentMon;
      rangeLabel = 'Trailing 13 weeks';
    } else {
      const qr   = SC_Q_RANGES[_scFullQ];
      anchorMon  = scorecardMondayOf(new Date(qr.lastWeek + 'T12:00:00'));
      rangeLabel = qr.label;
    }
    // Build 13-week skeleton oldest→newest
    const weeks = [];
    for (let i = 12; i >= 0; i--) {
      const mon = new Date(anchorMon.getTime() - i * 7 * 86400000);
      weeks.push({ iso: scorecardWeekISO(mon), label: scorecardWeekLabelShort(mon) });
    }
    const fetchStart = weeks[0].iso;
    const fetchEnd   = weeks[12].iso;

    const params = {
      select: 'id,metric_name,owner_id,target_value,actual_value,week_of,status,notes',
      order:  'metric_name.asc,week_of.asc',
      limit:  1000
    };
    params['week_of.gte'] = fetchStart;
    params['week_of.lte'] = fetchEnd;

    const raw     = await sbQuery('agency_scorecard_metrics', params, true);
    const allRows = Array.isArray(raw) ? raw : [];

    // Update header labels
    const rangeEl  = document.getElementById('sc-full-range-label');
    const statusEl = document.getElementById('sc-full-status-label');
    if (rangeEl) rangeEl.textContent = rangeLabel;

    if (!weeks.length) {
      body.innerHTML = `<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">No scorecard data for this period.</div>`;
      if (statusEl) statusEl.innerHTML = '';
      return;
    }

    // Overall status badge
    const isBelowGoal = (actual, target) => actual != null && target != null && Number(actual) < Number(target);
    const curRows  = allRows.filter(r => r.week_of === currentISO);
    const belowNow = curRows.filter(r => {
      const meta = allRows.slice().sort((a,b)=>b.week_of.localeCompare(a.week_of)).find(m=>m.metric_name===r.metric_name)||r;
      return isBelowGoal(r.actual_value, r.target_value ?? meta.target_value) || r.actual_value === 0;
    }).length;
    if (statusEl) {
      if (curRows.length === 0) {
        statusEl.innerHTML = '';
      } else if (belowNow === 0) {
        statusEl.innerHTML = `<span style="font-size:11px;font-weight:700;color:var(--green)">All on track</span>`;
      } else {
        statusEl.innerHTML = `<span style="font-size:11px;font-weight:700;padding:1px 8px;border-radius:99px;background:var(--red-bg);color:var(--red)">${belowNow} below goal</span>`;
      }
    }

    // Use shared builder — compact mode on mobile (≤768px) to reduce sticky col width
    const scCompact = window.innerWidth <= 768;
    _buildScorecardTable(allRows, weeks, 'sc-full-table-body', scCompact);

  } catch (err) {
    console.warn('[Scorecard Full] render error:', err);
    const b = document.getElementById('sc-full-table-body');
    if (b) b.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Failed to load scorecard data.<br><button onclick="renderScorecardFullPage()" class="btn-header" style="margin-top:10px">Retry</button></div>`;
  }
}

function openAddMetricModal() {
  alert('Add Metric modal coming soon!\n\nFor now, add rows directly to the agency_scorecard_metrics table in Supabase.\n\nColumns: metric_name, owner_id (agent name), target_value, actual_value, week_of (YYYY-MM-DD Monday), status (on_track/at_risk/below_goal), source (manual/auto)');
}

