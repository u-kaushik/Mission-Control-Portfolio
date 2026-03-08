// Mission Control — Email Campaigns (Instantly-style)
// ══════════════════════════════════════════════════════════════════════════
//  CAMPAIGNS — Track pipeline: sent → opens → replies → meetings → shows → closes
//  Click a campaign row to see email sequence detail with merge tags & per-step stats
// ══════════════════════════════════════════════════════════════════════════

let _adCampaignsData = [];
let _adCampFilter = 'all';
let _adCampSort = { col: 'created_at', dir: 'desc' };
let _adCampSearch = '';

// ══════════════════════════════════════════════════════════════════
//  VALIDATION GATES — Gamified cold outreach progression
// ══════════════════════════════════════════════════════════════════
const VALIDATION_GATES = [
  { key: 'volume',   label: 'Volume',   target: 750, unit: 'sends',  threshold: '250 per niche \u00D7 3',  desc: '250 sends per niche across 3 niches = 750 clean contacts' },
  { key: 'opens',    label: 'Opens',    target: 50,  unit: '%',      threshold: '\u2265 50% open rate', desc: 'At least 50% of recipients open your email' },
  { key: 'replies',  label: 'Replies',  target: 3,   unit: '%',      threshold: '\u2265 3% reply rate', desc: 'At least 3% of sends get a reply' },
  { key: 'positive', label: 'Positive', target: 1,   unit: '%',      threshold: '\u2265 1% positive',   desc: 'At least 1% of sends are positive replies' },
  { key: 'shows',    label: 'Shows',    target: 3,   unit: 'booked', threshold: '\u2265 3 shows',       desc: 'At least 3 meetings that actually show up' },
  { key: 'close',    label: 'Close',    target: 1,   unit: 'closed', threshold: '\u2265 1 close',       desc: 'At least 1 paying customer signed' },
];

function _computeValidationGates(data) {
  const totalSent     = data.reduce((s, c) => s + (Number(c.outreach_sent) || 0), 0);
  const totalOpens    = data.reduce((s, c) => s + (Number(c.opens) || 0), 0);
  const totalReplies  = data.reduce((s, c) => s + (Number(c.positive_replies) || 0), 0);
  const totalMeetings = data.reduce((s, c) => s + (Number(c.meetings_booked) || 0), 0);
  const totalShows    = data.reduce((s, c) => s + (Number(c.shows) || 0), 0);
  const totalCloses   = data.reduce((s, c) => s + (Number(c.closes) || 0), 0);

  const openPct    = totalSent ? (totalOpens / totalSent * 100) : 0;
  const replyPct   = totalSent ? (totalReplies / totalSent * 100) : 0;
  const posPct     = totalSent ? (totalReplies / totalSent * 100) : 0; // positive replies as % of sends

  return VALIDATION_GATES.map((g, i) => {
    let current, pct, pass;
    switch (i) {
      case 0: current = totalSent;               pct = Math.min(100, totalSent / g.target * 100);     pass = totalSent >= g.target; break;
      case 1: current = +openPct.toFixed(1);      pct = Math.min(100, openPct / g.target * 100);       pass = openPct >= g.target; break;
      case 2: current = +replyPct.toFixed(1);     pct = Math.min(100, replyPct / g.target * 100);      pass = replyPct >= g.target; break;
      case 3: current = +posPct.toFixed(1);       pct = Math.min(100, posPct / g.target * 100);        pass = posPct >= g.target; break;
      case 4: current = totalShows;               pct = Math.min(100, totalShows / g.target * 100);    pass = totalShows >= g.target; break;
      case 5: current = totalCloses;              pct = Math.min(100, totalCloses / g.target * 100);   pass = totalCloses >= g.target; break;
    }
    return { ...g, current, pct, pass };
  });
}

function _renderValidationGates() {
  const el = document.getElementById('validation-gates-banner');
  if (!el) return;

  const gates = _computeValidationGates(_adCampaignsData);
  const passed = gates.filter(g => g.pass).length;
  const validated = passed === gates.length;

  const _gateVal = (g) => g.unit === '%' ? g.current + '%' : g.current;

  const gatePills = gates.map(g => {
    if (g.pass) {
      return '<div style="flex:1;min-width:110px" title="' + escHtml(g.desc) + '">' +
        '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--green-bg,rgba(34,197,94,0.08));border:1px solid rgba(34,197,94,0.16);border-radius:var(--radius-xs,6px)">' +
          '<span style="width:20px;height:20px;border-radius:50%;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">\u2713</span>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--green)">' + g.label + '</div>' +
            '<div style="font-size:9px;color:var(--text-muted);margin-top:2px">' + escHtml(g.threshold) + '</div>' +
            '<div style="font-size:11px;font-weight:600;color:var(--green);margin-top:2px">' + _gateVal(g) + ' \u2714</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }
    const clr = g.pct > 0 ? 'var(--amber)' : 'var(--text-muted)';
    const barW = Math.max(2, g.pct);
    return '<div style="flex:1;min-width:110px" title="' + escHtml(g.desc) + '">' +
      '<div style="margin-bottom:5px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between">' +
          '<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:' + clr + '">' + g.label + '</span>' +
          '<span style="font-size:11px;font-weight:700;color:' + clr + '">' + _gateVal(g) + '</span>' +
        '</div>' +
        '<div style="font-size:9px;color:var(--text-muted);margin-top:2px">Need ' + escHtml(g.threshold) + '</div>' +
      '</div>' +
      '<div style="height:5px;background:var(--border);border-radius:99px;overflow:hidden">' +
        '<div style="height:100%;width:' + barW + '%;background:' + clr + ';border-radius:99px;transition:width 0.6s cubic-bezier(0.4,0,0.2,1)"></div>' +
      '</div>' +
    '</div>';
  }).join('');

  const statusClr = validated ? 'var(--green)' : 'var(--primary)';
  const statusLabel = validated ? 'VALIDATED' : 'TESTING';
  const statusIcon = validated ? '\u2713 ' : '';

  el.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px 22px;margin-bottom:20px;box-shadow:var(--shadow-xs);position:relative;overflow:hidden">' +
      '<div style="position:absolute;top:0;left:0;bottom:0;width:4px;background:' + statusClr + ';border-radius:4px 0 0 4px"></div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-left:8px;flex-wrap:wrap">' +
        '<span style="font-size:10px;font-weight:800;padding:3px 10px;border-radius:99px;background:' + statusClr + '14;color:' + statusClr + ';text-transform:uppercase;letter-spacing:0.06em">' + statusIcon + statusLabel + '</span>' +
        '<span style="font-size:12px;font-weight:600;color:var(--text-primary)">Cold Outreach Validation</span>' +
        '<span style="margin-left:auto;font-size:11px;font-weight:600;color:var(--text-muted)">' + passed + '/' + gates.length + ' gates passed</span>' +
      '</div>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap;padding-left:8px">' + gatePills + '</div>' +
    '</div>';
}

const ADCAMP_STATUS_COLORS = {
  Draft: 'var(--purple, #8b5cf6)',
  Active: 'var(--green, #22c55e)',
  Paused: 'var(--amber, #f59e0b)',
  Completed: 'var(--blue, #3b82f6)'
};

// ══════════════════════════════════════════════════════════════════
//  RENDER PAGE
// ══════════════════════════════════════════════════════════════════
async function renderCampaignsPage() {
  const statsEl = document.getElementById('adcamp-stats');
  const filtersEl = document.getElementById('adcamp-filters');
  const tableWrap = document.getElementById('adcamp-table-wrap');
  if (!tableWrap) return;
  tableWrap.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-muted)">Loading\u2026</div>';

  try {
    const rows = await sbQuery('outreach_campaigns', { select: '*', order: 'created_at.desc', limit: 200, 'deleted_at': 'is.null' }, true);
    _adCampaignsData = Array.isArray(rows) ? rows : [];
  } catch (e) {
    _adCampaignsData = [];
    console.warn('[campaigns] load error:', e);
  }

  _renderValidationGates();
  _renderAdCampStats(statsEl);
  _renderAdCampFilters(filtersEl);
  _renderAdCampTable(tableWrap);
}

// ── Pipeline stat cards ──
function _renderAdCampStats(el) {
  if (!el) return;
  const data = _adCampFilteredData();
  const sum = (field) => data.reduce((s, c) => s + (Number(c[field]) || 0), 0);

  const outreach = sum('outreach_sent');
  const opens    = sum('opens');
  const replies  = sum('positive_replies');
  const meetings = sum('meetings_booked');
  const shows    = sum('shows');
  const closes   = sum('closes');

  el.innerHTML = [
    _statCard('Sent',       outreach.toLocaleString(),  'var(--text-primary)',  'ph-paper-plane-tilt'),
    _statCard('Opens',      opens.toLocaleString(),     'var(--blue)',          'ph-envelope-open'),
    _statCard('Replies',    replies.toLocaleString(),   'var(--amber)',         'ph-chat-circle-text'),
    _statCard('Meetings',   meetings.toLocaleString(),  'var(--purple)',        'ph-calendar-check'),
    _statCard('Shows',      shows.toLocaleString(),     'var(--green)',         'ph-video-camera'),
    _statCard('Closes',     closes.toLocaleString(),    'var(--green)',         'ph-handshake'),
  ].join('');
}

function _statCard(label, value, color, icon) {
  return '<div class="rocks-stat-card">' +
    '<div class="rocks-stat-label"><i class="ph-thin ' + icon + '"></i> ' + label + '</div>' +
    '<div class="rocks-stat-value" style="color:' + (color || 'var(--text-primary)') + '">' + value + '</div></div>';
}

// ── Filter pills ──
function _renderAdCampFilters(el) {
  if (!el) return;
  const filters = ['all', 'Draft', 'Active', 'Paused', 'Completed'];
  const counts = { all: _adCampaignsData.length };
  _adCampaignsData.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
  el.innerHTML = _renderFilterPills(filters, counts, _adCampFilter,
    ADCAMP_STATUS_COLORS, f => "setAdCampFilter('" + f + "')", { all: 'All' });
}

function setAdCampFilter(f) {
  _adCampFilter = f;
  _renderAdCampFilters(document.getElementById('adcamp-filters'));
  _renderAdCampStats(document.getElementById('adcamp-stats'));
  _renderAdCampTable(document.getElementById('adcamp-table-wrap'));
}

function _adCampFilteredData() {
  let data = _adCampaignsData;
  if (_adCampFilter !== 'all') {
    data = data.filter(c => c.status === _adCampFilter);
  }
  if (_adCampSearch) {
    const q = _adCampSearch.toLowerCase();
    data = data.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.list_name || '').toLowerCase().includes(q) ||
      (c.target_segment || '').toLowerCase().includes(q) ||
      (c.notes || '').toLowerCase().includes(q)
    );
  }
  return data;
}

// ── Sortable table ──
function _renderAdCampTable(wrap) {
  if (!wrap) return;
  const data = _adCampFilteredData();
  const sorted = [...data].sort((a, b) => {
    let va = a[_adCampSort.col], vb = b[_adCampSort.col];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va == null) return 1; if (vb == null) return -1;
    if (va < vb) return _adCampSort.dir === 'asc' ? -1 : 1;
    if (va > vb) return _adCampSort.dir === 'asc' ? 1 : -1;
    return 0;
  });

  const cols = [
    { key: 'name', label: 'Campaign', align: 'left' },
    { key: 'list_name', label: 'List', align: 'left' },
    { key: 'status', label: 'Status', align: 'left' },
    { key: 'outreach_sent', label: 'Sent', align: 'right' },
    { key: 'opens', label: 'Opens', align: 'right' },
    { key: 'positive_replies', label: 'Replies', align: 'right' },
    { key: 'meetings_booked', label: 'Meetings', align: 'right' },
    { key: 'shows', label: 'Shows', align: 'right' },
    { key: 'closes', label: 'Closes', align: 'right' },
    { key: 'pipeline_value', label: 'Pipeline (\u00A3)', align: 'right' },
  ];

  const sortIcon = (key) => {
    if (_adCampSort.col !== key) return '';
    return _adCampSort.dir === 'asc' ? ' \u2191' : ' \u2193';
  };

  const thead = cols.map(c =>
    `<th onclick="sortAdCampTable('${c.key}')" style="padding:10px 14px;text-align:${c.align};font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);cursor:pointer;white-space:nowrap;user-select:none">${c.label}${sortIcon(c.key)}</th>`
  ).join('');

  if (sorted.length === 0) {
    wrap.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:900px">
        <thead><tr style="border-bottom:1px solid var(--border);background:var(--surface-2)">${thead}</tr></thead>
        <tbody><tr><td colspan="${cols.length}" style="padding:40px;text-align:center;color:var(--text-muted)">
          <div style="font-size:28px;margin-bottom:8px;opacity:0.4"><i class="ph-thin ph-paper-plane-tilt"></i></div>
          ${_adCampaignsData.length ? 'No campaigns match this filter.' : 'No campaigns yet. Click "+ New Campaign" to start.'}
        </td></tr></tbody>
      </table></div>`;
    return;
  }

  const numCell = (v) => (Number(v) || 0).toLocaleString();

  const tbody = sorted.map(c => {
    const statusColor = ADCAMP_STATUS_COLORS[c.status] || 'var(--text-muted)';
    return `<tr onclick="openCampaignDetail('${c.id}')" style="cursor:pointer;border-bottom:1px solid var(--border-light);transition:background 0.1s" onmouseenter="this.style.background='var(--surface-2)'" onmouseleave="this.style.background='var(--surface)'">
      <td style="padding:10px 14px;font-weight:600;font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(c.name)}</td>
      <td style="padding:10px 14px;font-size:12px;color:var(--text-secondary);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(c.list_name || c.target_segment || '\u2014')}</td>
      <td style="padding:10px 14px"><span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:${statusColor}15;color:${statusColor}">${escHtml(c.status)}</span></td>
      <td style="padding:10px 14px;text-align:right;font-size:12px;font-variant-numeric:tabular-nums">${numCell(c.outreach_sent)}</td>
      <td style="padding:10px 14px;text-align:right;font-size:12px;font-variant-numeric:tabular-nums">${numCell(c.opens)}</td>
      <td style="padding:10px 14px;text-align:right;font-size:12px;font-variant-numeric:tabular-nums">${numCell(c.positive_replies)}</td>
      <td style="padding:10px 14px;text-align:right;font-size:12px;font-variant-numeric:tabular-nums">${numCell(c.meetings_booked)}</td>
      <td style="padding:10px 14px;text-align:right;font-size:12px;font-variant-numeric:tabular-nums">${numCell(c.shows)}</td>
      <td style="padding:10px 14px;text-align:right;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--green)">${numCell(c.closes)}</td>
      <td style="padding:10px 14px;text-align:right;font-size:12px;font-variant-numeric:tabular-nums">\u00A3${(Number(c.pipeline_value) || 0).toLocaleString('en-GB', { minimumFractionDigits: 0 })}</td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:900px">
      <thead><tr style="border-bottom:1px solid var(--border);background:var(--surface-2)">${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  </div>`;
}

function sortAdCampTable(col) {
  if (_adCampSort.col === col) {
    _adCampSort.dir = _adCampSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    _adCampSort = { col, dir: col === 'name' || col === 'list_name' ? 'asc' : 'desc' };
  }
  _renderAdCampTable(document.getElementById('adcamp-table-wrap'));
}

// ══════════════════════════════════════════════════════════════════
//  CAMPAIGN DETAIL MODAL (Instantly-style)
// ══════════════════════════════════════════════════════════════════
async function openCampaignDetail(id) {
  const overlay = document.getElementById('campaign-detail-overlay');
  const body = document.getElementById('campaign-detail-body');
  const titleEl = document.getElementById('campaign-detail-title');
  const editBtn = document.getElementById('campaign-detail-edit-btn');
  if (!overlay || !body) return;

  const c = _adCampaignsData.find(x => x.id === id);
  if (!c) return;

  titleEl.innerHTML = `<i class="ph-thin ph-paper-plane-tilt"></i> ${escHtml(c.name)}`;
  editBtn.setAttribute('onclick', `closeCampaignDetail();openAdCampModal('${id}')`);
  body.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-muted)">Loading sequence\u2026</div>';
  overlay.style.display = 'flex';

  // Load email steps
  let steps = [];
  try {
    steps = await sbQuery('agency_campaign_steps', {
      select: '*',
      'campaign_id': `eq.${id}`,
      order: 'step_number.asc'
    }, true);
    if (!Array.isArray(steps)) steps = [];
  } catch (e) {
    console.warn('[campaigns] steps load error:', e);
  }

  // ── Header section ──
  const statusColor = ADCAMP_STATUS_COLORS[c.status] || 'var(--text-muted)';
  const dateRange = [c.start_date, c.end_date].filter(Boolean).join(' \u2192 ') || 'No dates set';

  let html = `
    <div style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap">
        <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;background:${statusColor}15;color:${statusColor};text-transform:uppercase;letter-spacing:0.05em">${escHtml(c.status)}</span>
        <span style="font-size:12px;color:var(--text-muted)"><i class="ph-thin ph-calendar-blank"></i> ${escHtml(dateRange)}</span>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--text-secondary)">
        ${c.list_name ? `<span><i class="ph-thin ph-list-bullets"></i> <strong>List:</strong> ${c.list_id ? `<a href="#" onclick="event.preventDefault();closeCampaignDetail();navigateTo('pipeline');setTimeout(function(){openListProspects('${c.list_id}')},300)" style="color:var(--primary);text-decoration:underline;cursor:pointer">${escHtml(c.list_name)}</a>` : escHtml(c.list_name)}</span>` : ''}
        ${c.target_segment ? `<span><i class="ph-thin ph-target"></i> <strong>Segment:</strong> ${escHtml(c.target_segment)}</span>` : ''}
      </div>
    </div>`;

  // ── Pipeline funnel ──
  const outreach = Number(c.outreach_sent) || 0;
  const opens = Number(c.opens) || 0;
  const replies = Number(c.positive_replies) || 0;
  const meetings = Number(c.meetings_booked) || 0;
  const shows = Number(c.shows) || 0;
  const closes = Number(c.closes) || 0;
  const pct = (n, d) => d > 0 ? ((n / d) * 100).toFixed(1) + '%' : '\u2014';

  html += `
    <div style="margin-bottom:24px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:10px"><i class="ph-thin ph-funnel"></i> Pipeline</div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px">
        ${_funnelCell('Sent', outreach, '', 'var(--text-primary)')}
        ${_funnelCell('Opens', opens, pct(opens, outreach), 'var(--blue)')}
        ${_funnelCell('Replies', replies, pct(replies, outreach), 'var(--amber)')}
        ${_funnelCell('Meetings', meetings, pct(meetings, outreach), 'var(--purple)')}
        ${_funnelCell('Shows', shows, pct(shows, meetings), 'var(--green)')}
        ${_funnelCell('Closes', closes, pct(closes, shows), 'var(--green)')}
      </div>
      ${Number(c.pipeline_value) ? `<div style="margin-top:8px;font-size:12px;color:var(--text-secondary)"><strong>Pipeline value:</strong> \u00A3${Number(c.pipeline_value).toLocaleString('en-GB')}</div>` : ''}
    </div>`;

  // ── Email sequence ──
  html += `
    <div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:12px"><i class="ph-thin ph-envelope"></i> Email Sequence ${steps.length ? `(${steps.length} steps)` : ''}</div>`;

  if (steps.length === 0) {
    html += `<div style="padding:24px;text-align:center;color:var(--text-muted);border:1px dashed var(--border);border-radius:var(--radius)">
      <i class="ph-thin ph-envelope" style="font-size:24px;opacity:0.4"></i>
      <div style="margin-top:6px;font-size:12px">No email steps configured yet</div>
    </div>`;
  } else {
    steps.forEach((step, i) => {
      const isLast = i === steps.length - 1;
      const delayLabel = step.delay_days === 0 ? 'Day 0' : `+${step.delay_days} day${step.delay_days > 1 ? 's' : ''}`;
      const stepSent = Number(step.sent) || 0;
      const stepOpens = Number(step.opens) || 0;
      const stepReplies = Number(step.replies) || 0;
      const openRate = stepSent > 0 ? ((stepOpens / stepSent) * 100).toFixed(1) : 0;
      const replyRate = stepSent > 0 ? ((stepReplies / stepSent) * 100).toFixed(1) : 0;

      html += `
        <div style="position:relative;padding-left:28px;${!isLast ? 'padding-bottom:20px' : ''}">
          <!-- Timeline line -->
          ${!isLast ? '<div style="position:absolute;left:10px;top:24px;bottom:0;width:2px;background:var(--border)"></div>' : ''}
          <!-- Timeline dot -->
          <div style="position:absolute;left:4px;top:6px;width:14px;height:14px;border-radius:50%;background:var(--blue);border:2px solid var(--surface);display:flex;align-items:center;justify-content:center">
            <span style="font-size:7px;font-weight:800;color:#fff">${step.step_number}</span>
          </div>

          <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
            <!-- Step header -->
            <div style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid var(--border-light)">
              <div style="display:flex;align-items:center;gap:8px;min-width:0">
                <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:var(--blue)15;color:var(--blue);white-space:nowrap">${escHtml(delayLabel)}</span>
                <span style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_highlightMergeTags(escHtml(step.subject))}</span>
              </div>
            </div>

            <!-- Step body preview -->
            ${step.body ? `<div style="padding:10px 14px;font-size:12px;color:var(--text-secondary);line-height:1.5;max-height:80px;overflow:hidden;white-space:pre-wrap">${_highlightMergeTags(escHtml(_truncateBody(step.body)))}</div>` : ''}

            <!-- Step stats bar -->
            <div style="padding:8px 14px;display:flex;gap:16px;font-size:11px;color:var(--text-muted);background:var(--surface);border-top:1px solid var(--border-light)">
              <span><i class="ph-thin ph-paper-plane-tilt"></i> ${stepSent.toLocaleString()} sent</span>
              <span><i class="ph-thin ph-envelope-open"></i> ${stepOpens.toLocaleString()} opens <span style="color:var(--blue);font-weight:600">(${openRate}%)</span></span>
              <span><i class="ph-thin ph-chat-circle-text"></i> ${stepReplies.toLocaleString()} replies <span style="color:var(--amber);font-weight:600">(${replyRate}%)</span></span>
            </div>
          </div>

          ${!isLast && steps[i + 1] ? `<div style="margin-top:8px;margin-left:4px;font-size:10px;color:var(--text-muted)"><i class="ph-thin ph-clock"></i> Wait ${steps[i + 1].delay_days} day${steps[i + 1].delay_days > 1 ? 's' : ''}</div>` : ''}
        </div>`;
    });
  }

  html += '</div>';

  // ── Notes ──
  if (c.notes) {
    html += `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:6px"><i class="ph-thin ph-note"></i> Notes</div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;white-space:pre-wrap">${escHtml(c.notes)}</div>`;
  }

  body.innerHTML = html;
}

function _funnelCell(label, value, rate, color) {
  return `<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;text-align:center">
    <div style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);margin-bottom:2px">${label}</div>
    <div style="font-size:16px;font-weight:700;color:${color}">${value.toLocaleString()}</div>
    ${rate ? `<div style="font-size:10px;color:var(--text-muted);margin-top:1px">${rate}</div>` : ''}
  </div>`;
}

function _highlightMergeTags(text) {
  return text.replace(/(\{\{[^}]+\}\})/g, '<span style="color:var(--blue);font-weight:600;background:var(--blue)08;padding:0 2px;border-radius:3px">$1</span>');
}

function _truncateBody(body) {
  const lines = body.split('\n');
  if (lines.length <= 4) return body;
  return lines.slice(0, 4).join('\n') + '\n\u2026';
}

function closeCampaignDetail() {
  const overlay = document.getElementById('campaign-detail-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ══════════════════════════════════════════════════════════════════
//  ADD / EDIT MODAL (metadata only)
// ══════════════════════════════════════════════════════════════════
function openAdCampModal(id) {
  const overlay = document.getElementById('adcamp-modal-overlay');
  if (!overlay) return;
  const isEdit = !!id;
  const c = isEdit ? _adCampaignsData.find(x => x.id === id) : null;

  document.getElementById('adcamp-edit-id').value = isEdit ? id : '';
  document.getElementById('adcamp-modal-title').innerHTML = `<i class="ph-thin ph-paper-plane-tilt"></i> ${isEdit ? 'Edit' : 'New'} Campaign`;
  document.getElementById('adcamp-save-btn').textContent = isEdit ? 'Save Changes' : 'Add Campaign';
  document.getElementById('adcamp-delete-btn').style.display = isEdit ? '' : 'none';

  document.getElementById('adcamp-name').value = c ? c.name : '';
  // Populate list picker dropdown
  _populateCampaignListPicker(c);
  document.getElementById('adcamp-status').value = c ? c.status : 'Active';
  document.getElementById('adcamp-start').value = c && c.start_date ? c.start_date : '';
  document.getElementById('adcamp-end').value = c && c.end_date ? c.end_date : '';
  document.getElementById('adcamp-budget').value = c ? c.target_segment || '' : '';
  document.getElementById('adcamp-outreach').value = c ? c.outreach_sent || '' : '';
  document.getElementById('adcamp-opens').value = c ? c.opens || '' : '';
  document.getElementById('adcamp-replies').value = c ? c.positive_replies || '' : '';
  document.getElementById('adcamp-meetings').value = c ? c.meetings_booked || '' : '';
  document.getElementById('adcamp-shows').value = c ? c.shows || '' : '';
  document.getElementById('adcamp-closes').value = c ? c.closes || '' : '';
  document.getElementById('adcamp-pipeline').value = c ? c.pipeline_value || '' : '';
  var costEl = document.getElementById('adcamp-cost');
  if (costEl) costEl.value = c ? c.cost || '' : '';
  document.getElementById('adcamp-notes').value = c ? c.notes || '' : '';

  overlay.style.display = 'flex';
}

function closeAdCampModal() {
  const overlay = document.getElementById('adcamp-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ── Search wiring ──
(function() {
  var _t;
  document.addEventListener('DOMContentLoaded', function() {
    var inp = document.getElementById('adcamp-search');
    if (inp) inp.addEventListener('input', function() {
      clearTimeout(_t);
      _t = setTimeout(function() {
        _adCampSearch = inp.value.trim();
        _renderAdCampStats(document.getElementById('adcamp-stats'));
        _renderAdCampTable(document.getElementById('adcamp-table-wrap'));
      }, 200);
    });
  });
})();

// ── Save ──
async function saveAdCampaign() {
  const name = document.getElementById('adcamp-name').value.trim();
  if (!name) { showToast('Campaign name is required'); return; }

  // Resolve list selection
  var listSelect = document.getElementById('adcamp-list-select');
  var listCustom = document.getElementById('adcamp-list-custom');
  var selectedListId = listSelect ? listSelect.value : '';
  var listName = null;
  var listId = null;
  if (selectedListId === '__custom') {
    listName = listCustom ? listCustom.value.trim() || null : null;
  } else if (selectedListId) {
    listId = selectedListId;
    var matchedList = MC.prospectLists.find(function(l) { return l.id === selectedListId; });
    listName = matchedList ? matchedList.name : null;
  }

  const payload = {
    name,
    channel: 'Email',
    list_name: listName,
    list_id: listId,
    target_segment: document.getElementById('adcamp-budget').value.trim() || null,
    status: document.getElementById('adcamp-status').value,
    start_date: document.getElementById('adcamp-start').value || null,
    end_date: document.getElementById('adcamp-end').value || null,
    outreach_sent: Number(document.getElementById('adcamp-outreach').value) || 0,
    opens: Number(document.getElementById('adcamp-opens').value) || 0,
    positive_replies: Number(document.getElementById('adcamp-replies').value) || 0,
    meetings_booked: Number(document.getElementById('adcamp-meetings').value) || 0,
    shows: Number(document.getElementById('adcamp-shows').value) || 0,
    closes: Number(document.getElementById('adcamp-closes').value) || 0,
    pipeline_value: Number(document.getElementById('adcamp-pipeline').value) || 0,
    cost: Number((document.getElementById('adcamp-cost') || {}).value) || 0,
    notes: document.getElementById('adcamp-notes').value.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const editId = document.getElementById('adcamp-edit-id').value;
  try {
    if (editId) {
      await sbUpdate('outreach_campaigns', editId, payload);
      showToast('Campaign updated');
    } else {
      await sbInsert('outreach_campaigns', payload);
      showToast('Campaign created');
    }
    closeAdCampModal();
    renderCampaignsPage();
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

// ── List picker helper ──
async function _populateCampaignListPicker(campaign) {
  // Ensure lists are loaded
  if (!MC.prospectLists.length) {
    try { await loadProspectLists(); } catch(e) {}
  }

  var container = document.getElementById('adcamp-list-picker-wrap');
  if (!container) return;

  var currentListId = campaign ? campaign.list_id : null;
  var currentListName = campaign ? campaign.list_name || '' : '';

  var html = '<select id="adcamp-list-select" onchange="_onListSelectChange()" style="width:100%">';
  html += '<option value="">— No list —</option>';
  MC.prospectLists.forEach(function(list) {
    var sel = currentListId === list.id ? ' selected' : '';
    html += '<option value="' + list.id + '"' + sel + '>' + escHtml(list.name) + '</option>';
  });
  html += '<option value="__custom"' + (!currentListId && currentListName ? ' selected' : '') + '>Custom name\u2026</option>';
  html += '</select>';
  html += '<input type="text" id="adcamp-list-custom" placeholder="Type list name…" value="' + escHtml(!currentListId ? currentListName : '') + '" style="display:' + (!currentListId && currentListName ? 'block' : 'none') + ';margin-top:6px">';

  container.innerHTML = html;
}

function _onListSelectChange() {
  var sel = document.getElementById('adcamp-list-select');
  var custom = document.getElementById('adcamp-list-custom');
  if (!sel || !custom) return;
  custom.style.display = sel.value === '__custom' ? 'block' : 'none';
}

// ── Delete ──
async function deleteAdCampaign() {
  const editId = document.getElementById('adcamp-edit-id').value;
  if (!editId || !confirm('Delete this campaign?')) return;
  try {
    await sbUpdate('outreach_campaigns', editId, { deleted_at: new Date().toISOString() });
    showToast('Campaign deleted');
    closeAdCampModal();
    renderCampaignsPage();
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}
