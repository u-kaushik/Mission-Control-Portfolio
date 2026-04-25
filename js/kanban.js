// Mission Control — Kanban board & task cards
// =============================================
// RENDER KANBAN BOARD
// =============================================
// Project ID → accent colour. Populated by loadProjects(), falls back to index-based palette.
// Keys are Supabase project UUIDs; values are CSS accent class names.
const PROJECT_ACCENT_PALETTE = ['accent-blue','accent-purple','accent-green','accent-amber','accent-orange'];

function accentForTask(task) {
  // rock_id is the only link now — project_id and goal_id removed from todos
  if (task.rock_id && MC.rocksMap && MC.rocksMap[task.rock_id]) {
    const rockIdx = Object.keys(MC.rocksMap).indexOf(task.rock_id);
    return PROJECT_ACCENT_PALETTE[rockIdx % PROJECT_ACCENT_PALETTE.length] || 'accent-gray';
  }
  return 'accent-gray';
}

const KANBAN_COLS = [
  { key: 'backlog',     label: 'BACKLOG',     dotColor: 'var(--purple)' },
  { key: 'todo',        label: 'THIS WEEK',   dotColor: 'var(--gray)' },
  { key: 'in_progress', label: 'DOING',       dotColor: 'var(--blue)' },
  { key: 'review',      label: 'REVIEW',      dotColor: 'var(--amber)' },
  { key: 'done',        label: 'DONE',        dotColor: 'var(--green)' },
  { key: 'blocked',     label: 'BLOCKED',     dotColor: 'var(--red)' },
];

function mapStatus(status) {
  if (!status) return 'todo';
  const s = status.toLowerCase().replace(/[-\s]/g, '_');
  if (s === 'backlog' || s === 'someday' || s === 'icebox' || s === 'future') return 'backlog';
  if (s === 'todo' || s === 'inbox' || s === 'pending' || s === 'new' || s === 'open') return 'todo';
  if (s === 'in_progress' || s === 'active' || s === 'started' || s === 'assigned') return 'in_progress';
  if (s === 'review' || s === 'in_review' || s === 'awaiting_review') return 'review';
  if (s === 'done' || s === 'complete' || s === 'completed' || s === 'closed') return 'done';
  if (s === 'blocked' || s === 'on_hold' || s === 'waiting') return 'blocked';
  return 'todo';
}

// effectiveStatus: wraps mapStatus — trust the DB status as-is.
function effectiveStatus(task) {
  return mapStatus(task.status);
}

const TAG_KEYWORDS = {
  video:         ['video','youtube','reel','film'],
  content:       ['content','blog','post','write','copy','article'],
  demo:          ['demo','showcase','preview'],
  research:      ['research','study','analysis','analyse','analyze','survey','audit'],
  docs:          ['documentation','docs','readme','guide','wiki'],
  design:        ['design','figma','ui','ux','mockup','wireframe','architect'],
  deploy:        ['deploy','launch','release','ship','infrastructure','production'],
  seo:           ['seo','keyword','search','ranking'],
  social:        ['social','twitter','instagram','linkedin','facebook'],
  email:         ['email','newsletter','campaign','outreach'],
  plan:          ['plan','roadmap','strategy','breakdown'],
  qa:            ['test','qa','quality','review','verify','check'],
  engineering:   ['implement','build','code','develop','engineer','feature'],
};

const TAG_STYLES = {
  video: 'orange', content: 'blue', demo: 'amber', research: 'purple',
  docs: '', design: 'purple', deploy: 'green', seo: 'blue',
  social: 'orange', email: 'amber', plan: 'amber', qa: 'blue', engineering: 'green',
};

function inferTags(task) {
  const text = ((task.title || '') + ' ' + (task.description || '') + ' ' + JSON.stringify(task.metadata||{})).toLowerCase();
  const tags = [];
  for (const [tag, kws] of Object.entries(TAG_KEYWORDS)) {
    if (kws.some(kw => text.includes(kw))) tags.push(tag);
  }
  return tags.slice(0, 3);
}

function renderKanban(tasks){
  MC.allTasks = tasks;
  // This-week cutoff: end of the upcoming work week (Sunday 00:00)
  // On weekdays: target this Sunday.  On weekends: target NEXT Sunday
  // so Sat/Sun previews the full upcoming Mon–Sun work week.
  const now = new Date();
  let daysUntilSun = (7 - now.getDay()) % 7 || 7;
  if (daysUntilSun < 2) daysUntilSun += 7; // Sat → look ahead to next-next Sun
  const nextSun = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSun);
  nextSun.setHours(0, 0, 0, 0);
  const weekCutoff = nextSun.getTime();
  const isThisWeek = t => {
    if (!t.due_date) return true;
    return new Date(t.due_date).setHours(23,59,59,0) <= weekCutoff;
  };
  const weekFilteredTasks = tasks.filter(isThisWeek);
  // Board shows ALL tasks; future todos auto-land in backlog
  const visibleTasks = S.showDone ? tasks : tasks.filter(t => effectiveStatus(t) !== 'done');
  const board = document.getElementById('kanban-board');
  const totalActive = weekFilteredTasks.filter(t => effectiveStatus(t) !== 'done').length;
  const urgent = weekFilteredTasks.filter(t => (t.priority || 0) >= 8).length;
  const weekCount = weekFilteredTasks.length;

  document.getElementById('queue-count').textContent = tasks.length;
  const qcm = document.getElementById('queue-count-mobile'); if (qcm) qcm.textContent = tasks.length;
  document.getElementById('fire-badge').innerHTML = `<i class="ph-thin ph-fire"></i> ${urgent}`;
  document.getElementById('active-badge').textContent = `${totalActive} active`;
  document.getElementById('hdr-tasks').textContent = tasks.length;

  const groups = {};
  KANBAN_COLS.forEach(c => groups[c.key] = []);
  visibleTasks.forEach(t => {
    let col = effectiveStatus(t);
    // Todos due beyond this week → show in backlog, not "this week"
    if (col === 'todo' && t.due_date && !isThisWeek(t)) col = 'backlog';
    if (groups[col]) groups[col].push(t);
  });

  board.innerHTML = KANBAN_COLS.map(col => {
    const colTasks = groups[col.key] || [];
    const cardsHtml = colTasks.length === 0
      ? `<div class="kanban-empty">No to-dos</div>`
      : colTasks.map(t => renderTaskCard(t, accentForTask(t))).join('');

    return `
      <div class="kanban-col">
        <div class="kanban-col-header">
          <div class="kanban-col-dot" style="background:${col.dotColor}"></div>
          <span class="kanban-col-title">${col.label}</span>
          <span class="kanban-col-count">${colTasks.length}</span>
        </div>
        <div class="kanban-cards">${cardsHtml}</div>
      </div>
    `;
  }).join('');

  // Re-apply selection state if select mode is active (safety net)
  if (MC.todoSelectMode && MC.selectedTodos.size > 0) {
    MC.selectedTodos.forEach(id => {
      const card = board.querySelector(`.task-card[data-task-id="${id}"]`);
      if (card) card.classList.add('selected');
    });
    _updateSelectBar();
  }
}


function capitalizeName(str) {
  if (!str) return str;
  // Capitalize first letter of each word for known agent names
  return str.replace(/(jarvis|quinn|archie|kai|iris|dash|sola|luna|echo|utkarsh)/gi,
    w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}
function renderTaskCard(task, accentClass) {
  const tags = inferTags(task);
  // assigned_to can be: array of UUIDs, array of name strings, or a plain string
  const assignedRaw = task.assigned_to;
  const assignedIds = Array.isArray(assignedRaw)
    ? assignedRaw
    : (assignedRaw ? [assignedRaw] : []);
  const agentName   = resolveAgentName(assignedIds[0]);
  const agentClr    = agentColor(agentName);
  const isUrgent      = (task.priority || 0) >= 8;
  const priorityHtml  = isUrgent ? '<span style="font-size:12px;flex-shrink:0;line-height:1"><i class="ph-thin ph-flag"></i></span>' : '';
  const title = task.title || 'Untitled Task';
  const desc  = task.description || '';

  // ── EOS Source badge ──
  const src = (task.todo_source || '').toLowerCase();
  const sourceLabel = src === 'ids' ? '<i class="ph-thin ph-lightning"></i> IDS' : src === 'rock' ? '<i class="ph-thin ph-mountains"></i> Rock' : src === 'admin' ? '<i class="ph-thin ph-gear-six"></i> Admin' : null;
  const sourceBadge = sourceLabel
    ? `<span class="todo-source-badge todo-source-${src}">${sourceLabel}</span>`
    : '';

  // ── Rock link (no breadcrumb, just R# pill in footer) ──
  const rockData = (MC.rocksMap && task.rock_id && MC.rocksMap[task.rock_id]) || null;
  const _rockNum = rockData && MC.allRocks ? (MC.allRocks.indexOf(rockData) + 1) || 0 : 0;
  const displayRockId = task.rock_id || '';
  const rockLabel = _rockNum ? `<i class="ph-thin ph-book-bookmark"></i> Q2 R${_rockNum}` : '';

  // ── Due date chip ──
  const isDone = effectiveStatus(task) === 'done';
  const dueDate  = task.due_date ? new Date(task.due_date) : null;
  const daysLeft = dueDate ? Math.round((dueDate.setHours(23,59,59,0) - Date.now()) / 86400000) : null;
  let dueLabel, dueClass;
  if (isDone) {
    const d = new Date(task.updated_at || task.created_at);
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    dueLabel = `<i class="ph-thin ph-check-circle"></i> Done ${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`;
    dueClass = 'task-due done';
  } else if (daysLeft === null) {
    dueLabel = relativeTime(task.updated_at || task.created_at);
    dueClass = 'task-due';
  } else if (daysLeft < 0) {
    dueLabel = `<i class="ph-thin ph-warning"></i> ${Math.abs(daysLeft)}d overdue`;
    dueClass = 'task-due overdue';
  } else if (daysLeft === 0) {
    dueLabel = '<i class="ph-thin ph-clock"></i> Due today';
    dueClass = 'task-due due-today';
  } else if (daysLeft === 1) {
    dueLabel = 'Due tomorrow';
    dueClass = 'task-due';
  } else {
    const d = new Date(task.due_date);
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    dueLabel = `Due ${dayNames[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth()+1}`;
    dueClass = 'task-due';
  }

  const tagsHtml = tags.map(tag =>
    `<span class="tag-pill ${TAG_STYLES[tag] || ''}">${tag.charAt(0).toUpperCase()+tag.slice(1)}</span>`
  ).join('');

  const taskDataAttr = `data-task-id="${escHtml(task.id || '')}"`;

  // Status dot for agent — use canonical getAgentLiveStatus()
  let agentDotHtml = '';
  if (agentName && agentName !== 'Unassigned') {
    const { si } = getAgentLiveStatus(agentName);
    const pulse = si.pulse ? 'animation:pulse-dot 2.5s ease-in-out infinite' : 'animation:none';
    agentDotHtml = `<span class="task-agent-dot" style="background:${si.dot};${pulse}"></span>`;
  }

  return `
    <div class="task-card ${accentClass}" ${taskDataAttr} onclick="onTaskCardClick(event, this)">
      <div class="select-check" onclick="event.stopPropagation();toggleTaskSelect(this.parentElement)"><i class="ph-bold ph-check"></i></div>
      <div class="task-card-top">
        <span class="task-title">${escHtml(capitalizeName(title))}</span>
      </div>
      <div class="task-footer">
        <div class="task-footer-row task-footer-main">
          <div class="task-agent">
            <div class="task-agent-avatar" data-agent-id="${assignedIds[0]||agentName}" style="background:var(--surface-2);color:var(--text-muted);cursor:pointer">${avatarInner(agentName)}</div>
            <span class="task-agent-name">${escHtml(agentName.charAt(0).toUpperCase()+agentName.slice(1))}</span>
            ${agentDotHtml}
          </div>
          <div class="task-card-meta">
            ${rockLabel ? `<span class="task-card-pill" data-rock-preview="${escHtml(displayRockId)}" onclick="event.stopPropagation();openRockPreviewPopup(event,'${escHtml(task.rock_id)}')">${rockLabel}</span>` : '<span class="task-card-pill">Ad hoc</span>'}
            <span class="${dueClass} task-card-due">${dueLabel}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}



function resolveAgentName(agentId) {
  if (!agentId) return 'Unassigned';
  // 1. UUID lookup in DB map
  if (MC.dbAgents[agentId]) return capitalize(MC.dbAgents[agentId].name);
  // 2. Name-string lookup in DB map (assigned_to stored as "kai" not UUID)
  const dbByName = Object.values(MC.dbAgents).find(a => a.name && a.name.toLowerCase() === agentId.toLowerCase());
  if (dbByName) return capitalize(dbByName.name);
  // 3. Fallback to hardcoded AGENTS by id or name
  const a = AGENTS.find(ag => ag.id === agentId.toLowerCase() || ag.name.toLowerCase() === agentId.toLowerCase());
  return a ? a.name : capitalize(agentId);
}

function renderKanbanEmpty() {
  const board = document.getElementById('kanban-board');
  document.getElementById('queue-count').textContent = '0';
  const qcm2 = document.getElementById('queue-count-mobile'); if (qcm2) qcm2.textContent = '0';
  document.getElementById('fire-badge').innerHTML = '<i class="ph-thin ph-fire"></i> 0';
  document.getElementById('active-badge').textContent = '0 active';
  document.getElementById('hdr-tasks').textContent = '0';
  board.innerHTML = KANBAN_COLS.map(col => `
    <div class="kanban-col">
      <div class="kanban-col-header">
        <div class="kanban-col-dot" style="background:${col.dotColor}"></div>
        <span class="kanban-col-title">${col.label}</span>
        <span class="kanban-col-count">0</span>
      </div>
      <div class="kanban-cards"><div class="kanban-empty">No to-dos yet</div></div>
    </div>
  `).join('');
}
