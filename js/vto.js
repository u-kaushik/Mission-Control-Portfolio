// Mission Control — V/TO (Vision/Traction Organizer) page
// =============================================
// V/TO PAGE
// =============================================
const VTO_FIELDS = [
  // Vision
  'vto_purpose','vto_niche','vto_10yr',
  'vto_3yr_date','vto_3yr_revenue','vto_3yr_profit','vto_3yr_measurables','vto_3yr_picture',
  // Marketing
  'vto_target_market','vto_uniques','vto_process','vto_guarantee',
  'vto_guarantee_internal','vto_guarantee_customer',
  // Traction — 1-Year Plan
  'vto_1yr_date','vto_1yr_revenue','vto_1yr_profit','vto_1yr_measurables',
  // Traction — Quarterly Rocks
  'vto_q_date','vto_q_revenue','vto_q_profit','vto_q_measurables',
];
// Default VTO content — shown until Supabase values load (or if nothing saved yet)
MC.vtoData = {
  // \u2500\u2500 VISION \u2500\u2500
  vto_core_values:
    `Deliver First: Every engagement ships a measurable outcome. No fluff, no decks that collect dust.\nAgent-Native: AI agents are the workforce. Humans set direction, agents execute.\nRadical Transparency: Clients see the dashboard, the metrics, the progress. No black boxes.\nCompound Value: Build systems that keep working after handover. Recurring revenue from recurring value.\nSpeed to Value: First deliverable within 14 days of kickoff. Prove ROI before the first invoice.\nStay Lean: No office, no bloat. One founder + AI squad = agency leverage without agency overhead.`,
  vto_purpose:
    `Build the UK\u2019s leading AI automation agency \u2014 helping businesses replace manual ops with autonomous AI agent systems that deliver measurable ROI.`,
  vto_niche:
    `AI agent implementation for UK SMBs \u2014 custom automation systems that handle ops, sales support, and data workflows.`,
  vto_10yr:
    `A \u00a310M+/yr AI agency with 100+ retainer clients, a library of reusable agent templates, and a self-sustaining team of 10\u201320 specialists. The business runs 90% on its own systems. Location-free \u2014 operating from Spain, UK, or wherever life takes us. Property portfolio alongside. Recognised as the UK\u2019s leading AI automation agency.`,
  // Marketing Strategy
  vto_target_market:
    `UK SMBs doing \u00a31\u201310M revenue, 10\u2013200 employees, with manual ops bottlenecks. SaaS companies, agencies, e-commerce brands, professional services.`,
  vto_uniques:
    `1. Agent-Native Delivery: We don\u2019t consult \u2014 we build and deploy working AI agents that run autonomously.\n2. Solo Founder + AI Squad: No overhead bloat. Our AI agents handle what 10 humans would, keeping costs low and margins high.\n3. Outcome-Based Pricing: Clients pay for results, not hours. If the agent doesn\u2019t deliver ROI, we fix it or refund.`,
  vto_process:
    `Discovery Call \u2192 Ops Audit \u2192 Agent Design \u2192 Build & Test \u2192 Deploy \u2192 Monitor & Optimise \u2192 Ongoing Retainer`,
  vto_guarantee:
    `Measurable ROI within 30 days of deployment or we work for free until it\u2019s there. Every client gets a live dashboard showing exactly what the agents are doing.`,
  vto_guarantee_internal:
    `Every agent system tested with real data before client deployment. If it doesn\u2019t hit the KPI target in testing, it doesn\u2019t ship.`,
  vto_guarantee_customer:
    `30-day ROI guarantee. Live dashboard access. Cancel retainer anytime with 30 days notice.`,
  // 3-Year Picture
  vto_3yr_date:       `Mar 2028`,
  vto_3yr_revenue:    `\u00a3100k/month agency revenue`,
  vto_3yr_profit:     `75%+ gross margins (AI-leveraged delivery)`,
  vto_3yr_measurables:`50+ active retainer clients. Average deal \u00a35k+/month. NPS \u226560. Churn <3%/month. 20+ reusable agent templates. 3\u20135 specialist hires.`,
  vto_3yr_picture:
    `A portfolio of 50+ retainer clients each paying \u00a33\u20138k/month for AI agent systems. Reusable templates cut delivery time to days per new client. 3\u20135 specialist engineers handling custom builds. Inbound pipeline from content and referrals covers 80%+ of new business. Operating from Spain with a laptop and internet.`,
  // \u2500\u2500 TRACTION \u2500\u2500
  // 1-Year Plan (Mar 2026 \u2013 Mar 2027)
  vto_1yr_date:       `Mar 2027`,
  vto_1yr_revenue:    `\u00a330k/month`,
  vto_1yr_profit:     `\u00a320k/month (70%+ margins)`,
  vto_1yr_measurables:`15+ active retainer clients. Average deal value \u00a33k+/month. Outreach pipeline: 100+ qualified prospects/month. 5+ case studies published. \u00a310k+/month owner\u2019s draw.`,
  // Q1 Rocks (Feb\u2013Mar 2026)
  vto_q_date:         `31 Mar 2026`,
  vto_q_revenue:      `\u00a35k MRR`,
  vto_q_profit:       `\u00a33.5k/month`,
  vto_q_measurables:  `Cold outreach running at 1,000 emails/week. 3 signed retainer clients at \u00a32k+. Pipeline of 30+ qualified prospects. First case study live.`,
};

// Static 1-Year Plan goals (shown if no DB goals loaded) — max 7, broad strategic outcomes
const VTO_ANNUAL_GOALS_DEFAULT = [
  { title: 'Build AI agent delivery system for client projects',                           owner: 'kai',    progress: 0, priority: 1, description: 'Create reusable agent templates and delivery workflows so each new client engagement takes 1\u20132 weeks instead of months.' },
  { title: '15 active retainer clients at \u00a33k+/month avg',                            owner: 'penny',  progress: 0, priority: 2, description: 'Retainers are the engine. 15 clients at \u00a33k = \u00a345k MRR. Predictable, compounding revenue.' },
  { title: 'Outreach pipeline: 100 qualified prospects/month',                             owner: 'sola',   progress: 0, priority: 3, description: 'Pipeline is oxygen. 100 qualified prospects/month keeps the funnel healthy even with 5\u201310% close rate.' },
  { title: '\u00a330k/month agency revenue by Mar \u201927',                               owner: 'jarvis', progress: 0, priority: 4, description: 'The run rate that proves the model works and funds aggressive growth.' },
  { title: '70%+ gross margins (AI-leveraged delivery)',                                   owner: 'jarvis', progress: 0, priority: 5, description: 'Keep delivery costs low by using AI agents for execution. Every engagement should clear 70%+ margin.' },
  { title: '5+ published case studies with measurable ROI',                                owner: 'echo',   progress: 0, priority: 6, description: 'Social proof that converts. Each case study should show a specific metric improvement from a real client.' },
];

// Rationale texts shown in the goal detail dialog
const GOAL_RATIONALE = [
  `Reusable agent templates and playbooks cut delivery from weeks to days. Each template compounds \u2014 build once, deploy many times. This is the moat.`,
  `Retainers are the engine. 15 clients at \u00a33k = \u00a345k MRR. Each new client compounds value; churn of one doesn\u2019t kill the business.`,
  `Pipeline is oxygen. 100 qualified prospects/month keeps the funnel healthy. At a 5\u201310% close rate, that\u2019s 5\u201310 new clients/month.`,
  `The run rate that proves the model works. \u00a330k/month with 70%+ margins means \u00a320k+ profit \u2014 enough to reinvest aggressively and scale.`,
  `AI-leveraged delivery means minimal human labour per engagement. Agents do the heavy lifting; you architect and oversee. 70%+ margins are achievable.`,
  `Social proof that converts. Prospects need to see real results from real companies. Each case study should cite a specific ROI metric.`,
];

// Static Q1 2026 Rocks (shown if no DB rocks loaded) — matches seeded data
const VTO_Q1_ROCKS_DEFAULT = [
  { title: '30-Day Offer Validation Sprint (250x3 niche test)', owner_id: 'jarvis', progress: 0, status: 'on_track', quarter: 1, year: 2026,
    description: 'Validate one front-end offer across 3 niches (250 contacts each) over 14 days. Select a winning niche to scale.' },
  { title: 'Launch cold outreach - 1,000 emails/week to SaaS CTOs', owner_id: 'penny', progress: 0, status: 'on_track', quarter: 1, year: 2026,
    description: 'Set up Instantly campaigns targeting SaaS CTOs in UK. 3-step email sequences. Track opens, replies, meetings booked.' },
  { title: 'Sign first 3 retainer clients at 2k+/month', owner_id: 'penny', progress: 0, status: 'on_track', quarter: 1, year: 2026,
    description: 'Close 3 paying clients from outreach pipeline. Each on monthly retainer for AI agent implementation.' },
  { title: 'Publish first case study with measurable ROI', owner_id: 'echo', progress: 0, status: 'on_track', quarter: 1, year: 2026,
    description: 'Document first client engagement with before/after metrics. Publish on website and use in outreach.' },
];

let _goalDetailEscHandler = null;
function openGoalDetail(idx) {
  const goals = MC.displayGoals || VTO_ANNUAL_GOALS_DEFAULT;
  const g = goals[idx];
  if (!g) return;
  const pct      = Math.min(100, g.progress || 0);
  const ownerId  = Array.isArray(g.assigned_to) ? g.assigned_to[0] : (g.assigned_to || g.owner || '');
  const agentInf = agentInfo(ownerId);
  const rationale = GOAL_RATIONALE[idx] || g.description || '';
  const ownerHtml = agentInf
    ? `<div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:14px;cursor:pointer"
          onclick="closeGoalDetail();openAgentModal('${ownerId}')">
        ${agentInf.avatar
          ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;overflow:hidden;flex-shrink:0;position:relative"><img src="${agentInf.avatar}?v=${AVATAR_BUST}" alt="${agentInf.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0" onerror="_avErr(this)"><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:14px">${agentInf.emoji}</span></span>`
          : `<span style="font-size:18px;flex-shrink:0">${agentInf.emoji}</span>`}
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--text-primary);line-height:1.2">${escHtml(agentInf.name)}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:1px">${escHtml(agentInf.role || 'Agent')} →</div>
        </div>
      </div>`
    : '';
  const ol = document.getElementById('goal-detail-overlay');
  if (!ol) return;
  document.getElementById('gdlg-title').textContent = g.title || 'Goal';
  document.getElementById('gdlg-owner').innerHTML = ownerHtml;
  document.getElementById('gdlg-progress-bar').style.width = pct + '%';
  document.getElementById('gdlg-progress-pct').textContent = pct + '%';
  document.getElementById('gdlg-rationale').textContent = rationale;
  ol.classList.remove('hidden');
  if (_goalDetailEscHandler) document.removeEventListener('keydown', _goalDetailEscHandler);
  _goalDetailEscHandler = (e) => { if (e.key === 'Escape') closeGoalDetail(); };
  document.addEventListener('keydown', _goalDetailEscHandler);
}
function closeGoalDetail() {
  const ol = document.getElementById('goal-detail-overlay');
  if (ol) ol.classList.add('hidden');
  if (_goalDetailEscHandler) { document.removeEventListener('keydown', _goalDetailEscHandler); _goalDetailEscHandler = null; }
}

function setVtoTab(btn, tab) {
  document.querySelectorAll('.vto-q-tab').forEach(function(b) {
    var active = b === btn;
    b.style.background = active ? 'var(--surface)' : 'none';
    b.style.color      = active ? 'var(--text-primary)' : 'var(--text-secondary)';
    b.style.boxShadow  = active ? 'var(--shadow-xs)' : 'none';
  });
  var vp = document.getElementById('vto-panel-vision');
  var tp = document.getElementById('vto-panel-traction');
  if (vp) vp.style.display = tab === 'vision' ? '' : 'none';
  if (tp) tp.style.display = tab === 'traction' ? '' : 'none';
}

async function renderVTOPage() {
  // Quarter label + auto-fill q date
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  const qEnd = new Date(now.getFullYear(), q * 3, 0); // last day of quarter
  const qLabel = document.getElementById('vto-quarter-label');
  if (qLabel) qLabel.textContent = `Q${q} ${now.getFullYear()}`;

  // Issues count + top issues list — card style, click → issues page
  const openIssues = MC.allIssues.filter(i => i.status === 'open' || i.status === 'ids');
  const issuesListEl = document.getElementById('vto-issues-list');
  if (issuesListEl) {
    if (openIssues.length === 0) {
      issuesListEl.innerHTML = `<div style="color:var(--text-muted);font-size:12px;padding:8px 0;font-style:italic">No open issues — great!</div>`;
    } else {
      issuesListEl.innerHTML = openIssues.slice(0, 8).map(iss => {
        const statusLabel = iss.status === 'ids' ? 'In IDS' : 'Open';
        const statusCol   = 'var(--text-secondary)';
        const statusBg    = 'var(--surface-2)';
        const raiserInf   = agentInfo(iss.raised_by || iss.agent_id);
        const avatarHtml  = raiserInf
          ? (raiserInf.avatar
              ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;overflow:hidden;flex-shrink:0;position:relative"><img src="${raiserInf.avatar}?v=${AVATAR_BUST}" alt="${raiserInf.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0" onerror="_avErr(this)"><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:9px">${raiserInf.emoji}</span></span>`
              : `<span style="font-size:11px">${raiserInf.emoji}</span>`)
          : '';
        return `<div onclick="navigateTo('issues')" style="
          background:var(--surface-2);border:1px solid var(--border-light);
          border-left:2px solid var(--border);border-radius:var(--radius-xs);
          padding:12px 14px;cursor:pointer;transition:box-shadow 0.15s,transform 0.15s;
          display:flex;align-items:flex-start;gap:10px;"
          onmouseenter="this.style.boxShadow='var(--shadow-sm)';this.style.transform='translateY(-1px)'"
          onmouseleave="this.style.boxShadow='none';this.style.transform='none'">
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:var(--text-primary);line-height:1.35;
              overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:5px">${escHtml((iss.title||'Issue').slice(0,60))}</div>
            ${iss.description ? `<div style="font-size:11px;color:var(--text-secondary);line-height:1.4;
              overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:7px">${escHtml(iss.description.slice(0,80))}</div>` : ''}
            <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;
              padding:2px 8px;border-radius:99px;background:${statusBg};color:${statusCol}">${statusLabel}</span>
          </div>
          <div style="flex-shrink:0;margin-top:2px">${avatarHtml}</div>
        </div>`;
      }).join('');
    }
  }

  // ── Rocks list — card style, click → rocks page ──
  const rocksList = document.getElementById('vto-rocks-list');
  if (rocksList) {
    const currentQ = q, currentY = now.getFullYear();
    // Update label with current quarter
    const rocksLabel = document.getElementById('vto-rocks-label');
    if (rocksLabel) rocksLabel.textContent = `Q${currentQ} ${currentY} Rocks`;
    // Filter for current quarter rocks first; fall back to all rocks if none match
    const qRocks = MC.allRocks.filter(r => r.quarter === currentQ && (r.year === currentY || !r.year));
    const displayRocks = (qRocks.length > 0 ? qRocks : (MC.allRocks.length > 0 ? MC.allRocks : VTO_Q1_ROCKS_DEFAULT)).slice(0, 4);
    // Compact rock row — matches dashboard rocks strip style
    const renderRock = r => {
      const rockNum  = MC.allRocks.indexOf(r) + 1;
      const accent   = MC.rockAccent[rockNum] || 'var(--primary)';
      const pct      = Math.min(100, r.progress || 0);
      const stKey    = r.status || 'on_track';
      const stLabel  = { on_track:'On Track', at_risk:'At Risk', off_track:'Off Track', complete:'Complete' }[stKey] || stKey;
      const stIcons  = { on_track:'\u2713', at_risk:'\u26A0', off_track:'\u2716', complete:'\u2605' };
      const stIcon   = stIcons[stKey] || '';
      const owner    = agentInfo(r.owner_id);
      const shortTitle = (r.title||'').replace(/^Rock \d+: /,'').slice(0,60);
      const cir = 2 * Math.PI * 10;
      const dOff = cir - (cir * pct / 100);
      return `<div style="padding:10px 12px;background:var(--surface-2);border:1px solid var(--border-light);border-radius:var(--radius-xs);cursor:pointer;transition:box-shadow 0.2s,transform 0.15s" onclick="navigateToRock('${r.id}')"
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
          ${owner
            ? `<span data-agent-id="${owner.id}" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--surface);border:1.5px solid var(--border-light);position:relative">
                ${owner.avatar
                  ? `<img src="${owner.avatar}?v=${AVATAR_BUST}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;pointer-events:none;position:absolute;inset:0" onerror="_avErr(this)"><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:10px">${owner.emoji}</span>`
                  : `<span style="font-size:10px;pointer-events:none">${owner.emoji}</span>`}
              </span>`
            : ''}
          <span class="rock-card-status-badge rock-status-${stKey}" style="font-size:9px;flex-shrink:0">${stIcon ? `<span style="font-size:8px">${stIcon}</span> ` : ''}${stLabel}</span>
        </div>
      </div>`;
    };
    rocksList.style.cssText += ';display:flex;flex-direction:column;gap:6px';
    rocksList.innerHTML = displayRocks.map(renderRock).join('');
  }

  // ── 1-Year Plan goals — query goals table filtered by scope=1_year_plan ──
  const goalsEl = document.getElementById('vto-annual-goals');
  if (goalsEl) {
    let planGoals = [];
    try {
      const raw = await sbQuery('agency_goals', {
        select: 'id,title,description,status,progress,priority,assigned_to,deadline,metadata',
        'metadata->>scope': 'eq.1_year_plan',
        order: 'priority.asc,created_at.asc',
        limit: 10
      });
      if (Array.isArray(raw) && raw.length > 0) planGoals = raw;
    } catch { /* fall through */ }
    // Store globally so dashboard card can reuse without a second query
    MC.planGoals = planGoals;
    const displayGoals = planGoals.length > 0 ? planGoals : VTO_ANNUAL_GOALS_DEFAULT;
    MC.displayGoals = displayGoals;
    const renderPlanGoal = (g, idx) => {
      const pct      = Math.min(100, g.progress || 0);
      const ownerId  = Array.isArray(g.assigned_to) ? g.assigned_to[0] : (g.assigned_to || g.owner || '');
      const agentInf = agentInfo(ownerId);
      const ownerAvatar = agentInf
        ? (agentInf.avatar
            ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;overflow:hidden;flex-shrink:0;position:relative"><img src="${agentInf.avatar}?v=${AVATAR_BUST}" alt="${agentInf.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0" onerror="_avErr(this)"><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:9px">${agentInf.emoji}</span></span>`
            : `<span style="font-size:11px;flex-shrink:0">${agentInf.emoji}</span>`)
        : '';
      return `<div class="vto-list-item" style="padding:7px 0;border-bottom:1px solid var(--border-light);gap:7px;cursor:pointer" onclick="openGoalDetail(${idx})">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-weight:700;font-size:12px;line-height:1.3;flex:1;color:var(--text-primary)">${escHtml(g.title||'Goal')}</span>
            ${ownerAvatar}
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:5px">
            <div style="flex:1;height:3px;background:var(--border);border-radius:2px"><div style="height:100%;width:${pct}%;background:var(--primary);border-radius:2px;transition:width 0.4s"></div></div>
            <span style="font-size:10px;color:var(--text-muted);font-weight:700;min-width:26px;text-align:right">${pct}%</span>
          </div>
        </div>
      </div>`;
    };
    goalsEl.style.borderTop = 'none';
    goalsEl.innerHTML = displayGoals.map((g, idx) => renderPlanGoal(g, idx)).join('');
  }

  // Load VTO text fields from Supabase memory (source = vto)
  try {
    const rows = await sbQuery('memory', {
      select: 'key,content',
      source: 'eq.vto',
      limit: 80
    });
    if (Array.isArray(rows) && rows.length > 0) {
      const allVtoKeys = new Set([...VTO_FIELDS, 'vto_core_values']);
      rows.forEach(r => { if (r.key && allVtoKeys.has(r.key)) MC.vtoData[r.key] = r.content || ''; });
      MC.vtoData._savedDefaults = true; // already in DB — skip auto-seed
    }
  } catch { /* memory table may not exist */ }

  // Populate editable fields — field keys use underscores, element IDs use hyphens
  // e.g. vto_purpose → #vto-purpose
  VTO_FIELDS.forEach(field => {
    const elId = field.replace(/_/g, '-');
    const el   = document.getElementById(elId);
    if (!el) return;
    if (MC.vtoData[field]) {
      el.textContent = MC.vtoData[field];
    } else {
      el.textContent = ''; // empty → CSS :empty:before shows placeholder
    }
  });

  // Core values
  const cvEl = document.getElementById('vto-core-values');
  if (cvEl) {
    const coreVals = (MC.vtoData['vto_core_values'] || '').split('\n').filter(Boolean);
    if (coreVals.length > 0) {
      cvEl.innerHTML = coreVals.map((v, i) => {
        const colonIdx = v.indexOf(':');
        const label = colonIdx > -1 ? escHtml(v.slice(0, colonIdx + 1)) : '';
        const body  = colonIdx > -1 ? escHtml(v.slice(colonIdx + 1).trim()) : escHtml(v);
        return `<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 14px;background:var(--surface-2);border:1px solid var(--border-light);border-radius:var(--radius-xs)">
          <span class="vto-cv-number">${i+1}</span>
          <span style="font-size:13px;color:var(--text-primary);line-height:1.5">${label ? `<strong>${label}</strong> ` : ''}${body}</span>
        </div>`;
      }).join('');
    } else {
      cvEl.innerHTML = `<div style="color:var(--text-muted);font-size:12px;padding:6px 0;font-style:italic">Define your core values — they guide every decision.</div>`;
    }
  }

  // 3 Uniques — render each line as its own card row
  const uniquesRendered = document.getElementById('vto-uniques-rendered');
  if (uniquesRendered) {
    const uniqueLines = (MC.vtoData['vto_uniques'] || '').split('\n').filter(Boolean);
    if (uniqueLines.length > 0) {
      uniquesRendered.innerHTML = uniqueLines.map(u => {
        // Bold the label before the colon if present
        const colonIdx = u.indexOf(':');
        const label = colonIdx > -1 ? escHtml(u.slice(0, colonIdx + 1)) : '';
        const body  = colonIdx > -1 ? escHtml(u.slice(colonIdx + 1).trim()) : escHtml(u);
        return `<div class="vto-unique-item">
          <span style="flex:1;font-size:13px;line-height:1.5;color:var(--text-primary)">
            ${label ? `<strong style="color:var(--text-primary)">${label}</strong> ` : ''}${body}
          </span>
        </div>`;
      }).join('');
    } else {
      uniquesRendered.innerHTML = '';
    }
  }

  // Proven Process — render as horizontal flow with step boxes + icons
  const processFlowEl = document.getElementById('vto-process-flow');
  if (processFlowEl) {
    const processText = MC.vtoData['vto_process'] || '';
    const steps = processText.split(/\u2192|\u2794|→|->/).map(s => s.trim()).filter(Boolean);
    const stepIcons = { 'discovery call':'ph-phone', 'ops audit':'ph-magnifying-glass', 'agent design':'ph-pencil-ruler',
      'build & test':'ph-code', 'deploy':'ph-rocket-launch', 'monitor & optimise':'ph-chart-line-up', 'ongoing retainer':'ph-arrows-clockwise' };
    if (steps.length > 0) {
      processFlowEl.innerHTML = steps.map((step, i) => {
        const icon = stepIcons[step.toLowerCase()] || 'ph-circle';
        return (i > 0 ? '<i class="ph-thin ph-arrow-right" style="font-size:12px;color:var(--text-muted);flex-shrink:0;align-self:center"></i>' : '') +
          `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 4px;background:var(--surface-2);border:1px solid var(--border-light);border-radius:var(--radius-xs);text-align:center;min-width:0">
            <i class="ph-thin ${icon}" style="font-size:16px;color:var(--primary)"></i>
            <span style="font-size:10px;font-weight:600;color:var(--text-primary);white-space:nowrap">${escHtml(step)}</span>
          </div>`;
      }).join('');
    }
  }

  // Target Market — render 4 avatar mini-cards (demographics / psychographics)
  const tmAvatarEl = document.getElementById('vto-target-avatars');
  if (tmAvatarEl) {
    const avatarCards = [
      { icon: 'ph-buildings',        label: 'Company',    value: '\u00a31\u201310M revenue SMBs' },
      { icon: 'ph-map-pin',          label: 'Location',   value: 'UK-based' },
      { icon: 'ph-user-circle',      label: 'Buyer',      value: 'CTOs & Ops Leaders' },
      { icon: 'ph-gear',             label: 'Pain',       value: 'Manual ops bottlenecks' },
    ];
    tmAvatarEl.innerHTML = avatarCards.map(c =>
      `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface-2);border:1px solid var(--border-light);border-radius:var(--radius-xs)">
        <i class="ph-thin ${c.icon}" style="font-size:16px;color:var(--primary);flex-shrink:0"></i>
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted)">${c.label}</div>
          <div style="font-size:12px;font-weight:600;color:var(--text-primary);line-height:1.3">${c.value}</div>
        </div>
      </div>`
    ).join('');
  }

  // Purpose — render as 2 clean boxes
  const purposeBoxEl = document.getElementById('vto-purpose-boxes');
  if (purposeBoxEl) {
    const purposeCards = [
      { icon: 'ph-robot',            label: 'What We Build',   value: 'AI agent systems that replace manual ops' },
      { icon: 'ph-airplane-takeoff', label: 'Why We Build It', value: 'Freedom \u2014 financial, geographical & personal' },
    ];
    purposeBoxEl.innerHTML = purposeCards.map(c =>
      `<div style="flex:1;display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface-2);border:1px solid var(--border-light);border-radius:var(--radius-xs)">
        <i class="ph-thin ${c.icon}" style="font-size:18px;color:var(--primary);flex-shrink:0"></i>
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted)">${c.label}</div>
          <div style="font-size:13px;font-weight:600;color:var(--text-primary);line-height:1.35">${c.value}</div>
        </div>
      </div>`
    ).join('');
  }

  // Our Lane — render niche as succinct mini-cards
  const nicheBoxEl = document.getElementById('vto-niche-boxes');
  if (nicheBoxEl) {
    const nicheCards = [
      { icon: 'ph-robot',            label: 'Service',  value: 'AI Agent Systems' },
      { icon: 'ph-buildings',        label: 'Clients',  value: 'UK SMBs' },
      { icon: 'ph-gear',             label: 'Focus',    value: 'Ops Automation' },
      { icon: 'ph-arrows-clockwise', label: 'Model',    value: 'Monthly Retainers' },
    ];
    nicheBoxEl.innerHTML = nicheCards.map(c =>
      `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface-2);border:1px solid var(--border-light);border-radius:var(--radius-xs)">
        <i class="ph-thin ${c.icon}" style="font-size:16px;color:var(--primary);flex-shrink:0"></i>
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted)">${c.label}</div>
          <div style="font-size:12px;font-weight:600;color:var(--text-primary);line-height:1.3">${c.value}</div>
        </div>
      </div>`
    ).join('');
  }

  // 10-Year Target — render as scannable icon boxes
  const tenYrBoxEl = document.getElementById('vto-10yr-boxes');
  if (tenYrBoxEl) {
    const tenYrCards = [
      { icon: 'ph-currency-gbp',           label: 'Revenue',    value: '\u00a310M+/yr' },
      { icon: 'ph-chart-line-up',          label: 'Margins',    value: '75%+ Gross' },
      { icon: 'ph-users-three',            label: 'Clients',    value: '100+ Retainers' },
      { icon: 'ph-robot',                  label: 'Operations', value: '90% Self-Running' },
      { icon: 'ph-house',                  label: 'Property',   value: '\u00a320k/m Portfolio' },
      { icon: 'ph-globe-hemisphere-west',  label: 'Location',   value: 'Spain & UK' },
    ];
    tenYrBoxEl.innerHTML = tenYrCards.map(c =>
      `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--surface-2);border:1px solid var(--border-light);border-radius:var(--radius-xs)">
        <i class="ph-thin ${c.icon}" style="font-size:18px;color:var(--primary);flex-shrink:0"></i>
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted)">${c.label}</div>
          <div style="font-size:13px;font-weight:700;color:var(--text-primary);line-height:1.3">${c.value}</div>
        </div>
      </div>`
    ).join('');
  }

  // Auto-fill quarter end date if not set
  const qDateEl = document.getElementById('vto-q-date');
  if (qDateEl && !qDateEl.textContent.trim()) {
    qDateEl.textContent = qEnd.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  }

  // Sync header "1 Year Plan" pill with revenue + date from VTO data
  const bannerEl = document.getElementById('goal-banner-text');
  if (bannerEl) {
    const rev  = MC.vtoData['vto_1yr_revenue'] || '£100k MRR';
    const date = MC.vtoData['vto_1yr_date']    || "Sep '26";
    const meas = (MC.vtoData['vto_1yr_measurables'] || '').split('.')[0].trim();
    bannerEl.textContent = meas ? `${rev} — ${meas} — ${date}` : `${rev} — ${date}`;
  }

  // Auto-save defaults to Supabase if nothing was loaded from DB
  // (runs once silently so next visit loads from DB)
  if (!MC.vtoData._savedDefaults) {
    MC.vtoData._savedDefaults = true;
    saveVTO(true).catch(e => console.warn('[VTO] auto-seed failed:', e));
  }
}

async function saveVTO(forceAll = false) {
  const btn = document.querySelector('#page-vto button[onclick="saveVTO()"]');
  if (btn) { btn.textContent = 'Saving…'; btn.disabled = true; }
  const updates = [];
  // All saveable fields: editable fields + core values (rendered as list, not contenteditable)
  const allSaveFields = [...VTO_FIELDS, 'vto_core_values'];
  allSaveFields.forEach(field => {
    const elId = field.replace(/_/g, '-');
    const el   = document.getElementById(elId);
    const val  = el ? el.textContent.trim() : (MC.vtoData[field] || '');
    // Save if forceAll (initial seed) or if value changed
    if (val && (forceAll || val !== (MC.vtoData[field] || ''))) {
      MC.vtoData[field] = val;
      updates.push({ key: field, content: val, source: 'vto', updated_at: new Date().toISOString() });
    }
  });
  if (updates.length > 0) {
    try {
      const results = await Promise.all(updates.map(u => fetch(`${SUPABASE_URL}/rest/v1/memory`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(u)
      })));
      const failed = results.filter(r => !r.ok);
      if (failed.length) console.warn('[VTO] save: ' + failed.length + ' of ' + results.length + ' writes failed');
    } catch(e) { showToast('Failed to save V/TO'); console.warn('[VTO] save error:', e); }
  }
  if (btn) { btn.textContent = '✓ Saved'; setTimeout(() => { btn.textContent = 'Save V/TO'; btn.disabled = false; }, 1800); }
}

function vtoAddCoreValue() {
  const val = prompt('Enter a core value:');
  if (!val) return;
  const cvEl = document.getElementById('vto-core-values');
  if (!cvEl) return;
  const existing = cvEl.querySelectorAll('.vto-list-item');
  if (existing.length === 1 && existing[0].style.color) cvEl.innerHTML = '';
  const item = document.createElement('div');
  item.className = 'vto-list-item';
  item.innerHTML = `<span class="vto-list-icon"><i class="ph-thin ph-star"></i></span><span>${escHtml(val)}</span>`;
  cvEl.appendChild(item);
}

