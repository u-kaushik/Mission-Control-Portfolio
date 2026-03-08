// Mission Control — Issues (EOS IDS) & New Todo modal
// =============================================
// ISSUES (EOS IDS WORKFLOW)
// =============================================
const STATIC_ISSUES = [
  {
    id: '__i1__',
    title: 'Content pipeline not running daily',
    description: 'Sola missing daily research trigger since Monday — no posts have gone out this week.',
    priority: 'high', status: 'open', raised_by: 'utkarsh',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: '__i2__',
    title: 'Kai blocked on API rate limits',
    description: 'OpenAI quota exceeded on dev account. Needs upgrading or separate key for agent use.',
    priority: 'medium', status: 'ids', raised_by: 'kai',
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '__i3__',
    title: 'Weekly Scorecard metrics not yet automated',
    description: 'Need to connect revenue and output metrics to dashboard — currently manual spreadsheet.',
    priority: 'low', status: 'open', raised_by: 'quinn',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString()
  },
];

let issueFilter = 'open';

async function loadIssues() {
  try {
    const issues = await sbQuery('issues', {
      select: 'id,title,description,priority,status,raised_by,rock_id,goal_id,created_at,updated_at',
      order: 'created_at.desc', limit: 100
    });
    MC.allIssues = Array.isArray(issues) ? issues : [];
  } catch (err) {
    // Table likely doesn't exist yet — use static fallback
    MC.allIssues = [];
  }
  renderIssues();
  updateIssuesBadge();
}

// ── Rocks (90-day Quarterly Priorities) ──

function updateIssuesBadge() {
  const openCount = MC.allIssues.filter(i => i.status === 'open' || i.status === 'ids').length;
  const badge = document.getElementById('nav-badge-issues');
  if (badge) { badge.textContent = openCount; badge.style.display = openCount > 0 ? '' : 'none'; }
}

function _renderIssuesStats() {
  const el = document.getElementById('issues-stats');
  if (!el) return;
  const all    = MC.allIssues || [];
  const open   = all.filter(i => i.status === 'open').length;
  const ids    = all.filter(i => i.status === 'ids').length;
  const solved = all.filter(i => i.status === 'solved').length;
  const high   = all.filter(i => (i.status === 'open' || i.status === 'ids') && i.priority === 'high').length;

  const stat = (label, val, color, icon) =>
    `<div class="rocks-stat-card">
      <div class="rocks-stat-label"><i class="ph-thin ${icon}"></i> ${label}</div>
      <div class="rocks-stat-value" style="color:${color}">${val}</div>
    </div>`;

  el.innerHTML =
    stat('Open', open, 'var(--red)', 'ph-warning-circle') +
    stat('In IDS', ids, 'var(--orange)', 'ph-chat-centered-dots') +
    stat('Solved', solved, 'var(--green)', 'ph-check-circle') +
    stat('High Priority', high, 'var(--amber)', 'ph-fire');
}

function _renderIssuesFilters() {
  const el = document.getElementById('issues-filter-row');
  if (!el) return;
  const all = MC.allIssues || [];
  const counts = {
    open: all.filter(i => i.status === 'open').length,
    ids: all.filter(i => i.status === 'ids').length,
    solved: all.filter(i => i.status === 'solved').length,
    all: all.length,
  };
  const colorMap = { open: 'var(--red)', ids: 'var(--orange)', solved: 'var(--green)' };
  const labelMap = { open: 'Open', ids: 'In IDS', solved: 'Solved', all: 'All' };
  el.innerHTML = _renderFilterPills(
    ['open', 'ids', 'solved', 'all'], counts, issueFilter, colorMap,
    f => "setIssueFilter('" + f + "')", labelMap
  );
}

function setIssueFilter(f) {
  issueFilter = f;
  _renderIssuesFilters();
  renderIssues();
}

function renderIssues() {
  const list = document.getElementById('issues-list');
  if (!list) return;

  _renderIssuesStats();
  _renderIssuesFilters();

  const filtered = issueFilter === 'all'
    ? MC.allIssues
    : MC.allIssues.filter(i => i.status === issueFilter);

  if (filtered.length === 0) {
    const emptyMsg = issueFilter === 'open' ? 'No open issues — great work!'
      : issueFilter === 'ids' ? 'Nothing currently in IDS.'
      : issueFilter === 'solved' ? 'No solved issues yet.'
      : 'No issues found.';
    list.innerHTML = `<div class="issue-empty"><span class="issue-empty-icon">${issueFilter === 'solved' ? '<i class="ph-thin ph-check-circle"></i>' : '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green)"></span>'}</span>${emptyMsg}</div>`;
    return;
  }

  list.innerHTML = filtered.map(issue => {
    const pClass    = `priority-${issue.priority || 'medium'}`;
    const statusKey = issue.status || 'open';
    const statusLabel = statusKey === 'ids' ? 'In IDS' : capitalize(statusKey);
    const statusClass = `issue-status-${statusKey}`;
    const raiser    = agentInfo(issue.raised_by) || { name: capitalize(issue.raised_by || 'Unknown'), emoji: '<i class="ph-thin ph-user"></i>', avatar: '', id: issue.raised_by || '' };
    const raisedColor = agentColor(issue.raised_by || 'unknown');
    const age       = relativeTime(issue.created_at);

    // Dept left-edge colour — mirrors Team page dept borders
    const _DEPT_CLR = {
      echo: 'var(--blue)', sola: 'var(--blue)', luna: 'var(--blue)',
      quinn: 'var(--green)', archie: 'var(--green)', kai: 'var(--green)', iris: 'var(--green)',
      dash: 'var(--orange)', penny: 'var(--orange)',
      jarvis: 'var(--purple)', utkarsh: 'var(--primary)',
    };
    const _agent = (issue.raised_by || issue.assigned_to || '').toLowerCase();
    const deptEdge = _DEPT_CLR[_agent] ? `border-left:3px solid ${_DEPT_CLR[_agent]};` : '';

    const actionsHtml = statusKey === 'open'
      ? `<button class="issue-action-btn ids-btn" onclick="advanceIssue('${escHtml(issue.id)}','ids')">IDS →</button>
         <button class="issue-action-btn solve-btn" onclick="advanceIssue('${escHtml(issue.id)}','solved')">✓ Solve</button>`
      : statusKey === 'ids'
      ? `<button class="issue-action-btn solve-btn" onclick="advanceIssue('${escHtml(issue.id)}','solved')">✓ Solve</button>`
      : `<span style="font-size:11px;color:var(--green);font-weight:600">✓ Solved</span>
         <button class="issue-action-btn" onclick="advanceIssue('${escHtml(issue.id)}','open')" style="background:var(--surface-2);color:var(--text-secondary);border-color:var(--border);margin-left:4px">↩ Re-open</button>`;

    // Mini avatar for raiser — clickable to open agent card
    const raiserAvatarHtml = raiser.avatar
      ? `<div class="issue-raiser-avatar" style="background:${raisedColor}18;cursor:pointer;position:relative" onclick="event.stopPropagation();openAgentModal('${escHtml(issue.raised_by||'')}')">
           <img src="${escHtml(raiser.avatar)}?v=${AVATAR_BUST}" alt="${escHtml(raiser.name)}" style="position:absolute;inset:0" onerror="_avErr(this)"><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:10px">${raiser.emoji}</span>
         </div>`
      : `<div class="issue-raiser-avatar" style="background:${raisedColor}18;color:${raisedColor};cursor:pointer" onclick="event.stopPropagation();openAgentModal('${escHtml(issue.raised_by||'')}')">
           <span style="font-size:10px">${raiser.emoji}</span>
         </div>`;

    return `<div class="issue-card ${pClass}" data-issue-id="${escHtml(issue.id||'')}" style="${deptEdge}">
      <div class="issue-card-body">
        <div class="issue-card-title">${escHtml(issue.title || 'Untitled Issue')}</div>
        ${issue.description ? `<div class="issue-card-desc">${escHtml(issue.description)}</div>` : ''}
        <div class="issue-card-meta">
          <span class="issue-status-badge ${statusClass}">${statusLabel}</span>
          <span style="display:flex;align-items:center;gap:5px">
            ${raiserAvatarHtml}
            <span style="color:${raisedColor};font-weight:600;font-size:11px">${escHtml(raiser.name)}</span>
          </span>
          <span>${age}</span>
        </div>
      </div>
      <div class="issue-card-actions">${actionsHtml}</div>
    </div>`;
  }).join('');

  // Scroll to pending issue if navigated from dashboard
  if (MC.pendingIssueId) {
    const pendId = MC.pendingIssueId;
    MC.pendingIssueId = null;
    // Find the issue and ensure correct filter tab is active
    const pendIssue = MC.allIssues.find(i => i.id === pendId);
    if (pendIssue) {
      const neededFilter = (pendIssue.status === 'ids' || pendIssue.status === 'solved') ? pendIssue.status : 'open';
      if (issueFilter !== neededFilter) {
        setIssueFilter(neededFilter);
        // After re-render, scroll
        setTimeout(() => {
          const el = list.querySelector(`[data-issue-id="${pendId}"]`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.transition = 'box-shadow 0.6s ease';
            el.style.boxShadow = '0 0 0 2px var(--primary)';
            setTimeout(() => {
              el.style.transition = 'box-shadow 1.5s ease';
              el.style.boxShadow = '';
            }, 1800);
          }
        }, 80);
        return;
      }
    }
    setTimeout(() => {
      const el = list.querySelector(`[data-issue-id="${pendId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'box-shadow 0.6s ease';
        el.style.boxShadow = '0 0 0 2px var(--primary)';
        setTimeout(() => {
          el.style.transition = 'box-shadow 1.5s ease';
          el.style.boxShadow = '';
        }, 1800);
      }
    }, 120);
  }
}

function advanceIssue(issueId, newStatus) {
  // Find issue in MC.allIssues
  const idx = MC.allIssues.findIndex(i => i.id === issueId);
  if (idx === -1) return;
  const issue = MC.allIssues[idx];
  const oldStatus = issue.status;
  issue.status = newStatus;
  renderIssues();
  updateIssuesBadge();

  // Try to persist to Supabase via PATCH
  if (!issueId.startsWith('__')) {
    fetch(`${SUPABASE_URL}/rest/v1/issues?id=eq.${issueId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ status: newStatus, updated_at: new Date().toISOString() }),
    }).catch(e => console.warn('[Issues] advanceIssue PATCH failed:', e));
  }

  // When solved: open pre-filled New To-Do modal (EOS IDS→To-Do birthplace)
  // Carry rock_id forward so the spawned To-Do inherits the EOS ancestry chain
  if (newStatus === 'solved') {
    setTimeout(() => {
      openNewTodoModal({
        prefill: {
          title:           issue.title,
          source:          'ids',
          linked_issue_id: issue.id,
          rock_id:         issue.rock_id || null,  // carry Rock lineage if issue had one
        }
      });
    }, 150); // brief delay so renderIssues animation settles
  }
}

function showReassignDialog(issueId, btn) {
  // Remove any existing reassign dialog
  document.querySelectorAll('.reassign-dialog').forEach(d => d.remove());

  const agents = [
    { id: 'jarvis', name: 'Jarvis' }, { id: 'quinn', name: 'Quinn' },
    { id: 'archie', name: 'Archie' }, { id: 'kai',   name: 'Kai'   },
    { id: 'iris',  name: 'Iris'  }, { id: 'dash',  name: 'Dash'  },
    { id: 'sola',  name: 'Sola'  }, { id: 'luna',  name: 'Luna'  },
    { id: 'echo',  name: 'Echo'  },
  ];

  const dialog = document.createElement('div');
  dialog.className = 'reassign-dialog';
  dialog.style.cssText = 'position:fixed;z-index:9999;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);box-shadow:0 4px 16px rgba(0,0,0,0.18);padding:6px;min-width:130px;display:flex;flex-direction:column;gap:2px';
  dialog.innerHTML = `<div style="padding:4px 8px;font-size:10px;font-weight:700;color:var(--text-muted);letter-spacing:0.05em;text-transform:uppercase">Route to</div>` +
    agents.map(a =>
      `<button onclick="reassignIssue('${issueId}','${a.id}');this.closest('.reassign-dialog').remove()"
        style="padding:6px 10px;background:none;border:none;text-align:left;cursor:pointer;font-size:12px;font-family:inherit;color:var(--text-primary);border-radius:4px;width:100%"
        onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='none'">${a.name}</button>`
    ).join('');

  const rect = btn.getBoundingClientRect();
  dialog.style.top  = (rect.bottom + 4) + 'px';
  dialog.style.left = rect.left + 'px';
  document.body.appendChild(dialog);

  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!dialog.contains(e.target)) {
        dialog.remove();
        document.removeEventListener('click', handler);
      }
    });
  }, 10);
}

async function reassignIssue(issueId, agentId) {
  const issue = MC.allIssues.find(i => i.id === issueId);
  if (issue) issue.assigned_to = agentId;
  renderIssues();

  if (!issueId.startsWith('__')) {
    fetch(`${SUPABASE_URL}/rest/v1/issues?id=eq.${issueId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SVC,
        'Authorization': `Bearer ${SUPABASE_SVC}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ assigned_to: agentId, updated_at: new Date().toISOString() }),
    }).catch(e => console.warn('[Issues] reassignIssue PATCH failed:', e));
  }
}

function openAddIssueModal() {
  _modalShow('add-issue-overlay');
  const titleInput = document.getElementById('issue-title-input');
  if (titleInput) titleInput.focus();
}

function closeAddIssueModal() {
  _modalHide('add-issue-overlay');
  // Clear inputs
  ['issue-title-input','issue-desc-input'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const pri = document.getElementById('issue-priority-input');
  if (pri) pri.value = 'medium';
}

async function submitIssue() {
  const title      = (document.getElementById('issue-title-input')?.value || '').trim();
  const desc       = (document.getElementById('issue-desc-input')?.value  || '').trim();
  const priority   = document.getElementById('issue-priority-input')?.value || 'medium';
  const assignedTo = document.getElementById('issue-assigned-input')?.value || 'jarvis';
  if (!title) { alert('Please enter an issue title.'); return; }

  const newIssue = {
    id: '__local_' + Date.now(),
    title, description: desc, priority,
    status: 'open', raised_by: 'utkarsh', assigned_to: assignedTo,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // POST to Supabase using service role key (guaranteed write)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/issues`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SVC,
        'Authorization': `Bearer ${SUPABASE_SVC}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ title, description: desc, priority, status: 'open', raised_by: 'utkarsh', assigned_to: assignedTo }),
    });
    if (res.ok) {
      const created = await res.json();
      if (Array.isArray(created) && created[0]) newIssue.id = created[0].id;
    }
  } catch (e) { console.warn('[Issues] submitIssue POST failed:', e); }

  MC.allIssues.unshift(newIssue);
  closeAddIssueModal();
  setIssueFilter('open');
  updateIssuesBadge();
}

// Issues filter pill clicks — now handled by setIssueFilter() via dynamic onclick buttons

// Escape key closes add-issue modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('add-issue-overlay');
    if (overlay && overlay.style.display !== 'none') closeAddIssueModal();
  }
});

// =============================================
// NEW TO-DO MODAL
// =============================================
let _todoSourceSelected = 'admin';
let _todoLinkedIssueId  = null;
let _todoLinkedRockId   = null; // rock_id carried from IDS solve or chosen in Rock source

function openNewTodoModal(opts = {}) {
  _modalShow('new-todo-overlay');
  // Reset form
  const titleEl = document.getElementById('todo-title-input');
  if (titleEl) titleEl.value = '';
  const agentEl = document.getElementById('todo-agent-input');
  if (agentEl) agentEl.value = 'utkarsh';
  const priEl = document.getElementById('todo-priority-input');
  if (priEl) priEl.value = '5';
  // Default due = today + 7
  const dueEl = document.getElementById('todo-due-input');
  if (dueEl) dueEl.value = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  // Reset linked ids
  _todoLinkedIssueId = null;
  _todoLinkedRockId  = null;
  // Handle prefill (from IDS solve flow)
  const prefill = opts.prefill || {};
  setTodoSource(prefill.source || 'admin');
  if (prefill.title && titleEl) titleEl.value = prefill.title;
  if (prefill.linked_issue_id) {
    _todoLinkedIssueId = prefill.linked_issue_id;
    const sel = document.getElementById('todo-linked-issue-input');
    if (sel) sel.value = prefill.linked_issue_id;
  }
  if (prefill.rock_id) {
    _todoLinkedRockId = prefill.rock_id;
  }
  setTimeout(() => titleEl && titleEl.focus(), 50);
}

function closeNewTodoModal() {
  _modalHide('new-todo-overlay');
  _todoSourceSelected = 'admin';
  _todoLinkedIssueId  = null;
  _todoLinkedRockId   = null;
}

function setTodoSource(src) {
  _todoSourceSelected = src || 'admin';
  // Update active class on source buttons
  document.querySelectorAll('.source-btn').forEach(btn => {
    const s = btn.dataset.source;
    btn.className = 'source-btn' + (s === _todoSourceSelected ? ' active-' + _todoSourceSelected : '');
  });
  // Show / hide linked rows
  const issueRow = document.getElementById('todo-linked-issue-row');
  const rockRow  = document.getElementById('todo-linked-rock-row');
  if (issueRow) issueRow.classList.toggle('visible', _todoSourceSelected === 'ids');
  if (rockRow)  rockRow.classList.toggle('visible',  _todoSourceSelected === 'rock');
  // Populate issue dropdown
  if (_todoSourceSelected === 'ids') {
    const sel = document.getElementById('todo-linked-issue-input');
    if (sel) {
      const issues = (typeof MC.allIssues !== 'undefined' ? MC.allIssues : []);
      sel.innerHTML = '<option value="">— No linked issue —</option>' +
        issues.map(i =>
          `<option value="${escHtml(String(i.id))}"${_todoLinkedIssueId === i.id ? ' selected' : ''}>${escHtml((i.title || 'Issue').slice(0, 60))}</option>`
        ).join('');
    }
  }
  // Populate rock/goal dropdown
  if (_todoSourceSelected === 'rock') {
    const sel = document.getElementById('todo-linked-rock-input');
    if (sel) {
      const goals = (MC.ppData && MC.ppData.goals && MC.ppData.goals.length > 0)
        ? MC.ppData.goals
        : (typeof STATIC_GOALS !== 'undefined' ? STATIC_GOALS : []);
      sel.innerHTML = '<option value="">— No linked Rock —</option>' +
        goals.map(g =>
          `<option value="${escHtml(String(g.id))}">${escHtml((g.title || 'Goal').slice(0, 60))}</option>`
        ).join('');
    }
  }
}

async function submitTodo() {
  const titleEl = document.getElementById('todo-title-input');
  const title   = (titleEl ? titleEl.value : '').trim();
  if (!title) {
    const hint = document.getElementById('todo-submit-hint');
    if (hint) { hint.textContent = 'Please enter a title.'; hint.style.color = 'var(--orange)'; }
    if (titleEl) titleEl.focus();
    return;
  }
  const hint = document.getElementById('todo-submit-hint');
  if (hint) { hint.textContent = 'Saving…'; hint.style.color = 'var(--text-muted)'; }

  const due      = document.getElementById('todo-due-input')?.value   || null;
  const agent    = document.getElementById('todo-agent-input')?.value  || 'utkarsh';
  const priority = parseInt(document.getElementById('todo-priority-input')?.value || '5', 10);
  const linkedIssueId = _todoSourceSelected === 'ids'
    ? (document.getElementById('todo-linked-issue-input')?.value || _todoLinkedIssueId || null)
    : null;
  // rock_id: from Rock source picker OR carried from parent Issue (IDS→To-Do chain)
  const linkedRockId = _todoSourceSelected === 'rock'
    ? (document.getElementById('todo-linked-rock-input')?.value || null)
    : (_todoLinkedRockId || null);
  const payload = {
    title,
    status:          'todo',
    priority,
    assigned_to:     agent,
    todo_source:     _todoSourceSelected,
    due_date:        due || null,
    linked_issue_id: linkedIssueId || null,
    rock_id:         linkedRockId  || null,  // FK → rocks.id
  };

  const tempId  = '__local_' + Date.now();
  const newTask = {
    ...payload,
    id:         tempId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Optimistic UI — add immediately and close
  MC.allTasks = [newTask, ...MC.allTasks];
  
  renderKanban(MC.allTasks);
  closeNewTodoModal();
  navigateTo('tasks');

  // Try Supabase POST in background
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/agency_todos`, {
      method:  'POST',
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation',
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const created = await res.json();
      if (Array.isArray(created) && created[0]) {
        // Replace temp task with DB task (preserves real id)
        const dbTask = created[0];
        const i = MC.allTasks.findIndex(t => t.id === tempId);
        if (i !== -1) {
          MC.allTasks[i] = { ...newTask, ...dbTask };
          
          renderKanban(MC.allTasks);
        }
      }
    }
  } catch (e) { console.warn('[Issues] submitTodo POST failed (columns may not exist yet):', e); }
}

// Escape closes new-todo modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('new-todo-overlay');
    if (overlay && overlay.style.display !== 'none') closeNewTodoModal();
  }
});

