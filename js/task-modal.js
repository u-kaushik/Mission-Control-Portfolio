// Mission Control — Task card expanded modal & todo select mode
// =============================================
// TASK CARD EXPANDED MODAL
// =============================================
const ACCENT_COLORS = {
  'accent-blue':   'var(--blue)',
  'accent-amber':  'var(--amber)',
  'accent-green':  'var(--green)',
  'accent-orange': 'var(--amber)',
  'accent-gray':   'var(--gray)',
};

const STATUS_STYLES = {
  backlog:     { bg: 'var(--purple-bg)', color: 'var(--purple)', label: 'BACKLOG' },
  todo:        { bg: 'var(--gray-bg)',    color: 'var(--gray)',   label: 'TODO' },
  in_progress: { bg: 'var(--blue-bg)',    color: 'var(--blue)',   label: 'IN PROGRESS' },
  review:      { bg: 'var(--amber-bg)',   color: 'var(--amber)',  label: 'REVIEW' },
  done:        { bg: 'var(--green-bg)',   color: 'var(--green)',  label: 'DONE' },
  blocked:     { bg: 'var(--orange-bg)',  color: 'var(--orange)', label: 'BLOCKED' },
};

// Open task card modal directly by task ID (generic, no back button)
function openCardModalById(taskId) {
  const task = MC.allTasks.find(t => t.id === taskId);
  if (!task) return;
  const proxy = document.createElement('div');
  proxy.dataset.taskId = taskId;
  proxy.classList.add(accentForTask(task));
  document.getElementById('card-modal-back').style.display = 'none';
  openCardModal(proxy);
}

// Open task card modal from inside an agent modal — keeps agent modal open, shows back button
function openCardModalFromAgent(taskId) {
  // Look in MC.allTasks first (loaded by Tasks page), then fall back to agent modal's own fetched tasks
  let task = MC.allTasks.find(t => t.id === taskId);
  if (!task) {
    // Agent modal fetches tasks from Supabase that may not be in MC.allTasks yet — merge them in
    const agentTasks = (MC.agentModalData || {}).tasks || [];
    task = agentTasks.find(t => t.id === taskId);
    if (task) {
      // Merge into MC.allTasks so openCardModal can find it
      if (!MC.allTasks.find(t => t.id === taskId)) {
        MC.allTasks = [...MC.allTasks, task];
        
      }
    }
  }
  if (!task) return;
  const proxy = document.createElement('div');
  proxy.dataset.taskId = taskId;
  proxy.classList.add(accentForTask(task));
  // Show back button
  document.getElementById('card-modal-back').style.display = '';
  openCardModal(proxy);
}

// Close card modal and return to agent modal (back button handler)
function closeCardModalBackToAgent() {
  closeCardModal();
  // Agent modal should still be open underneath — if not, re-open it
  if (!MC.agentModalOpen && MC.currentAgentId) {
    openAgentModal(MC.currentAgentId);
  }
}

// Extract displayable links from task metadata
function _extractTaskLinks(task) {
  const links = [];
  const seen = new Set();
  const meta = task.metadata || {};

  // 1. Explicit links array (agents can write metadata.links = [{url, label, type}])
  if (Array.isArray(meta.links)) {
    for (const lk of meta.links) {
      if (lk.url && !seen.has(lk.url)) {
        seen.add(lk.url);
        links.push({ url: lk.url, label: lk.label || _linkLabel(lk.url), icon: _linkIcon(lk.type || lk.url) });
      }
    }
  }

  // 2. Known URL fields in metadata (agents write these as flat keys)
  const knownUrlKeys = {
    brief_doc_url:      'Brief',
    research_sheet_url: 'Research Sheet',
    spec_url:           'Spec',
    design_url:         'Design',
    pr_url:             'Pull Request',
    doc_url:            'Document',
    sheet_url:          'Sheet',
  };
  for (const [key, label] of Object.entries(knownUrlKeys)) {
    const url = meta[key];
    if (url && !seen.has(url)) { seen.add(url); links.push({ url, label, icon: _linkIcon(url) }); }
  }

  // 3. Auto-detect URLs from text metadata fields
  const textFields = [meta.jarvis_instructions, meta.original_request, task.description].filter(Boolean);
  const urlRe = /https?:\/\/[^\s"'<>)\]]+/g;
  for (const text of textFields) {
    for (const match of text.matchAll(urlRe)) {
      const url = match[0].replace(/[.,;:!?]+$/, ''); // strip trailing punctuation
      if (!seen.has(url)) { seen.add(url); links.push({ url, label: _linkLabel(url), icon: _linkIcon(url) }); }
    }
  }
  return links;
}

function _linkIcon(urlOrType) {
  const s = (urlOrType || '').toLowerCase();
  if (s === 'github' || s.includes('github.com'))  return '<i class="ph-thin ph-github-logo"></i>';
  if (s === 'figma' || s.includes('figma.com'))    return '<i class="ph-thin ph-figma-logo"></i>';
  if (s === 'doc' || s.includes('docs.google'))    return '<i class="ph-thin ph-file-text"></i>';
  if (s.includes('sheets.google') || s === 'sheet') return '<i class="ph-thin ph-table"></i>';
  if (s.includes('drive.google') || s === 'drive')  return '<i class="ph-thin ph-google-drive-logo"></i>';
  if (s.includes('notion.'))                         return '<i class="ph-thin ph-notepad"></i>';
  if (s.includes('supabase'))                        return '<i class="ph-thin ph-database"></i>';
  return '<i class="ph-thin ph-link"></i>';
}

function _linkLabel(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    // Short labels for known domains
    if (host.includes('github.com')) {
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) return parts.slice(-2).join('/');
    }
    if (host.includes('figma.com')) return 'Figma design';
    if (host.includes('docs.google.com')) return 'Google Doc';
    if (host.includes('sheets.google.com')) return 'Google Sheet';
    // Fallback: hostname + short path
    const path = u.pathname.length > 20 ? u.pathname.slice(0, 18) + '...' : u.pathname;
    return host + (path !== '/' ? path : '');
  } catch { return url.slice(0, 30); }
}

function openCardModal(cardEl) {
  const taskId = cardEl.dataset.taskId;
  const task = MC.allTasks.find(t => t.id === taskId);
  if (!task) return;

  const accentClass = [...cardEl.classList].find(c => c.startsWith('accent-')) || 'accent-gray';
  const accentColor = ACCENT_COLORS[accentClass] || 'var(--gray)';

  const assignedRaw2 = task.assigned_to;
  const assignedIds = Array.isArray(assignedRaw2) ? assignedRaw2 : (assignedRaw2 ? [assignedRaw2] : []);
  const agentName   = resolveAgentName(assignedIds[0]);
  const agentClr    = agentColor(agentName);
  const isUrgentModal = (task.priority || 0) >= 8;
  const priorityLabel = isUrgentModal ? '<i class="ph-thin ph-flag"></i> Urgent' : 'Standard';
  const priorityClr   = isUrgentModal ? 'var(--text-primary)' : 'var(--text-muted)';

  const status   = effectiveStatus(task);
  const statusSt = STATUS_STYLES[status] || STATUS_STYLES.todo;
  const title    = task.title || 'Untitled Task';
  const desc     = task.description || '';
  // Extract 1-liner: first sentence or first 120 chars
  const liner = desc ? (desc.split(/[.\n]/)[0].trim() || desc.slice(0, 120)) : '';
  const tags   = inferTags(task);
  const time   = relativeTime(task.updated_at || task.created_at);
  const created = task.created_at ? new Date(task.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—';

  // Populate modal
  document.getElementById('card-modal-priority').innerHTML = isUrgentModal ? '<i class="ph-thin ph-flag"></i>' : '';
  document.getElementById('card-modal-title').textContent = capitalizeName(title);
  const linerEl = document.getElementById('card-modal-liner');
  linerEl.textContent = liner;
  linerEl.style.display = liner ? '' : 'none';

  // Get agent status for the modal — canonical getAgentLiveStatus()
  const { si: agentSI } = getAgentLiveStatus(agentName);

  // ── EOS fields for modal ──
  const modalSrc = (task.todo_source || '').toLowerCase();
  const modalSrcLabel = modalSrc === 'ids' ? '<i class="ph-thin ph-lightning"></i> IDS' : modalSrc === 'rock' ? '<i class="ph-thin ph-mountains"></i> Rock' : modalSrc === 'admin' ? '<i class="ph-thin ph-gear-six"></i> Admin' : null;
  const rockId = task.rock_id || null;
  const rockPreviewData = (rockId && MC.rocksMap) ? MC.rocksMap[rockId] : null;
  const modalSrcHtml = modalSrcLabel
    ? (modalSrc === 'rock' && rockPreviewData
        ? `<span class="todo-source-badge todo-source-${modalSrc}" style="cursor:pointer;text-decoration:underline dotted" onclick="openRockPreviewPopup(event,'${escHtml(rockId)}')">${modalSrcLabel} ↗</span>`
        : `<span class="todo-source-badge todo-source-${modalSrc}">${modalSrcLabel}</span>`)
    : `<span style="color:var(--text-muted)">—</span>`;

  const modalDue = task.due_date ? new Date(task.due_date) : null;
  const modalDaysLeft = modalDue ? Math.round((new Date(task.due_date).setHours(23,59,59,0) - Date.now()) / 86400000) : null;
  const modalDueStr = modalDue ? modalDue.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' }) : null;
  let modalDueHtml;
  if (!modalDueStr) {
    modalDueHtml = `<span style="color:var(--text-muted)">No due date</span>`;
  } else if (modalDaysLeft < 0) {
    modalDueHtml = `<span><i class="ph-thin ph-warning"></i> ${modalDueStr} (${Math.abs(modalDaysLeft)}d overdue)</span>`;
  } else if (modalDaysLeft === 0) {
    modalDueHtml = `<span><i class="ph-thin ph-clock"></i> Today — ${modalDueStr}</span>`;
  } else {
    modalDueHtml = `<span>${modalDueStr} (${modalDaysLeft}d left)</span>`;
  }

  document.getElementById('card-modal-meta').innerHTML = `
    <div class="card-modal-meta-row">
      <span class="card-modal-meta-label">Agent</span>
      <span class="card-modal-meta-value">
        <div class="card-modal-agent-avatar" data-agent-id="${assignedIds[0]||agentName}" style="background:var(--surface-2);color:var(--text-muted);cursor:pointer">${avatarInner(agentName)}</div>
        <span class="card-modal-agent-name">${escHtml(agentName)}</span>
        <div style="width:5px;height:5px;border-radius:50%;background:${agentSI.dot};flex-shrink:0"></div>
        <span style="font-size:10px;font-weight:600;color:var(--text-muted)">${agentSI.label}</span>
      </span>
    </div>
    <div class="card-modal-meta-row">
      <span class="card-modal-meta-label">Source</span>
      <span class="card-modal-meta-value">${modalSrcHtml}</span>
    </div>
    <div class="card-modal-meta-row">
      <span class="card-modal-meta-label">Due</span>
      <span class="card-modal-meta-value">${modalDueHtml}</span>
    </div>
    <div class="card-modal-meta-row">
      <span class="card-modal-meta-label">Priority</span>
      <span class="card-modal-meta-value">${priorityLabel}</span>
    </div>
  `;

  const tagsEl = document.getElementById('card-modal-tags');
  if (tags.length > 0) {
    tagsEl.innerHTML = tags.map(tag => `<span class="tag-pill ${TAG_STYLES[tag] || ''}">${tag}</span>`).join('');
    tagsEl.style.display = '';
  } else {
    tagsEl.innerHTML = '';
    tagsEl.style.display = 'none';
  }

  // ── Links section ──
  const linksEl = document.getElementById('card-modal-links');
  const taskLinks = _extractTaskLinks(task);
  if (taskLinks.length > 0) {
    linksEl.innerHTML = `
      <div class="card-modal-links-label">Links</div>
      <div class="card-modal-links-list">
        ${taskLinks.map(lk => `<a href="${escHtml(lk.url)}" target="_blank" rel="noopener" class="card-modal-link-pill" onclick="event.stopPropagation()">${lk.icon} ${escHtml(lk.label)}</a>`).join('')}
      </div>`;
    linksEl.style.display = '';
  } else {
    linksEl.innerHTML = '';
    linksEl.style.display = 'none';
  }

  var _cmFooter = document.getElementById('card-modal-footer');
  _cmFooter.innerHTML = '';
  _cmFooter.style.display = 'none';

  document.getElementById('card-modal-overlay').style.zIndex = ++MC.modalZTop;
  document.getElementById('card-modal-overlay').classList.add('open');
}

function closeCardModal() {
  document.getElementById('card-modal-overlay').classList.remove('open');
  document.getElementById('card-modal-back').style.display = 'none';
}

document.getElementById('card-modal-close').addEventListener('click', closeCardModal);
document.getElementById('card-modal-backdrop').addEventListener('click', closeCardModal);

// ── Todo select mode: multi-select & bulk delete ──────────────────────

function onTaskCardClick(event, cardEl) {
  if (MC.todoSelectMode) {
    toggleTaskSelect(cardEl);
  } else {
    openCardModal(cardEl);
  }
}

function toggleTodoSelectMode() {
  MC.todoSelectMode = !MC.todoSelectMode;
  MC.selectedTodos.clear();
  document.body.classList.toggle('todo-select-mode', MC.todoSelectMode);
  document.querySelectorAll('.task-card.selected').forEach(c => c.classList.remove('selected'));
  _updateSelectBar();
  const btn = document.getElementById('btn-todo-select');
  if (MC.todoSelectMode) {
    // Pause auto-refresh so board doesn't re-render while selecting
    if (MC.pollTimer) { clearInterval(MC.pollTimer); MC.pollTimer = null; }
    btn.innerHTML = '<i class="ph-thin ph-x"></i> Cancel';
    btn.style.background = 'var(--red)'; btn.style.color = '#fff';
  } else {
    // Resume polling
    restartPolling();
    btn.innerHTML = '<i class="ph-thin ph-check-square"></i> Select';
    btn.style.background = 'var(--surface-2)'; btn.style.color = 'var(--text-primary)';
  }
}

function toggleTaskSelect(cardEl) {
  const id = cardEl.dataset.taskId;
  if (!id || id.startsWith('__')) return; // skip demo tasks
  if (MC.selectedTodos.has(id)) {
    MC.selectedTodos.delete(id);
    cardEl.classList.remove('selected');
  } else {
    MC.selectedTodos.add(id);
    cardEl.classList.add('selected');
  }
  _updateSelectBar();
}

function todoSelectAll() {
  const cards = document.querySelectorAll('.task-card[data-task-id]');
  const allSelected = MC.selectedTodos.size > 0 && MC.selectedTodos.size === cards.length;
  if (allSelected) {
    // Deselect all
    MC.selectedTodos.clear();
    cards.forEach(c => c.classList.remove('selected'));
  } else {
    cards.forEach(c => {
      const id = c.dataset.taskId;
      if (id && !id.startsWith('__')) {
        MC.selectedTodos.add(id);
        c.classList.add('selected');
      }
    });
  }
  _updateSelectBar();
}

function _updateSelectBar() {
  const count = MC.selectedTodos.size;
  document.getElementById('sel-count').textContent = count;
  document.getElementById('sel-delete-btn').disabled = count === 0;
  // Update select all button text
  const cards = document.querySelectorAll('.task-card[data-task-id]');
  const allBtn = document.querySelector('.sel-all-btn');
  if (allBtn) {
    allBtn.textContent = (count > 0 && count >= cards.length) ? 'Deselect All' : 'Select All';
  }
}

function todoDeleteSelected() {
  const count = MC.selectedTodos.size;
  if (count === 0) return;
  document.getElementById('todo-delete-msg').innerHTML =
    `This will permanently delete <strong>${count}</strong> to-do${count > 1 ? 's' : ''} from Supabase. This cannot be undone.`;
  document.getElementById('todo-delete-dialog').classList.add('open');
}

function closeTodoDeleteDialog() {
  document.getElementById('todo-delete-dialog').classList.remove('open');
}

async function confirmTodoDelete() {
  const btn = document.getElementById('btn-confirm-delete');
  const ids = [...MC.selectedTodos];
  btn.disabled = true;
  btn.innerHTML = '<i class="ph-thin ph-spinner"></i> Deleting...';
  try {
    // Delete all selected todos from Supabase in parallel
    await Promise.all(ids.map(id => sbDelete('agency_todos', id)));
    console.log(`🗑️ Deleted ${ids.length} todo(s) from Supabase`);
    closeTodoDeleteDialog();
    toggleTodoSelectMode();
    // Reload the kanban
    await loadTasks();
  } catch (err) {
    console.error('Delete failed:', err);
    showToast('Failed to delete task');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ph-thin ph-trash"></i> Delete';
  }
}

// Rock preview popup
function openRockPreviewPopup(evt,rockId){
  evt.stopPropagation();closeRockPreviewPopup();
  const rock=MC.rocksMap&&MC.rocksMap[rockId];
  if(!rock)return;
  const rockNum=MC.allRocks.indexOf(rock)+1;
  const accent=MC.rockAccent[rockNum]||'var(--primary)';
  const SM={on_track:{label:'On Track',color:'var(--green)'},at_risk:{label:'At Risk',color:'var(--amber)'},off_track:{label:'Off Track',color:'var(--orange)'},complete:{label:'Complete',color:'var(--green)'}};
  const st=SM[rock.status]||{label:rock.status||'—',color:'var(--text-muted)'};
  const prog=Math.round((rock.progress||0)*100)/100;
  const qtr=rock.quarter?`Q${rock.quarter}`:'—';
  const desc=rock.description||'';
  const p=document.createElement('div');p.className='rock-preview-popup';p.id='rock-preview-popup';p.style.zIndex=++MC.modalZTop;
  p.style.setProperty('--rpp-accent',accent);
  const rppCirc=2*Math.PI*13;const rppDash=rppCirc-(rppCirc*Math.min(100,prog)/100);
  p.innerHTML=`
    <div class="rpp-header">
      <div class="rpp-ring-wrap">
        <svg viewBox="0 0 34 34"><circle class="ring-bg" cx="17" cy="17" r="13"/><circle class="ring-fill" cx="17" cy="17" r="13" stroke="${accent}" stroke-dasharray="${rppCirc}" stroke-dashoffset="${rppDash}"/></svg>
        <div class="rpp-ring-num" style="background:${accent}10;color:${accent}">R${rockNum}</div>
      </div>
      <span class="rpp-title">${escHtml(rock.title||'Rock')}</span>
    </div>
    <div class="rpp-body"><div class="rpp-stat-row">
      <div class="rpp-stat"><span class="rpp-stat-label">Quarter</span><span class="rpp-stat-val">${escHtml(qtr)}</span></div>
      <div class="rpp-stat"><span class="rpp-stat-label">Status</span><span class="rpp-stat-val" style="color:${st.color}">${escHtml(st.label)}</span></div>
      <div class="rpp-stat"><span class="rpp-stat-label">Progress</span><span class="rpp-stat-val" style="color:${accent}">${prog}%</span></div>
    </div>
    <div class="rpp-progress-bar-wrap"><div class="rpp-progress-bar" style="width:${Math.min(100,prog)}%;background:${accent}"></div></div>
    ${desc?`<div class="rpp-desc">${escHtml(desc)}</div>`:''}
    </div>
    <div class="rpp-footer">
      <button class="rpp-go-btn" style="background:${accent}" onclick="closeRockPreviewPopup();closeCardModal();navigateTo('projects')">View in Rocks \u2192</button>
      <button class="rpp-dismiss-btn" onclick="closeRockPreviewPopup()">Dismiss</button>
    </div>
  `;
  document.body.appendChild(p);
  const r=evt.target.getBoundingClientRect();
  let top=r.bottom+6,left=r.left;
  if(left+320>window.innerWidth-16)left=window.innerWidth-336;
  if(left<16)left=16;
  if(top+260>window.innerHeight-16)top=r.top-266;
  p.style.top=`${Math.max(16,top)}px`;p.style.left=`${left}px`;
  const bd=document.createElement('div');bd.id='rock-preview-backdrop';bd.onclick=closeRockPreviewPopup;bd.style.zIndex=MC.modalZTop-1;
  document.body.appendChild(bd);
}
function closeRockPreviewPopup(){
  const p=document.getElementById('rock-preview-popup'),b=document.getElementById('rock-preview-backdrop');
  if(p)p.remove();if(b)b.remove();
}
document.getElementById('feed-filter-pills').addEventListener('click', e => {
  const pill = e.target.closest('.filter-pill');
  if (!pill) return;
  MC.feedFilter = pill.dataset.filter;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  renderFeed(MC.allMessages);
});

