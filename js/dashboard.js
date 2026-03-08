// Mission Control — Dashboard home page

// ── Fetch personal ambitions from memory table ──
// Multi-strategy pull: context dumps + typed goal entries + personal-scoped rows + goals table
async function fetchPersonalAmbitions() {
  try {
    // Strategy 1: pull all memory rows (no type filter — we'll sort client-side)
    const [memRes, goalsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/memory?select=id,content,type,scope,key,source,created_at,metadata&order=created_at.desc&limit=500`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      }),
      fetch(`${SUPABASE_URL}/rest/v1/goals?select=id,title,description,status,progress,priority,assigned_to&order=priority.desc&limit=100`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      })
    ]);

    const memRows  = memRes.ok  ? await memRes.json()  : [];
    const goalRows = goalsRes.ok ? await goalsRes.json() : [];
    console.log(`[ambitions] memory rows: ${memRows.length}, goal rows: ${goalRows.length}`);

    // Score each memory row — higher = more relevant to personal context
    const AMBITION_TYPES = new Set(['goal','ambition','north_star','mission','priority','objective','aspiration','vision','value','life_goal','personal_goal']);
    const BROAD_TYPES    = new Set(['note','idea','fact','decision','reminder','context','preference','habit','plan']);

    const scored = memRows.map(r => {
      const type  = (r.type  || '').toLowerCase().replace(/[^a-z_]/g, '');
      const scope = (r.scope || '').toLowerCase();
      const src   = ((r.metadata && r.metadata.source) || r.source || '').toLowerCase();
      const cat   = ((r.metadata && r.metadata.category) || '').toLowerCase();
      const cb    = (r.key || '').toLowerCase();
      let score   = 0;

      // Highest priority: explicit context dumps (utkarsh_context source)
      if (src === 'utkarsh_context' || src.includes('context')) score += 10;
      // Explicit ambition/goal types
      if (AMBITION_TYPES.has(type)) score += 8;
      // Personal scope
      if (scope === 'personal' || scope === 'user') score += 6;
      // Personal/health/financial category
      if (cat === 'personal' || cat === 'health' || cat === 'financial' || cat === 'life') score += 5;
      // Mission-control notes (user-created)
      if (src === 'mission-control') score += 4;
      // Key/tag hints
      if (cb.includes('goal') || cb.includes('ambition') || cb.includes('personal')) score += 3;
      // Broad types with some personal keywords in content
      if (BROAD_TYPES.has(type)) {
        const c = (r.content || '').toLowerCase();
        const personalKeywords = ['want to','goal','aim to','plan to','dream','ambition','target','achieve','build','create','health','fitness','body','gym','property','hmo','invest','revenue','£','income','family','relationship','travel','learn'];
        if (personalKeywords.some(k => c.includes(k))) score += 3;
      }
      // Skip if zero score (pure agent operational memory, not personal)
      return { ...r, _score: score };
    }).filter(r => r._score > 0);

    // Sort by score desc then date desc
    scored.sort((a, b) => b._score - a._score || new Date(b.created_at) - new Date(a.created_at));

    console.log(`[ambitions] ${scored.length} relevant rows after scoring`);

    // Dedup by first 80 chars of content
    const seen = new Set();
    const deduped = scored.filter(r => {
      const key = (r.content || '').slice(0, 80).toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 18);

    // Convert goals table rows to memory-like shape for rendering
    const personalGoals = goalRows
      .filter(g => {
        // Include goals assigned to utkarsh, or goals with personal/life keywords
        const assignee = Array.isArray(g.assigned_to) ? g.assigned_to.join(' ') : (g.assigned_to || '');
        const text = ((g.title || '') + ' ' + (g.description || '')).toLowerCase();
        const isPersonal = assignee.toLowerCase().includes('utkarsh') || assignee.toLowerCase().includes('ukaus');
        const hasPersonalKeywords = ['personal','health','life','fitness','property','invest'].some(k => text.includes(k));
        return isPersonal || hasPersonalKeywords;
      })
      .map(g => ({
        id: g.id,
        content: g.title + (g.description ? ` — ${g.description}` : ''),
        type: 'goal',
        scope: 'personal',
        source: 'goals_table',
        _score: 7 + (g.priority || 0) / 10,
        _progress: g.progress,
        _status: g.status,
        metadata: { source: 'goals_table', category: 'work' }
      }))
      .filter(g => {
        const key = g.content.slice(0, 80).toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6);

    return [...deduped, ...personalGoals];
  } catch(e) { console.error('[ambitions] error:', e); return []; }
}

// ── Dashboard home page ──
function greetingPhrase() {
  const h = new Date().getHours();
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  if (h < 12) return pick([
    'Rise and build, Utkarsh',
    'Morning, Utkarsh — let\'s make it count',
    'The CEO clocks in. Morning, Utkarsh',
    'Utkarsh is in the building',
    'A fresh day, a new move — morning, Utkarsh',
    'Good morning, Utkarsh — the squad is ready',
    'Early doors, Utkarsh. Let\'s go',
    'Another morning, another chance to win — hey, Utkarsh',
  ]);
  if (h < 17) return pick([
    'Back at it, Utkarsh',
    'Utkarsh returns',
    'The vision continues, Utkarsh',
    'Eyes on the prize, Utkarsh',
    'Mid-session check-in — you\'re doing great, Utkarsh',
    'Ready to build, Utkarsh',
    'The grind is real, Utkarsh — keep pushing',
    'Welcome back, Utkarsh — things are moving',
    'You showed up again, Utkarsh. That\'s the difference',
  ]);
  return pick([
    'Still at it, Utkarsh — respect',
    'Utkarsh in the late shift',
    'Evening, Utkarsh — the squad never sleeps',
    'Another strong day, Utkarsh',
    'Late session energy — let\'s close it out, Utkarsh',
    'The night shift begins, Utkarsh',
    'Good evening, Utkarsh — one more push',
    'Most people clock off now. Not Utkarsh',
  ]);
}

// Infer category from a memory row
function inferCat(row) {
  const meta = row.metadata || {};
  const src  = ((meta.source) || row.source || '').toLowerCase();
  // Explicit category tag wins
  if (meta.category) {
    const c = meta.category.toLowerCase();
    if (c === 'work' || c === 'business') return 'work';
    if (c === 'financial' || c === 'finance') return 'financial';
    if (c === 'health' || c === 'fitness') return 'health';
    return c;
  }
  // Goals table rows → work category by default
  if (src === 'goals_table') return 'work';
  const c = (row.content||'').toLowerCase();
  if (c.includes('hmo') || c.includes('property') || c.includes('rent') || c.includes('invest') || c.includes('£') || c.includes('income') || c.includes('portfoio') || c.includes('portfolio') || c.includes('dividend') || c.includes('salary') || c.includes('saving')) return 'financial';
  if (c.includes('body') || c.includes('gym') || c.includes('health') || c.includes('sleep') || c.includes('recomp') || c.includes('weight') || c.includes('fitness') || c.includes('calorie') || c.includes('nutrition') || c.includes('training') || c.includes('run') || c.includes('muscle')) return 'health';
  if (c.includes('agency') || c.includes('openclaw') || c.includes('revenue') || c.includes('client') || c.includes('mission control') || c.includes('saas') || c.includes('business') || c.includes('product') || c.includes('launch') || c.includes('ship') || c.includes('deploy') || c.includes('code') || c.includes('startup')) return 'work';
  if (c.includes('travel') || c.includes('family') || c.includes('relationship') || c.includes('friends') || c.includes('holiday') || c.includes('visit')) return 'life';
  return 'personal';
}

// Render agent avatar: tries image, falls back to emoji in a circle
function agentAvatarHtml(agent, size = 28) {
  if (!agent) return `<div class="dash-agent-avatar-img no-img" style="width:${size}px;height:${size}px;font-size:${Math.round(size*0.55)}px"><i class="ph-thin ph-user"></i></div>`;
  return `<div class="dash-agent-avatar-img" data-agent-id="${agent.id}" style="width:${size}px;height:${size}px;font-size:${Math.round(size*0.55)}px;cursor:pointer;position:relative">
    <img src="${agent.avatar}?v=${AVATAR_BUST}" alt="${agent.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;pointer-events:none;position:absolute;inset:0"
         onerror="this.style.display='none';var s=this.nextElementSibling;if(s)s.style.display='flex'">
    <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:inherit">${agent.emoji}</span></div>`;
}

async function renderDashboard() {
  const grid = document.getElementById('dash-grid');
  if (!grid) return;

  // Clear dynamic cards (everything after the static rocks card) before re-render
  const rocksCardEl = document.getElementById('dash-rocks-card');
  if (rocksCardEl) {
    let next = rocksCardEl.nextElementSibling;
    while (next) { const n = next.nextElementSibling; next.remove(); next = n; }
  } else {
    // Fallback: clear entire grid (rocks card not found yet)
    grid.innerHTML = '';
  }

  // Update greeting text
  const greetEl = document.getElementById('dash-greeting');
  if (greetEl) greetEl.textContent = greetingPhrase();

  const data  = MC.ppData || { projects:[], goals:[], tasks:[] };
  const tasks = MC.allTasks || [];
  const msgs  = MC.allMessages || [];

  // ── Task counts — use same week-cutoff logic as renderKanban ──
  const _now = new Date();
  const _dSun = (7 - _now.getDay()) % 7 || 7;
  const _nextSun = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate() + _dSun);
  _nextSun.setHours(0, 0, 0, 0);
  const _weekCut = _nextSun.getTime();
  const weekTasks = tasks.filter(t => {
    if (!t.due_date) return true;
    return new Date(t.due_date).setHours(23,59,59,0) <= _weekCut;
  });
  const doneTasks    = weekTasks.filter(t => effectiveStatus(t) === 'done').length;
  const activeTasks  = weekTasks.filter(t => ['in_progress','review'].includes(effectiveStatus(t))).length;
  const blockedTasks = weekTasks.filter(t => effectiveStatus(t) === 'blocked').length;
  const backlogTasks = weekTasks.filter(t => effectiveStatus(t) === 'backlog').length;
  const todoTasks    = weekTasks.filter(t => effectiveStatus(t) === 'todo').length;

  // ── Fetch 1-Year Plan goals independently (don't rely on VTO page having run first) ──
  let planGoals = MC.planGoals || [];
  if (planGoals.length === 0) {
    try {
      const _raw = await sbQuery('agency_goals', {
        select: 'id,title,status,progress,priority,assigned_to,metadata',
        'metadata->>scope': 'eq.1_year_plan',
        order: 'priority.asc,created_at.asc',
        limit: 10
      });
      if (Array.isArray(_raw) && _raw.length > 0) {
        planGoals = _raw;
        MC.planGoals = _raw;
      }
    } catch { /* silent */ }
  }

  // Recent messages — newest 5, skipping empty-content rows
  const recentMsgs = msgs.filter(m => (m.content||'').trim()).slice(0, 5);

  // ── Issues summary (open + IDS) ──
  const openIssues = (MC.allIssues || []).filter(i => i.status === 'open' || i.status === 'ids');
  const issuesByPri = { high: openIssues.filter(i => i.priority === 'high'), medium: openIssues.filter(i => i.priority === 'medium' || !i.priority || i.priority === 'low') };

  // Ensure goal detail popup can find these goals even if VTO page hasn't rendered
  const _dashGoals = planGoals.length > 0 ? planGoals : VTO_ANNUAL_GOALS_DEFAULT;
  if (!MC.displayGoals) MC.displayGoals = _dashGoals;

  const goalRowHtml = (g, idx) => {
    const pct      = Math.min(100, Math.max(0, g.progress || 0));
    const ownerId  = Array.isArray(g.assigned_to) ? g.assigned_to[0] : (g.assigned_to || '');
    const agentInf = agentInfo(ownerId);
    const ownerAv  = agentInf
      ? (agentInf.avatar
          ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;overflow:hidden;flex-shrink:0;position:relative"><img src="${agentInf.avatar}?v=${AVATAR_BUST}" alt="${agentInf.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0" onerror="_avErr(this)"><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:9px">${agentInf.emoji}</span></span>`
          : `<span style="font-size:11px;flex-shrink:0">${agentInf.emoji}</span>`)
      : '';
    return `<div style="display:flex;align-items:flex-start;gap:6px;padding:5px 0;border-bottom:1px solid var(--border-light);cursor:pointer" onclick="event.stopPropagation();openGoalDetail(${idx})">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:5px">
          <span style="font-size:11px;font-weight:700;color:var(--text-primary);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(g.title||'Goal')}</span>
          ${ownerAv}
        </div>
        <div style="display:flex;align-items:center;gap:5px;margin-top:3px">
          <div style="flex:1;min-width:40px;height:3px;background:var(--border);border-radius:2px"><div style="height:100%;width:${pct}%;background:var(--primary);border-radius:2px;transition:width 0.4s"></div></div>
          <span style="font-size:10px;color:var(--text-muted);font-weight:700;min-width:24px;text-align:right">${pct}%</span>
        </div>
      </div>
    </div>`;
  };

  // Rocks card is rendered in HTML; append the other cards after it
  const rocksCard = document.getElementById('dash-rocks-card');

  // Build HTML for the remaining cards (inserted after the rocks card placeholder)
  // Shared badge style for all card top-right nav links
  const OPN = `style="font-size:10px;font-weight:700;color:var(--text-muted);letter-spacing:0.06em;text-transform:uppercase"`;

  const cardsHtml = `
    <!-- 1-Year Goals — col-5 (row A, next to Rocks col-3) -->
    <div class="dash-card dash-col-5">
      <div class="dash-card-title" style="display:flex;align-items:center;justify-content:space-between"><span><i class="ph-thin ph-target"></i> 1-Year Goals</span><span ${OPN} style="cursor:pointer" onclick="navigateTo('vto')">OPEN ↗</span></div>
      ${planGoals.length === 0
        ? `<div style="font-size:13px;color:var(--text-muted);font-style:italic;margin-top:8px">No goals found</div>`
        : _dashGoals.map((g, idx) => goalRowHtml(g, idx)).join('')
      }
    </div>

    <!-- To-Do Queue — col-3 (row A, completes 4+5+3=12) -->
    <div class="dash-card dash-col-3" style="cursor:pointer" onclick="navigateTo('tasks')">
      <div class="dash-card-title" style="display:flex;align-items:center;justify-content:space-between"><span><i class="ph-thin ph-list-bullets"></i> To-Do Queue</span><span ${OPN}>OPEN ↗</span></div>
      <div class="dash-stat">${weekTasks.length}</div>
      <div class="dash-stat-label">this week</div>
      <div style="margin-top:14px;display:flex;flex-direction:column;gap:0">
        <div class="dash-row"><div class="dash-row-dot" style="background:var(--blue)"></div><span class="dash-row-label">Doing</span><span class="dash-row-val">${activeTasks}</span></div>
        <div class="dash-row"><div class="dash-row-dot" style="background:var(--green)"></div><span class="dash-row-label">Done</span><span class="dash-row-val">${doneTasks}</span></div>
        <div class="dash-row"><div class="dash-row-dot" style="background:var(--orange)"></div><span class="dash-row-label">Blocked</span><span class="dash-row-val">${blockedTasks}</span></div>
        <div class="dash-row"><div class="dash-row-dot" style="background:var(--text-muted)"></div><span class="dash-row-label">Queue</span><span class="dash-row-val">${todoTasks}</span></div>
        <div class="dash-row"><div class="dash-row-dot" style="background:var(--purple)"></div><span class="dash-row-label">Backlog</span><span class="dash-row-val">${backlogTasks}</span></div>
      </div>
    </div>

    <!-- Upcoming To-Dos preview — col-5 (row B, widest, first) -->
    <div class="dash-card dash-col-5">
      <div class="dash-card-title" style="display:flex;align-items:center;justify-content:space-between"><span>&#x23F0; Upcoming</span><span ${OPN}>Open &#x2197;</span></div>
      ${(() => {
        const upcoming = tasks
          .filter(t => { const s = effectiveStatus(t); return (s === 'todo' || s === 'in_progress' || s === 'review') && t.due_date; })
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
          .slice(0, 7);
        if (upcoming.length === 0) return '<div style="font-size:12px;color:var(--text-muted);font-style:italic;margin-top:8px;padding:16px 0;text-align:center">✓ Nothing due soon</div>';
        const today = new Date(); today.setHours(0,0,0,0);
        const _rocks = MC.allRocks || [];
        return upcoming.map(t => {
          const due = new Date(t.due_date);
          const diff = Math.round((due - today) / 86400000);
          const overdue = diff < 0;
          const dueStr = overdue ? Math.abs(diff)+'d late' : diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff+'d';
          const dueClr = overdue ? 'var(--red)' : diff <= 2 ? 'var(--orange)' : 'var(--text-muted)';
          const s = effectiveStatus(t);
          const dotClr = s === 'in_progress' ? 'var(--blue)' : s === 'review' ? 'var(--amber)' : 'var(--text-muted)';
          const ownId = Array.isArray(t.assigned_to) ? t.assigned_to[0] : t.assigned_to;
          const ag = agentInfo(ownId);
          const avHtml = ag ? (ag.avatar
            ? '<span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;overflow:hidden;flex-shrink:0"><img src="'+ag.avatar+'?v='+AVATAR_BUST+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;pointer-events:none"></span>'
            : '<span style="font-size:11px;flex-shrink:0">'+ag.emoji+'</span>') : '';
          const rockIdx = t.rock_id ? _rocks.findIndex(r => r.id === t.rock_id) : -1;
          const rockTag = rockIdx >= 0 ? '<span style="font-size:9px;font-weight:800;padding:1px 4px;border-radius:3px;background:var(--surface-2);color:var(--text-muted);flex-shrink:0;letter-spacing:0.04em">R'+(rockIdx+1)+'</span>' : '';
          const taskId = escHtml(t.id||'');
          return '<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;margin-bottom:2px;background:var(--surface);border:1px solid var(--border-light);border-radius:6px;cursor:pointer;transition:all 0.15s"'
            +' onclick="event.stopPropagation();openTaskFromDashboard(\''+taskId+'\')"'
            +' onmouseenter="this.style.background=\'var(--surface-2)\';this.style.borderColor=\'var(--border)\'" onmouseleave="this.style.background=\'var(--surface)\';this.style.borderColor=\'var(--border-light)\'"'
            +'>'
            +'<div style="width:7px;height:7px;border-radius:50%;background:'+dotClr+';flex-shrink:0"></div>'
            +rockTag
            +'<span style="font-size:12px;font-weight:500;color:var(--text-primary);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(t.title||'Untitled')+'</span>'
            +avHtml
            +'<span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:99px;background:'+( overdue ? 'var(--red-bg)' : diff<=2 ? 'var(--amber-bg)' : 'var(--surface-2)')+';color:'+dueClr+'">'+dueStr+'</span>'
            +'</div>';
        }).join('');
      })()}
    </div>

    <!-- Leadership Team — col-4 (row B) -->
    <div class="dash-card dash-col-4" style="cursor:pointer" onclick="navigateTo('team')">
      <div class="dash-card-title" style="display:flex;align-items:center;justify-content:space-between">
        <span><i class="ph-thin ph-users-three"></i> Leadership Team</span>
        <span ${OPN}>OPEN ↗</span>
      </div>
      <div class="dash-agent-grid">
        ${[HUMAN, ...AGENTS].map(a => {
          const { si, hb } = getAgentLiveStatus(a.id);
          const dotStyle = `background:${si.dot};${si.pulse ? '' : 'animation:none;'}`;
          const lastSeen = hb ? relativeTime(hb.toISOString()) : 'never';
          const tooltip = `${a.name} — ${si.label}${hb ? ' · ' + lastSeen : ''}`;
          return `<div class="dash-agent-chip" onclick="event.stopPropagation();openAgentModal('${a.id}')" style="cursor:pointer">
            <div class="dash-agent-avatar-img" style="position:relative">
              <img src="${a.avatar}?v=${AVATAR_BUST}" alt="${a.name}"
                   onerror="_avErr(this)"
                   style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;position:absolute;inset:0">
              <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:14px">${a.emoji}</span>
            </div>
            <div style="min-width:0;flex:1">
              <div class="dash-agent-name">${a.name}</div>
              <div class="dash-agent-role" style="color:${si.textColor}">${si.label}</div>
            </div>
            <div class="dash-agent-status" style="${dotStyle}"></div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Issues / IDS card -->
    ${(() => {
      const countBadge = openIssues.length > 0
        ? '<span style="font-size:11px;font-weight:700;padding:1px 7px;border-radius:99px;background:var(--red-bg);color:var(--red)">'+openIssues.length+' open</span>'
        : '<span style="font-size:11px;font-weight:600;padding:1px 7px;border-radius:99px;background:var(--surface-2);color:var(--text-muted)">0 open</span>';
      const issueRows = openIssues.length > 0 ? openIssues.slice(0, 8).map(iss => {
        const priColor = iss.priority === 'high' ? 'var(--red)' : iss.priority === 'medium' ? 'var(--orange)' : 'var(--text-muted)';
        const priBg    = iss.priority === 'high' ? 'var(--red-bg)' : iss.priority === 'medium' ? 'var(--amber-bg)' : 'var(--surface-2)';
        const priLabel = iss.priority === 'high' ? 'H' : iss.priority === 'medium' ? 'M' : 'L';
        const isIDS    = iss.status === 'ids';
        const issId = escHtml(iss.id||'');
        return '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;margin-bottom:2px;background:var(--surface);border:1px solid var(--border-light);border-radius:6px;cursor:pointer;transition:all 0.15s" onclick="event.stopPropagation();MC.pendingIssueId=\''+issId+'\';navigateTo(\'issues\')" onmouseenter="this.style.background=\'var(--surface-2)\';this.style.borderColor=\'var(--border)\'" onmouseleave="this.style.background=\'var(--surface)\';this.style.borderColor=\'var(--border-light)\'">'
          +'<span style="font-size:9px;font-weight:800;letter-spacing:0.06em;color:'+priColor+';background:'+priBg+';border-radius:3px;padding:1px 4px;flex-shrink:0;margin-top:1px">'+priLabel+'</span>'
          +(isIDS ? '<span style="font-size:9px;font-weight:700;color:var(--orange);background:var(--amber-bg);border-radius:3px;padding:1px 4px;flex-shrink:0;margin-top:1px">IDS</span>' : '')
          +'<span style="font-size:11px;color:var(--text-primary);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(iss.title||'Untitled issue')+'</span>'
          +'</div>';
      }).join('') : '<div style="padding:16px 0;text-align:center;color:var(--text-muted);font-size:12px"><i class="ph-thin ph-check-circle" style="font-size:20px;display:block;margin-bottom:6px;opacity:0.4"></i>No open issues</div>';
      const moreHtml = openIssues.length > 8 ? '<div style="padding-top:6px;font-size:11px;color:var(--text-muted);text-align:right">+'+(openIssues.length - 8)+' more</div>' : '';
      return '<div class="dash-card dash-col-3" style="cursor:pointer" onclick="navigateTo(\'issues\')">'
        +'<div class="dash-card-title" style="display:flex;align-items:center;justify-content:space-between"><span><i class="ph-thin ph-lightning"></i> Issues / IDS</span><span style="display:flex;align-items:center;gap:6px">'+countBadge+'<span '+OPN+'>OPEN ↗</span></span></div>'
        +issueRows+moreHtml+'</div>';
    })()}
  `;

  // Insert the dynamic cards after the static rocks card
  if (rocksCard) {
    rocksCard.insertAdjacentHTML('afterend', cardsHtml);
  } else {
    grid.innerHTML = cardsHtml;
  }

  // ── Dashboard agency KPI strip ──
  renderDashAgencyKPIs();
}

async function renderDashAgencyKPIs() {
  const el = document.getElementById('dash-test-mode');
  if (!el) return;

  try {
    const [prospects, campaigns] = await Promise.all([
      sbQuery('prospects', { select: 'status,estimated_deal_value', 'deleted_at': 'is.null', limit: 500 }),
      sbQuery('outreach_campaigns', { select: 'outreach_sent,opens,positive_replies,meetings_booked,shows,closes,pipeline_value,status', 'deleted_at': 'is.null', limit: 100 }),
    ]);

    const pArr = Array.isArray(prospects) ? prospects : [];
    const cArr = Array.isArray(campaigns) ? campaigns : [];

    const totalProspects = pArr.length;
    const wonClients     = pArr.filter(p => p.status === 'Won' || p.status === 'Active Client').length;
    const pipelineValue  = pArr.filter(p => !['Won','Active Client','Lost'].includes(p.status))
                              .reduce((s, p) => s + (Number(p.estimated_deal_value) || 0), 0);
    const totalSent      = cArr.reduce((s, c) => s + (Number(c.outreach_sent) || 0), 0);
    const totalMeetings  = cArr.reduce((s, c) => s + (Number(c.meetings_booked) || 0), 0);

    const pill = (label, val, clr) =>
      '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 14px">' +
        '<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted)">' + label + '</span>' +
        '<span style="font-size:15px;font-weight:800;color:' + clr + '">' + val + '</span>' +
      '</div>';

    el.innerHTML =
      '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:6px 10px;margin-bottom:14px;display:flex;align-items:center;justify-content:center;gap:4px;box-shadow:var(--shadow-xs);flex-wrap:wrap">' +
        pill('Prospects', totalProspects, 'var(--text-primary)') +
        '<span style="color:var(--border)">·</span>' +
        pill('Won', wonClients, 'var(--green)') +
        '<span style="color:var(--border)">·</span>' +
        pill('Pipeline', '£' + pipelineValue.toLocaleString(), 'var(--blue)') +
        '<span style="color:var(--border)">·</span>' +
        pill('Outreach', totalSent.toLocaleString(), 'var(--amber)') +
        '<span style="color:var(--border)">·</span>' +
        pill('Meetings', totalMeetings, 'var(--purple)') +
      '</div>';
  } catch {
    el.innerHTML = '';
  }
}

// Update nav to-do badge — only this week's active tasks (until Sunday 00:00)
function updateNavBadge() {
  const tasks = MC.allTasks || [];
  const now2 = new Date();
  const dSun = (7 - now2.getDay()) % 7 || 7;
  const sun = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate() + dSun);
  sun.setHours(0, 0, 0, 0);
  const sunMs = sun.getTime();
  const active = tasks.filter(t => {
    if (!['todo','in_progress','review'].includes((t.status||'').toLowerCase())) return false;
    if (!t.due_date) return true;
    return new Date(t.due_date).setHours(23,59,59,0) <= sunMs;
  }).length;
  const el = document.getElementById('nav-badge-tasks');
  if (el) { el.textContent = active; el.style.display = active > 0 ? '' : 'none'; }
  const mel = document.getElementById('mobile-tasks-badge');
  if (mel) { mel.textContent = active; mel.style.display = active > 0 ? '' : 'none'; }
}
