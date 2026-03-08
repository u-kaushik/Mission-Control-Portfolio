// Mission Control — Goals, projects & rocks
// =============================================
// GOAL BANNER + PROJECTS
// =============================================

// Static fallback project from project.md (used when DB projects table is empty)
const STATIC_PROJECTS = [
  {
    id: '__p1__',
    name: 'Autonomous Social Content Machine',
    status: 'planning',
    description: 'Daily research → writing → approval → posting pipeline. Saves 10+ hrs/week, compounds reach.',
    _accent: 'accent-blue',
  }
];

// Static fallback goals from project.md (used when DB goals table is empty)
// status values match DB constraint: active | paused | blocked | completed | cancelled
const STATIC_GOALS = [
  { id: '__g1__', title: 'Goal 1.1: Research & Ideation Pipeline',     project_id: '__p1__', progress: 0, status: 'active', priority: 9, assigned_to: 'sola',  description: 'Daily SEO/keyword research. Sola returns 5-10 ideas/day to Echo for drafting.' },
  { id: '__g2__', title: 'Goal 1.2: Content Drafting & Images',         project_id: '__p1__', progress: 0, status: 'active', priority: 9, assigned_to: 'echo',  description: 'Echo drafts 3-5 pieces/day. Luna generates 2-3 Nano Banana images/day.' },
  { id: '__g3__', title: 'Goal 1.3: Approval & Editorial Flow',         project_id: '__p1__', progress: 0, status: 'paused', priority: 8, assigned_to: 'quinn', description: 'Quinn reviews drafts. Utkarsh approves via Telegram emoji reactions (<5 min/day).' },
  { id: '__g4__', title: 'Goal 1.4: Multi-Channel Publishing',          project_id: '__p1__', progress: 0, status: 'paused', priority: 8, assigned_to: 'dash',  description: 'Publish to blog, X, LinkedIn, Substack. Format transforms + optimal posting times.' },
  { id: '__g5__', title: 'Goal 1.5: Pipeline Coordination & Logging',   project_id: '__p1__', progress: 0, status: 'paused', priority: 7, assigned_to: 'quinn', description: 'Daily 6am UTC automation loop. Decision logging, weekly performance dashboard.' },
];

async function loadGoals() {
  try {
    const goals = await sbQuery('goals', {
      select: 'id,title,description,status,progress,priority,assigned_to,parent_goal_id',
      order: 'priority.desc,created_at.desc',
      limit: 20
    });
    // Overall progress = average across all active goals
    const active = Array.isArray(goals) ? goals.filter(g => g.status === 'active') : [];
    const avgPct = active.length
      ? Math.round(active.reduce((s, g) => s + (g.progress || 0), 0) / active.length)
      : 0;
    const wrap = document.getElementById('goal-progress-wrap');
    const fill = document.getElementById('goal-progress-fill');
    const pctEl = document.getElementById('goal-progress-pct');
    if (wrap && fill && pctEl && active.length > 0) {
      wrap.style.display = 'flex';
      fill.style.width = avgPct + '%';
      pctEl.textContent = avgPct + '%';
    }
  } catch (err) { console.warn('[Goals] loadGoals failed:', err); }
}

async function loadProjects() {
  try {
    const [goals, tasks] = await Promise.all([
      sbQuery('goals',    { select: 'id,title,description,status,progress,priority,assigned_to,parent_goal_id', order: 'priority.desc,created_at.asc', limit: 50 }).catch(e => { console.warn('[Projects] goals query failed:', e); return []; }),
      sbQuery('agency_todos',    { select: 'id,title,status,priority,assigned_to,rock_id,due_date,created_at', order: 'priority.desc,created_at.asc', limit: 200 }).catch(e => { console.warn('[Projects] todos query failed:', e); return []; }),
    ]);
    const projects = [];

    // projects table is dropped — always use static fallback
    const useProjects = STATIC_PROJECTS;
    MC.allProjects = useProjects;

    // Build accent map from static projects
    MC.projectAccentMap = {};
    useProjects.forEach((p, i) => {
      const accent = p._accent || PROJECT_ACCENT_PALETTE[i % PROJECT_ACCENT_PALETTE.length];
      MC.projectAccentMap[p.id] = accent;
    });

    // Use DB goals or static fallback; goals no longer carry project_id
    const dbGoals = (Array.isArray(goals) && goals.length > 0) ? goals : STATIC_GOALS;
    dbGoals.forEach((g, i) => {
      MC.projectAccentMap['goal:' + g.id] = PROJECT_ACCENT_PALETTE[i % PROJECT_ACCENT_PALETTE.length];
    });

    // Store for popout render
    MC.ppData = {
      projects: useProjects,
      goals: dbGoals,
      tasks: Array.isArray(tasks) ? tasks : []
    };

    // Re-render kanban with updated accent colours
    if (MC.allTasks.length > 0) renderKanban(MC.allTasks);

    // Re-render Projects page if currently viewing it
    if (MC.currentPage === 'projects') renderProjectsPage();

    return MC.ppData;
  } catch (err) {
    console.warn('loadProjects error:', err.message);
    return null;
  }
}

// ── Project Popout ────────────────────────────────────────────────────────

const STATUS_COLORS = {
  active:    { bg: 'var(--green-bg)',  color: 'var(--green)' },
  planning:  { bg: 'var(--blue-bg)',   color: 'var(--blue)' },
  paused:    { bg: 'var(--amber-bg)',  color: 'var(--amber)' },
  completed: { bg: 'var(--gray-bg)',   color: 'var(--gray)' },
  blocked:   { bg: 'var(--orange-bg)', color: 'var(--orange)' },
  backlog:   { bg: 'var(--purple-bg)',  color: 'var(--purple)' },
  todo:      { bg: 'var(--gray-bg)',   color: 'var(--gray)' },
  done:      { bg: 'var(--green-bg)',  color: 'var(--green)' },
  review:    { bg: 'var(--amber-bg)',  color: 'var(--amber)' },
  in_progress:{ bg:'var(--blue-bg)',   color: 'var(--blue)' },
};

const ACCENT_HEX = {
  'accent-blue':   'var(--blue)', 'accent-purple': 'var(--purple)',
  'accent-green':  'var(--green)', 'accent-amber':  'var(--amber)',
  'accent-orange': 'var(--amber)', 'accent-gray':   'var(--gray)',
};

function renderProjectPopout(data) {
  const body = document.getElementById('project-popout-body');
  if (!data) { body.innerHTML = `<div class="pp-empty">No data available</div>`; return; }
  const { projects, goals, tasks } = data;

  if (!goals.length && !tasks.length && !projects.length) {
    body.innerHTML = `<div class="pp-empty">No projects or goals yet — add them in Supabase.</div>`;
    return;
  }

  // Group goals by first letter of title (projects table dropped)
  const goalsByProject = { '__none__': goals };

  // Group tasks by rock_id (goal_id removed from todos)
  const tasksByGoal = {};
  tasks.forEach(t => {
    const key = t.rock_id || '__none__';
    if (!tasksByGoal[key]) tasksByGoal[key] = [];
    tasksByGoal[key].push(t);
  });

  const taskStatusDot = s => {
    const c = STATUS_COLORS[mapStatus(s)] || STATUS_COLORS.todo;
    return `<span class="pp-task-dot" style="background:${c.color}"></span>`;
  };

  let html = '';

  // ── Overall objective summary bar ──────────────────────────────────────
  const totalGoals     = goals.length;
  const totalTasks     = tasks.length;
  const totalDoneTasks = tasks.filter(t => effectiveStatus(t) === 'done').length;
  const overallPct     = totalGoals > 0
    ? Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / totalGoals)
    : 0;
  html += `
    <div class="pp-objective-summary">
      <div class="pp-objective-bar-bg">
        <div class="pp-objective-bar-fill" style="width:${overallPct}%"></div>
      </div>
      <div class="pp-objective-meta">
        ${overallPct}% overall · ${totalGoals} goal${totalGoals !== 1 ? 's' : ''} · ${totalDoneTasks}/${totalTasks} to-dos done
      </div>
    </div>
  `;

  // Render each project
  const renderProjects = projects.length > 0 ? projects : [{ id: '__none__', name: 'Unassigned Goals', status: 'active', _accent: 'accent-gray' }];
  renderProjects.forEach((p, pi) => {
    const accent   = MC.projectAccentMap[p.id] || PROJECT_ACCENT_PALETTE[pi % PROJECT_ACCENT_PALETTE.length];
    const hex      = ACCENT_HEX[accent] || 'var(--gray)';
    const sc       = STATUS_COLORS[p.status] || STATUS_COLORS.planning;
    // For static/fallback projects (__p1__, __none__), include all unassigned goals too.
    // For real DB projects, only include explicitly assigned goals.
    const pGoals = (p.id === '__none__' || p.id === '__p1__')
      ? [...(goalsByProject[p.id] || []), ...(goalsByProject['__none__'] || [])]
          .filter((g, i, arr) => arr.findIndex(x => x.id === g.id) === i) // dedup
      : (goalsByProject[p.id] || []);

    // Compute project-level progress from its goals + tasks
    const pGoalProgress = pGoals.length > 0
      ? Math.round(pGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / pGoals.length)
      : 0;
    const pAllTasks  = pGoals.flatMap(g => tasksByGoal[g.id] || []);
    const pDoneTasks = pAllTasks.filter(t => effectiveStatus(t) === 'done').length;

    const projId = `pp-proj-${pi}`;
    html += `
      <div class="pp-project">
        <div class="pp-project-header pp-collapsible" onclick="ppToggle('${projId}')">
          <span class="pp-chevron">▾</span>
          <div class="pp-project-dot" style="background:${hex}"></div>
          <span class="pp-project-status" style="background:${sc.bg};color:${sc.color}">${(p.status||'planning').toUpperCase()}</span>
          <span class="pp-project-name">${escHtml(p.name || 'Unnamed Project')}</span>
          <span class="pp-project-pct">${pGoalProgress}%</span>
        </div>
        <div class="pp-project-progress-row">
          <div class="pp-project-progress-bg">
            <div class="pp-project-progress-fill" style="width:${pGoalProgress}%;background:${hex}"></div>
          </div>
        </div>
        ${pAllTasks.length > 0 ? `<div class="pp-project-task-summary">${pDoneTasks}/${pAllTasks.length} to-dos done</div>` : ''}
        <div class="pp-goals-wrap" id="${projId}">
    `;

    if (pGoals.length === 0) {
      html += `<div style="padding:4px 0 8px 18px;font-size:11px;color:var(--text-muted);font-style:italic">No goals yet</div>`;
    } else {
      html += `<div class="pp-goals">`;
      pGoals.forEach((g, gi) => {
        const gc     = STATUS_COLORS[g.status] || STATUS_COLORS.planning;
        const pct    = Math.min(100, Math.max(0, g.progress || 0));
        const gTasks = tasksByGoal[g.id] || [];
        const doneT  = gTasks.filter(t => effectiveStatus(t) === 'done').length;
        const goalId = `pp-goal-${pi}-${gi}`;

        html += `
          <div class="pp-goal">
            <div class="pp-goal-top pp-collapsible" onclick="ppToggle('${goalId}')">
              ${gTasks.length > 0 ? `<span class="pp-chevron pp-chevron-sm">▾</span>` : '<span style="width:10px;flex-shrink:0"></span>'}
              <div class="pp-goal-dot" style="background:${hex}"></div>
              <span class="pp-goal-status" style="background:${gc.bg};color:${gc.color}">${(g.status||'active').toUpperCase()}</span>
              <span class="pp-goal-title">${escHtml(g.title || 'Unnamed Goal')}</span>
              <span class="pp-goal-pct-wrap">
                <span class="pp-goal-bar-bg"><span class="pp-goal-bar-fill" style="width:${pct}%;background:${hex}"></span></span>
                <span class="pp-goal-pct">${pct}%</span>
              </span>
            </div>
            <div class="pp-tasks-wrap" id="${goalId}">
        `;

        if (gTasks.length > 0) {
          html += `<div class="pp-tasks">`;
          gTasks.slice(0, 6).forEach(t => {
            const tc = STATUS_COLORS[effectiveStatus(t)] || STATUS_COLORS.todo;
            html += `<span class="pp-task-pill">${taskStatusDot(t.status)}${escHtml((t.title||'Task').slice(0,32))}${t.title && t.title.length > 32 ? '…' : ''}</span>`;
          });
          if (gTasks.length > 6) html += `<span class="pp-task-pill" style="color:var(--text-muted)">+${gTasks.length - 6} more</span>`;
          html += `</div>`;
        } else {
          html += `<div style="padding:2px 0 0 12px;font-size:10px;color:var(--text-muted)">No to-dos assigned</div>`;
        }

        html += `</div>`; // pp-tasks-wrap
        html += `</div>`; // pp-goal
      });
      html += `</div>`; // pp-goals
    }

    html += `</div>`; // pp-goals-wrap
    html += `</div>`; // pp-project
    if (pi < renderProjects.length - 1) html += `<div class="pp-divider"></div>`;
  });

  body.innerHTML = html;
}

async function openProjectPopout() {
  document.getElementById('project-popout-overlay').classList.add('open');
  const data = MC.ppData || await loadProjects();
  renderProjectPopout(data);
}

function closeProjectPopout() {
  document.getElementById('project-popout-overlay').classList.remove('open');
}

// Toggle collapse/expand for project goals or goal tasks
function ppToggle(id) {
  const wrap = document.getElementById(id);
  if (!wrap) return;
  wrap.classList.toggle('collapsed');
  const isCollapsed = wrap.classList.contains('collapsed');
  // Find the triggering .pp-collapsible that called this toggle
  // Walk up siblings within the parent to find .pp-collapsible with matching onclick
  const parent = wrap.parentElement;
  if (parent) {
    const trigger = parent.querySelector(`.pp-collapsible[onclick="ppToggle('${id}')"]`);
    if (trigger) trigger.classList.toggle('collapsed', isCollapsed);
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('project-popout-overlay').classList.contains('open')) {
    closeProjectPopout();
  }
});

// ── Projects Page Render ─────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
// ROCKS PAGE  (EOS 90-day Rocks, Milestones, Tactical To-Dos)
// ─────────────────────────────────────────────────────────────────────
let _allMilestones = [];
let _expandedRocks = new Set();

// Quarter colour families — each quarter owns a hue family; rocks get tonal variants
const Q_PALETTES = {
  1: { base: 'var(--red)', shades: ['var(--red)','var(--rose)','#b07095'] },   // Q1: rose/coral (muted)
  2: { base: 'var(--teal)', shades: ['var(--teal)','var(--cyan)','var(--green)'] },   // Q2: teal/emerald (muted)
};

// Returns accent hex for a rock given its quarter and its 0-based index within that quarter
function rockAccent(quarter, idxInQ) {
  const pal = Q_PALETTES[quarter];
  if (!pal) return 'var(--primary)';
  return pal.shades[idxInQ % pal.shades.length];
}

// Legacy map kept for non-quarter contexts (scorecard, dashboard strip)
// Will be rebuilt after rocks load — see loadRocks()
MC.rockAccent = {};

const Q_META = {
  1: { label: 'Q1 Launch Sprint', period: 'Feb 20 – Mar 31, 2026', target: '£3–4.5k MRR', pill: 'var(--blue)', emoji: '<i class="ph-thin ph-rocket"></i>' },
  2: { label: 'Q2 Scale Phase',   period: 'Apr 1 – Jun 30, 2026',  target: '£10k MRR',    pill: 'var(--teal)', emoji: '<i class="ph-thin ph-trend-up"></i>' },
};

async function loadRocks() {
  try {
    const [rocks, milestones] = await Promise.all([
      // Use service key to bypass RLS on agency rocks table
      sbQuery('agency_rocks', {
        select: 'id,title,description,status,progress,owner_id,quarter,year,due_date,created_at,updated_at',
        order: 'quarter.asc,created_at.asc',
        limit: 50
      }, true),
      (async () => {
        try {
          return await sbQuery('agency_milestones', {
            select: 'id,rock_id,title,due_date,status',
            order: 'due_date.asc', limit: 200
          }, true);
        } catch { return []; }
      })()
    ]);
    MC.allRocks = Array.isArray(rocks) ? rocks : [];
    _allMilestones = Array.isArray(milestones) ? milestones : [];
  } catch {
    MC.allRocks = [];
    _allMilestones = [];
  }
  MC.rocksMap = {};
  // Rebuild MC.rockAccent using quarter-family palettes
  const _qIdxCount = {};
  MC.allRocks.forEach((r, i) => {
    MC.rocksMap[r.id] = r;
    const q = r.quarter || 1;
    _qIdxCount[q] = (_qIdxCount[q] || 0);
    MC.rockAccent[i + 1] = rockAccent(q, _qIdxCount[q]);
    _qIdxCount[q]++;
  });
  if (MC.currentPage === 'projects') renderProjectsPage();
}

function renderProjectsPage() {
  const list = document.getElementById('rocks-list');
  const summaryBar = document.getElementById('rocks-summary-bar');
  if (!list) return;

  // Tabs use setRocksQ — already wired via onclick; ensure active state is current
  document.querySelectorAll('.rocks-q-tab').forEach(b => {
    const active = b.dataset.q === MC.rocksFilter;
    b.style.background = active ? 'var(--surface)' : 'none';
    b.style.color      = active ? 'var(--text-primary)' : 'var(--text-secondary)';
    b.style.boxShadow  = active ? 'var(--shadow-xs)' : 'none';
    b.classList.toggle('active', active);
  });

  const tasks = (MC.allTasks || []).filter(t => t.rock_id);
  const tasksByRock = {};
  tasks.forEach(t => {
    if (!tasksByRock[t.rock_id]) tasksByRock[t.rock_id] = [];
    tasksByRock[t.rock_id].push(t);
  });
  const milestonesByRock = {};
  _allMilestones.forEach(m => {
    if (!milestonesByRock[m.rock_id]) milestonesByRock[m.rock_id] = [];
    milestonesByRock[m.rock_id].push(m);
  });

  // Filter rocks
  const filtered = MC.rocksFilter === 'all'
    ? MC.allRocks
    : MC.allRocks.filter(r => String(r.quarter) === MC.rocksFilter);

  if (!MC.allRocks.length) {
    summaryBar.innerHTML = '';
    list.innerHTML = `<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">
      No rocks loaded yet.<br><span style="font-size:11px">Run the seed script or add rocks in Supabase.</span></div>`;
    return;
  }

  // ── Summary bar — stat card grid ─────────────────────────────────
  const quarters = MC.rocksFilter === 'all' ? [1, 2] : [parseInt(MC.rocksFilter)];
  summaryBar.innerHTML = quarters.map(q => {
    const qRocks = MC.allRocks.filter(r => r.quarter === q);
    const qMeta  = Q_META[q];
    const done   = qRocks.filter(r => r.status === 'complete').length;
    const onTrack = qRocks.filter(r => r.status === 'on_track').length;
    const atRisk  = qRocks.filter(r => r.status === 'at_risk' || r.status === 'off_track').length;
    const avgProg = qRocks.length ? Math.round(qRocks.reduce((s,r)=>s+(r.progress||0),0)/qRocks.length) : 0;

    const rStat = (label, value, color, icon) =>
      `<div class="rocks-stat-card">
        <div class="rocks-stat-label"><i class="ph-thin ${icon}"></i> ${label}</div>
        <div class="rocks-stat-value" style="color:${color}">${value}</div>
      </div>`;

    return `<div class="rocks-q-section">
      <div class="rocks-q-header">
        <span class="rocks-q-header-pill" style="background:${qMeta.pill}14;color:${qMeta.pill}">${qMeta.emoji} ${q === 1 ? 'Q1' : 'Q2'} — ${escHtml(qMeta.label)}</span>
        <span class="rocks-q-header-meta">${qMeta.period} · Target: ${escHtml(qMeta.target)}</span>
      </div>
      <div class="rocks-stat-grid">
        ${rStat('Avg Progress', avgProg + '%', 'var(--text-primary)', 'ph-chart-pie-slice')}
        ${rStat('On Track', onTrack, 'var(--green)', 'ph-check-circle')}
        ${rStat('At Risk', atRisk, 'var(--amber)', 'ph-warning')}
        ${rStat('Complete', done, 'var(--blue)', 'ph-flag-checkered')}
      </div>
    </div>`;
  }).join('');

  // ── Rock cards ────────────────────────────────────────────────────
  // Group by quarter for divider headers
  const byQ = {};
  filtered.forEach(r => {
    if (!byQ[r.quarter]) byQ[r.quarter] = [];
    byQ[r.quarter].push(r);
  });

  const html = Object.entries(byQ).map(([q, rocks]) => {
    const qNum  = parseInt(q);
    const qMeta = Q_META[qNum] || { label:`Q${q}`, period:'', pill:'var(--gray)', emoji:'<i class="ph-thin ph-mountains"></i>' };
    const showDivider = MC.rocksFilter === 'all';

    const divider = showDivider ? `
      <div class="rocks-q-section-header">
        <span class="rocks-q-section-pill" style="background:${qMeta.pill}18;color:${qMeta.pill}">${qMeta.emoji} ${qMeta.label}</span>
        <div class="rocks-q-section-line"></div>
        <span class="rocks-q-section-meta">${qMeta.period} · Target ${qMeta.target}</span>
      </div>` : '';

    const cards = rocks.map((rock, idx) => {
      const rockNum    = MC.allRocks.indexOf(rock) + 1;
      const accent     = rockAccent(rock.quarter || qNum, idx);
      const pct        = Math.min(100, Math.max(0, rock.progress || 0));
      const statusKey  = rock.status || 'on_track';
      const statusLabel = { on_track:'On Track', at_risk:'At Risk', off_track:'Off Track', complete:'Complete' }[statusKey] || statusKey;
      const owner      = agentInfo(rock.owner_id);
      const milestones = milestonesByRock[rock.id] || [];
      const rockTasks  = tasksByRock[rock.id] || [];
      const doneMiles  = milestones.filter(m => m.status === 'done').length;
      const totalMiles = milestones.length;
      const todoTasks  = rockTasks.filter(t => !['done','cancelled'].includes(effectiveStatus(t))).length;
      const doneRockTasks  = rockTasks.filter(t => ['done'].includes(effectiveStatus(t))).length;
      const totalRockTasks = rockTasks.length;
      const isExpanded = _expandedRocks.has(rock.id);
      const dueStr     = rock.due_date ? new Date(rock.due_date).toLocaleDateString('en-GB', {day:'numeric',month:'short'}) : '';
      const isOverdue  = rock.due_date && new Date(rock.due_date) < new Date() && statusKey !== 'complete';

      // Owner avatar
      const ownerHtml = owner
        ? `<div class="rock-card-owner-avatar" data-agent-id="${owner.id}" style="cursor:pointer"><img src="${owner.avatar}?v=${AVATAR_BUST}" alt="${owner.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;pointer-events:none" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span style="display:none;align-items:center;justify-content:center;width:100%;height:100%;font-size:9px;pointer-events:none">${owner.emoji}</span></div><span class="rock-card-owner-name">${owner.name}</span>`
        : `<span class="rock-card-owner-name" style="color:var(--text-muted)">${rock.owner_id || 'Unassigned'}</span>`;

      // Circular progress ring around rock number
      const circumf = 2 * Math.PI * 15.5; // radius 15.5 for 38px diameter
      const dashOffset = circumf - (circumf * pct / 100);
      const numRing = `<div class="rock-card-num-wrap">
        <svg class="rock-card-num-ring" viewBox="0 0 38 38">
          <circle class="ring-bg" cx="19" cy="19" r="15.5"/>
          <circle class="ring-fill" cx="19" cy="19" r="15.5" stroke="${accent}" stroke-dasharray="${circumf}" stroke-dashoffset="${dashOffset}"/>
        </svg>
        <div class="rock-card-num" style="background:${accent}10;color:${accent}">R${rockNum}</div>
      </div>`;

      // ── Expanded body content ──
      const milestonesHtml = milestones.length ? `<div class="rock-milestones-list">` + milestones.map(m => {
        const isPast = m.due_date && new Date(m.due_date) < new Date();
        const dateLabel = m.due_date ? new Date(m.due_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '';
        const checkClass = m.status === 'done' ? 'done' : m.status === 'in_progress' ? 'in_progress' : '';
        const checkIcon  = m.status === 'done' ? '\u2713' : m.status === 'in_progress' ? '\u25D5' : '';
        const overdueClass = isPast && m.status !== 'done' ? 'rock-milestone-overdue' : '';
        return `<div class="rock-milestone-row">
          <div class="rock-milestone-check ${checkClass}">${checkIcon}</div>
          <div class="rock-milestone-content">
            <div class="rock-milestone-text">${escHtml(m.title)}</div>
            ${dateLabel ? `<span class="rock-milestone-date ${overdueClass}">${dateLabel}</span>` : ''}
          </div>
        </div>`;
      }).join('') + `</div>` : `<div style="font-size:12px;color:var(--text-muted);font-style:italic">No milestones yet.</div>`;

      const parseDue = (v) => {
        if (!v) return Number.POSITIVE_INFINITY;
        const iso = new Date(v).getTime();
        if (Number.isFinite(iso)) return iso;
        // Fallback for UI-style dates like "7 Mar" / "21 Mar"
        const m = String(v).trim().match(/^(\d{1,2})\s+([A-Za-z]{3,})$/);
        if (m) {
          const months = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
          const mm = months[m[2].slice(0,3).toLowerCase()];
          if (mm !== undefined) {
            const y = new Date().getFullYear();
            return new Date(y, mm, Number(m[1])).getTime();
          }
        }
        return Number.POSITIVE_INFINITY;
      };
      const sortedRockTasks = [...rockTasks].sort((a,b) => {
        const ad = parseDue(a?.due_date);
        const bd = parseDue(b?.due_date);
        if (ad !== bd) return ad - bd;
        const ap = Number(a?.priority || 99);
        const bp = Number(b?.priority || 99);
        if (ap !== bp) return ap - bp;
        return new Date(a?.created_at || 0).getTime() - new Date(b?.created_at || 0).getTime();
      });

      const tasksHtml = sortedRockTasks.length ? sortedRockTasks.slice(0, 12).map(t => {
        const tStatus = (t.status||'todo').toLowerCase();
        const dotColor = tStatus === 'done' ? 'var(--green)' : tStatus === 'in_progress' ? 'var(--blue)' : tStatus === 'blocked' ? 'var(--orange)' : 'var(--border)';
        const tAgent = agentInfo(t.assigned_to);
        const dueDate = t.due_date ? new Date(t.due_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '';
        const tAvatar = tAgent ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;overflow:hidden;background:${agentColor(tAgent.id)}18;flex-shrink:0;position:relative">${tAgent.avatar ? `<img src="${tAgent.avatar}?v=${AVATAR_BUST}" alt="${tAgent.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0" onerror="this.style.display='none';var s=this.nextElementSibling;if(s)s.style.display='flex'"><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:9px">${tAgent.emoji}</span>` : tAgent.emoji}</span>` : '';
      return `<div class="rock-task-row">
          <div class="rock-task-dot" style="background:${dotColor}"></div>
          <span class="rock-task-title">${escHtml((t.title||'').slice(0,60))}${(t.title||'').length>60?'…':''}</span>
          ${tAgent ? `<span class="rock-task-agent" style="display:inline-flex;align-items:center;gap:3px">${tAvatar}<span>${tAgent.name}</span></span>` : ''}
          ${dueDate ? `<span class="rock-task-due">${dueDate}</span>` : ''}
        </div>`;
      }).join('') + (sortedRockTasks.length > 12 ? `<div style="font-size:11px;color:var(--text-muted);padding:4px 10px">+${sortedRockTasks.length-12} more to-dos</div>` : '')
      : `<div style="font-size:12px;color:var(--text-muted);font-style:italic">No to-dos linked to this rock.</div>`;

      const measurable = rock.measurable || rock.description || '';
      const proofText  = rock.profit_proof || '';

      // Status icons for badge
      const statusIcons = { on_track:'\u2713', at_risk:'\u26A0', off_track:'\u2716', complete:'\u2605' };
      const statusIcon = statusIcons[statusKey] || '';

      return `<div class="rock-card${isExpanded ? ' expanded' : ''}" id="rock-card-${rock.id}" style="--rock-accent:${accent}">
        <!-- Full-height accent strip -->
        <div class="rock-card-strip" style="background:${accent}"></div>
        <!-- Card content -->
        <div class="rock-card-content">
        <!-- Header row -->
        <div class="rock-card-header"
             onclick="toggleRockCard('${rock.id}')">
          ${numRing}
          <div class="rock-card-title-block">
            <div class="rock-card-title">${escHtml(rock.title.replace(/^Rock \d+: /, ''))}</div>
            ${measurable ? `<div class="rock-card-measurable">${escHtml(measurable)}</div>` : ''}
            <div class="rock-card-owner">
              ${ownerHtml}
              ${milestones.length || totalRockTasks > 0 ? `<span class="rock-card-counts">` +
                (milestones.length ? `<i class="ph-thin ph-flag-checkered"></i> ${doneMiles}/${totalMiles}` : '') +
                (milestones.length && totalRockTasks > 0 ? `<span class="rock-card-counts-sep">&middot;</span>` : '') +
                (totalRockTasks > 0 ? `<i class="ph-thin ph-check-circle"></i> ${doneRockTasks}/${totalRockTasks}` : '') +
              `</span>` : ''}
            </div>
          </div>
          <div class="rock-card-right">
            <span class="rock-card-due${isOverdue?' rock-milestone-overdue':''}">${dueStr}</span>
            <span class="rock-card-status-badge rock-status-${statusKey}">${statusIcon ? `<span style="font-size:9px">${statusIcon}</span> ` : ''}${statusLabel}</span>
            <span class="rock-card-chevron">\u203A</span>
          </div>
        </div>
        <!-- Expanded detail body -->
        <div class="rock-card-body">
          <div class="rock-body-inner">
            ${measurable ? `<div class="rock-section" style="--rock-accent:${accent}">
              <div class="rock-section-label"><i class="ph-thin ph-target"></i> Measurable</div>
              <div class="rock-measurable">${escHtml(measurable)}</div>
            </div>` : ''}
            ${proofText ? `<div class="rock-section" style="--rock-accent:${accent}">
              <div class="rock-section-label"><i class="ph-thin ph-lightbulb"></i> Why it matters</div>
              <div class="rock-proof-text">${escHtml(proofText)}</div>
            </div>` : ''}
            <div class="rock-section" style="--rock-accent:${accent}">
              <div class="rock-section-label"><i class="ph-thin ph-flag-checkered"></i> Milestones <span style="font-weight:500;opacity:0.7">${doneMiles}/${totalMiles}</span></div>
              ${milestonesHtml}
            </div>
            <div class="rock-section" style="--rock-accent:${accent}">
              <div class="rock-section-label"><i class="ph-thin ph-check-circle"></i> Tactical To-Dos <span style="font-weight:500;opacity:0.7">${doneRockTasks}/${totalRockTasks}</span></div>
              <div class="rock-task-list">${tasksHtml}</div>
            </div>
          </div>
        </div>
        </div><!-- /rock-card-content -->
      </div>`;
    }).join('');

    return divider + cards;
  }).join('');

  list.innerHTML = html || `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">No rocks match this filter.</div>`;
}

function toggleRockCard(rockId) {
  if (_expandedRocks.has(rockId)) {
    _expandedRocks.delete(rockId);
  } else {
    _expandedRocks.add(rockId);
  }
  const card = document.getElementById(`rock-card-${rockId}`);
  if (card) card.classList.toggle('expanded', _expandedRocks.has(rockId));
}

function navigateToRock(rockId) {
  navigateTo('projects');
  setTimeout(() => {
    if (!_expandedRocks.has(rockId)) {
      _expandedRocks.add(rockId);
      const card = document.getElementById('rock-card-' + rockId);
      if (card) {
        card.classList.add('expanded');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, 150);
}

function closeRockDrawer() {
  const overlay = document.getElementById('rock-drawer-overlay');
  const drawer  = document.getElementById('rock-drawer');
  if (overlay) overlay.style.display = 'none';
  if (drawer)  drawer.style.display  = 'none';
}

