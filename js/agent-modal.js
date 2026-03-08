// Mission Control — Agent card modal
// =============================================
// AGENT CARD MODAL
// =============================================

async function openAgentModal(agentId) {
  // Support both hardcoded id (e.g. 'jarvis') and human id ('utkarsh')
  const agentDef = agentId === 'utkarsh' ? HUMAN : AGENTS.find(a => a.id === agentId);
  if (!agentDef) return;

  MC.currentAgentId  = agentId;
  MC.currentAgentTab = 'tasks';
  MC.agentModalOpen  = true;

  // Canonical status — consistent with every other surface
  const { si, status: dbStatus, hb: hbModal } = getAgentLiveStatus(agentId);
  const dbEntry = Object.values(MC.dbAgents).find(a => a.name && a.name.toLowerCase() === agentId.toLowerCase());
  const color = agentColor(agentId);

  // Populate hero
  const avatarEl = document.getElementById('amod-avatar');
  avatarEl.style.background = `${color}18`;
  avatarEl.style.color = color;
  avatarEl.innerHTML = avatarInner(agentId);

  document.getElementById('amod-name').textContent  = agentDef.name;
  document.getElementById('amod-role').textContent  = agentDef.role;
  document.getElementById('amod-bio').textContent   = agentDef.bio || '';
  document.getElementById('amod-dot').style.cssText = `background:${si.dot};width:8px;height:8px;border-radius:50%;flex-shrink:0;${si.pulse?'animation:pulse-dot 2.5s ease-in-out infinite':''}`;
  document.getElementById('amod-status-word').textContent  = si.label;
  document.getElementById('amod-status-word').style.color  = si.textColor;

  // Last heartbeat
  if (dbEntry && dbEntry.last_heartbeat) {
    const _rt = relativeTime(dbEntry.last_heartbeat);
    document.getElementById('amod-status-since').textContent = '· ' + _rt.charAt(0).toUpperCase() + _rt.slice(1);
  } else {
    document.getElementById('amod-status-since').textContent = '';
  }

  // Reset stats
  ['amod-stat-tasks','amod-stat-done','amod-stat-msgs','amod-stat-mem','amod-stat-cost'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<span class="spinner-sm"></span>';
  });

  // Activate first stat card (tasks)
  ['tasks','done','logs','memory','cost'].forEach(t => {
    const el = document.getElementById(`amod-stat-card-${t}`);
    if (el) el.classList.toggle('active-stat', t === 'tasks');
  });
  document.getElementById('amod-body').innerHTML = `<div class="agent-modal-loading"><span class="spinner-sm"></span></div>`;

  document.getElementById('agent-modal-overlay').style.zIndex = ++MC.modalZTop;
  document.getElementById('agent-modal-overlay').classList.add('open');

  // Load data in parallel
  await loadAgentModalData(agentId, agentDef, dbEntry);
}

async function loadAgentModalData(agentId, agentDef, dbEntry) {
  // Build Supabase-compatible agent ID filter
  // Tasks use assigned_to (TEXT or array), messages use sender
  const agentName = agentDef.name.toLowerCase(); // 'jarvis', 'echo', etc.
  const agentUUID = dbEntry ? dbEntry.id : null;

  // Fetch tasks, messages, memory, logs in parallel
  const [tasks, msgs, memories, logs] = await Promise.all([
    fetchAgentTasks(agentName, agentUUID),
    fetchAgentMessages(agentName, agentId),
    fetchAgentMemory(agentName),
    fetchAgentLogs(agentName, agentUUID),
  ]);

  // Update stats
  const activeTasks = tasks.filter(t => !['done','blocked'].includes(effectiveStatus(t)));
  const doneTasks   = tasks.filter(t => effectiveStatus(t) === 'done');
  document.getElementById('amod-stat-tasks').textContent = activeTasks.length;
  document.getElementById('amod-stat-done').textContent  = doneTasks.length;
  document.getElementById('amod-stat-msgs').textContent  = logs.length;
  document.getElementById('amod-stat-mem').textContent   = memories.length;
  const totalCost = (tasks || []).reduce((sum, t) => sum + Number((t.metadata||{}).estimated_cost_usd || 0), 0);
  const costEl = document.getElementById('amod-stat-cost');
  if (costEl) costEl.textContent = `$${totalCost.toFixed(2)}`;

  // Store for tab switching
  MC.agentModalData = { tasks, msgs, memories, logs };

  // Render current tab
  renderAgentModalTab('tasks', tasks, msgs, memories, logs);
}

async function fetchAgentTasks(agentName, agentUUID) {
  try {
    // Try by assigned_to text field first (original schema)
    const t1 = await sbQuery('agency_todos', {
      select: 'id,title,description,status,priority,updated_at,created_at,metadata',
      assigned_to: `eq.${agentName}`,
      order: 'updated_at.desc',
      limit: 50
    });
    if (Array.isArray(t1) && t1.length > 0) return t1;

    // Also try tasks from MC.allTasks that have this agent's UUID in assigned_to array
    if (agentUUID) {
      const localTasks = MC.allTasks.filter(t => {
        const ids = Array.isArray(t.assigned_to) ? t.assigned_to : [t.assigned_to];
        return ids.includes(agentUUID) || ids.includes(agentName);
      });
      if (localTasks.length > 0) return localTasks;
    }

    return Array.isArray(t1) ? t1 : [];
  } catch { return []; }
}

async function fetchAgentMessages(agentName, agentId) {
  try {
    // Use ilike for case-insensitive match — agents write lowercase names,
    // Telegram handler may write mixed-case sender values
    const msgs = await sbQuery('messages', {
      select: 'id,created_at,sender,content,role,context',
      sender: `ilike.${agentName}`,
      order: 'created_at.desc',
      limit: 30
    });
    // Also merge in messages already loaded into the live feed
    const fromFeed = MC.allMessages.filter(m => {
      const s = (m.sender||'').toLowerCase();
      return s === agentName.toLowerCase() || s === (agentId||'').toLowerCase() ||
             resolveSenderName(s).toLowerCase() === agentName.toLowerCase();
    });
    const combined = Array.isArray(msgs) ? [...msgs] : [];
    const seen = new Set(combined.map(m => m.id));
    fromFeed.forEach(m => { if (!seen.has(m.id)) { combined.push(m); seen.add(m.id); } });
    return combined.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 30);
  } catch { return []; }
}

async function fetchAgentMemory(agentName) {
  try {
    // Fetch agent-specific memories + shared/VTO memories in parallel, then merge & deduplicate
    const [agentMems, sharedMems] = await Promise.all([
      // Agent's own memories
      sbQuery('memory', {
        select: 'id,created_at,type,content,scope,key,source',
        created_by: `eq.${agentName}`,
        order: 'created_at.desc',
        limit: 20
      }).catch(e => { console.warn('[AgentModal] agent memory query failed:', e); return []; }),
      // Shared memories: scope='shared' OR source='vto' (VTO fields readable by all agents)
      sbQuery('memory', {
        select: 'id,created_at,type,content,scope,key,source',
        or: `scope.eq.shared,source.eq.vto`,
        order: 'created_at.desc',
        limit: 30
      }).catch(e => { console.warn('[AgentModal] shared memory query failed:', e); return []; })
    ]);
    const combined = [...(Array.isArray(agentMems) ? agentMems : []),
                      ...(Array.isArray(sharedMems) ? sharedMems : [])];
    // Deduplicate by id, preserve order (agent-specific first, then shared)
    const seen = new Set();
    return combined.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
  } catch { return []; }
}

async function fetchAgentLogs(agentName, agentUUID) {
  // Fetch from all activity sources in parallel, merge into unified timeline
  const [rawLogs, rawTasks, rawHandoffs, rawMessages, rawUserMsgs] = await Promise.all([
    // 1. logs table — debug/info/warn/error events written by agents (ilike = case-insensitive)
    sbQuery('logs', {
      select: 'id,created_at,level,event,message,metadata',
      agent_id: `ilike.${agentName}`,
      order: 'created_at.desc',
      limit: 50
    }).catch(() => []),

    // 2. todos table — task lifecycle events (created, status changes)
    sbQuery('agency_todos', {
      select: 'id,created_at,updated_at,title,status,assigned_to,description',
      assigned_to: `ilike.${agentName}`,
      order: 'updated_at.desc',
      limit: 30
    }).catch(() => []),

    // 3. handoffs table — agent-to-agent passes
    sbQuery('handoffs', {
      select: 'id,created_at,from_agent,to_agent,status,summary',
      or: `from_agent.ilike.${agentName},to_agent.ilike.${agentName}`,
      order: 'created_at.desc',
      limit: 20
    }).catch(() => []),

    // 4. messages table — outgoing replies (sender=agentName) + incoming to this agent (receiver=agentName)
    sbQuery('messages', {
      select: 'id,created_at,sender,receiver,role,content,context,channel,metadata',
      or: `sender.ilike.${agentName},receiver.ilike.${agentName}`,
      order: 'created_at.desc',
      limit: 40
    }).catch(() => []),

    // 5. Jarvis-specific: all user messages (every Telegram msg from user was directed at Jarvis)
    agentName.toLowerCase() === 'jarvis'
      ? sbQuery('messages', {
          select: 'id,created_at,sender,receiver,role,content,context,channel,metadata',
          or: 'sender.ilike.utkarshfk,sender.ilike.ukaus7,sender.ilike.ukaus',
          order: 'created_at.desc',
          limit: 30
        }).catch(() => [])
      : Promise.resolve([]),
  ]);

  // Debug: log raw counts to console to diagnose RLS / data issues
  console.log(`[logs:${agentName}] logs=${(rawLogs||[]).length} tasks=${(rawTasks||[]).length} handoffs=${(rawHandoffs||[]).length} msgs=${(rawMessages||[]).length} userMsgs=${(rawUserMsgs||[]).length}`);

  const entries = [];

  // Normalise logs rows
  (Array.isArray(rawLogs) ? rawLogs : []).forEach(l => entries.push({
    id: l.id,
    ts: l.created_at,
    kind: 'log',
    level: l.level || 'info',
    title: l.event || l.message || '—',
    detail: l.message && l.event && l.message !== l.event ? l.message : null,
  }));

  // Normalise task rows — emit a "created" and "status" event per task
  (Array.isArray(rawTasks) ? rawTasks : []).forEach(t => {
    entries.push({
      id: t.id + '_created',
      ts: t.created_at,
      kind: 'task',
      level: 'info',
      title: `Task created: ${t.title || 'Untitled'}`,
      detail: t.description ? t.description.slice(0, 80) : null,
    });
    if (t.updated_at && t.updated_at !== t.created_at) {
      entries.push({
        id: t.id + '_updated',
        ts: t.updated_at,
        kind: 'status',
        level: 'info',
        title: `Status → ${(t.status || '—').toUpperCase()}: ${t.title || 'Untitled'}`,
        detail: null,
      });
    }
  });

  // Normalise handoff rows
  (Array.isArray(rawHandoffs) ? rawHandoffs : []).forEach(h => {
    const dir = h.from_agent === agentName ? `→ ${h.to_agent}` : `← ${h.from_agent}`;
    entries.push({
      id: h.id,
      ts: h.created_at,
      kind: 'handoff',
      level: 'info',
      title: `Handoff ${dir}: ${h.status || ''}`,
      detail: h.summary ? h.summary.slice(0, 80) : null,
    });
  });

  // Normalise message rows (conversation history — incoming + outgoing, deduped)
  const allRawMsgs = [
    ...(Array.isArray(rawMessages) ? rawMessages : []),
    ...(Array.isArray(rawUserMsgs) ? rawUserMsgs : [])
  ];
  const seenMsgIds = new Set();
  allRawMsgs.forEach(m => {
    if (seenMsgIds.has(m.id)) return;
    seenMsgIds.add(m.id);
    const isOutgoing = (m.sender || '').toLowerCase() === agentName.toLowerCase();
    const sender   = m.sender   || '?';
    const receiver = m.receiver || (isOutgoing ? 'user' : agentName);
    const ch = (m.channel || m.context || '');
    const isDM = ch.toLowerCase().includes('dm') || ch.toLowerCase().includes('direct');
    const chanLabel = isDM ? 'DM' : (ch ? ch : 'group');
    entries.push({
      id: 'msg_' + m.id,
      ts: m.created_at,
      kind: isOutgoing ? 'msg-out' : 'msg-in',
      level: 'info',
      title: (m.content || ''),
      detail: `${sender} → ${receiver} · ${chanLabel}`,
    });
  });

  // Sort newest first
  entries.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  return entries.slice(0, 60);
}

// Sort pill bar HTML helper
function _sortBar(tab, options) {
  const cur = _agentModalSort[tab] || options[0].key;
  return `<div style="display:flex;gap:4px;padding:8px 10px 4px;flex-shrink:0;border-bottom:1px solid var(--border-light)">
    ${options.map(o => `<button onclick="agentModalSortBy('${tab}','${o.key}')"
      style="font-size:9px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:2px 7px;
             border-radius:99px;border:1px solid ${cur===o.key?'var(--blue)':'var(--border)'};
             background:${cur===o.key?'var(--blue-bg)':'none'};color:${cur===o.key?'var(--blue)':'var(--text-muted)'};
             cursor:pointer;font-family:inherit">${o.label}</button>`).join('')}
  </div>`;
}

function renderAgentModalTab(tab, tasks, msgs, memories, logs) {
  MC.currentAgentTab = tab;
  const body = document.getElementById('amd-body') || document.getElementById('amod-body');

  if (tab === 'tasks' || tab === 'done') {
    const isDone = tab === 'done';
    let filtered = isDone
      ? (tasks || []).filter(t => effectiveStatus(t) === 'done')
      : (tasks || []).filter(t => !['done','blocked'].includes(effectiveStatus(t)));
    const emptyMsg = isDone ? 'No completed to-dos yet' : 'No active to-dos';
    if (!filtered || filtered.length === 0) {
      body.innerHTML = `<div class="agent-modal-empty">${emptyMsg}</div>`;
      return;
    }
    // Apply sort
    const sort = _agentModalSort[tab] || 'priority';
    if (sort === 'priority')  filtered = [...filtered].sort((a,b) => (b.priority||0)-(a.priority||0));
    if (sort === 'recent')    filtered = [...filtered].sort((a,b) => new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0));
    if (sort === 'alpha')     filtered = [...filtered].sort((a,b) => (a.title||'').localeCompare(b.title||''));
    if (sort === 'status')    filtered = [...filtered].sort((a,b) => (a.status||'').localeCompare(b.status||''));

    const sortBar = _sortBar(tab, [
      {key:'priority', label:'Priority'},
      {key:'recent',   label:'Recent'},
      {key:'alpha',    label:'A–Z'},
      {key:'status',   label:'Status'},
    ]);
    const rows = filtered.map(t => {
      const st = effectiveStatus(t);
      const stSt = STATUS_STYLES[st] || STATUS_STYLES.todo;
      const isUrgentAgent = (t.priority||0) >= 8;
      const hasDetail = !!t.id;
      return `
        <div class="agent-modal-task-item${hasDetail ? ' agent-modal-task-clickable' : ''}"
             ${hasDetail ? `onclick="openCardModalFromAgent('${escHtml(t.id)}')"` : ''}>
          <div class="agent-modal-task-dot" style="background:${stSt.color}"></div>
          <div class="agent-modal-task-info">
            <div class="agent-modal-task-title">${escHtml((t.title||'Untitled').charAt(0).toUpperCase()+(t.title||'Untitled').slice(1))}</div>
            <div class="agent-modal-task-meta">
              ${isUrgentAgent ? '<i class="ph-thin ph-flag"></i> ' : ''}${t.description ? escHtml(t.description.slice(0,60)) + (t.description.length > 60 ? '…' : '') : ''}
            </div>
          </div>
          <span class="agent-modal-task-status" style="background:${stSt.bg};color:${stSt.color}">${stSt.label}</span>
          ${hasDetail ? '<span class="agent-modal-task-chevron">›</span>' : ''}
        </div>
      `;
    }).join('');
    body.innerHTML = `<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
      ${sortBar}
      <div style="flex:1;overflow-y:auto">${rows}</div>
    </div>`;

  } else if (tab === 'memory') {
    if (!memories || memories.length === 0) {
      body.innerHTML = `<div class="agent-modal-empty">No memories stored</div>`;
      return;
    }
    // Deduplicate by normalised content (trim + lowercase) — keep earliest
    const seenContent = new Set();
    let dedupedMemories = memories
      .slice()
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .filter(m => {
        const key = (m.content || '').trim().toLowerCase();
        if (seenContent.has(key)) return false;
        seenContent.add(key);
        return true;
      });
    // Apply sort
    const memSort = _agentModalSort['memory'] || 'recent';
    if (memSort === 'recent') dedupedMemories = dedupedMemories.sort((a,b) => new Date(b.created_at||0)-new Date(a.created_at||0));
    if (memSort === 'oldest') dedupedMemories = dedupedMemories.sort((a,b) => new Date(a.created_at||0)-new Date(b.created_at||0));
    if (memSort === 'type')   dedupedMemories = dedupedMemories.sort((a,b) => (a.type||'').localeCompare(b.type||''));
    if (memSort === 'alpha')  dedupedMemories = dedupedMemories.sort((a,b) => (a.content||'').localeCompare(b.content||''));
    const MEM_COLORS = { fact: 'var(--blue)', preference: 'var(--purple)', decision: 'var(--amber)', lesson: 'var(--green)', contact: 'var(--orange)', insight: 'var(--blue)' };
    const memSortBar = _sortBar('memory', [
      {key:'recent', label:'Recent'},
      {key:'oldest', label:'Oldest'},
      {key:'type',   label:'Type'},
      {key:'alpha',  label:'A–Z'},
    ]);
    const memRows = dedupedMemories.map(m => {
      const memColor = MEM_COLORS[m.type] || 'var(--text-secondary)';
      const memBg = m.type === 'fact' ? 'var(--blue-bg)' : m.type === 'preference' ? 'var(--purple-bg)' : m.type === 'decision' ? 'var(--amber-bg)' : m.type === 'lesson' ? 'var(--green-bg)' : m.type === 'contact' ? 'var(--orange-bg)' : m.type === 'insight' ? 'var(--blue-bg)' : 'var(--surface-2)';
      const scopeTag = (m.scope && m.scope !== 'shared') ? `<span style="font-size:9px;font-weight:600;padding:2px 6px;border-radius:99px;background:var(--surface-2);color:var(--text-muted);margin-left:6px;flex-shrink:0">${escHtml(m.scope)}</span>` : '';
      return `
      <div class="agent-modal-mem-item">
        <div class="agent-modal-mem-type" style="background:${memBg};color:${memColor}">${escHtml(m.type||'memory')}</div>
        <div class="agent-modal-mem-content">${escHtml(m.content||'')}</div>
        ${scopeTag}
        <div class="agent-modal-mem-time">${relativeTime(m.created_at)}</div>
      </div>
    `}).join('');
    body.innerHTML = `<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
      ${memSortBar}
      <div style="flex:1;overflow-y:auto">${memRows}</div>
    </div>`;

  } else if (tab === 'cost') {
    const rows = (tasks || []).filter(t => (t.metadata||{}).model_used || (t.metadata||{}).estimated_cost_usd);
    if (rows.length === 0) {
      body.innerHTML = `<div class="agent-modal-empty">No cost telemetry yet</div>`;
      return;
    }
    const total = rows.reduce((s,t)=>s+Number((t.metadata||{}).estimated_cost_usd||0),0);
    const table = rows.slice(0,40).map(t => {
      const m=t.metadata||{};
      return `<div class="agent-modal-log-item" style="align-items:flex-start;flex-direction:column;gap:4px">
        <div style="display:flex;align-items:center;gap:8px;width:100%">
          <span class="agent-modal-log-level" style="background:var(--blue-bg);color:var(--blue)">${escHtml(m.model_used||'—')}</span>
          <span style="font-size:12px;color:var(--text-primary);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(t.title||'Untitled')}</span>
          <span class="agent-modal-log-time">$${Number(m.estimated_cost_usd||0).toFixed(4)}</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted);padding-left:4px">tokens: ${Number(m.token_total||0).toLocaleString()} · prompt ${Number(m.token_prompt||0).toLocaleString()} / completion ${Number(m.token_completion||0).toLocaleString()}</div>
      </div>`;
    }).join('');
    body.innerHTML = `<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
      <div style="padding:10px 12px;border-bottom:1px solid var(--border-color);font-size:12px;color:var(--text-muted)">Estimated total: <b style="color:var(--text-primary)">$${total.toFixed(4)}</b> (recent tasks)</div>
      <div style="flex:1;overflow-y:auto">${table}</div>
    </div>`;

  } else if (tab === 'logs') {
    // Unified activity timeline: tasks + log events + handoffs + messages
    let items = logs && logs.length > 0 ? [...logs] : [];
    if (items.length === 0) {
      body.innerHTML = `<div class="agent-modal-empty">No activity recorded yet</div>`;
      return;
    }
    // Apply sort
    const logSort = _agentModalSort['logs'] || 'recent';
    if (logSort === 'recent') items = items.sort((a,b) => new Date(b.ts||0)-new Date(a.ts||0));
    if (logSort === 'oldest') items = items.sort((a,b) => new Date(a.ts||0)-new Date(b.ts||0));
    if (logSort === 'type')   items = items.sort((a,b) => (a.kind||'').localeCompare(b.kind||''));
    if (logSort === 'level')  items = items.sort((a,b) => (a.level||'').localeCompare(b.level||''));

    // Kind → chip label + colour
    const KIND_STYLE = {
      log:     { label: 'LOG',     color: 'var(--orange)',      bg: 'var(--amber-bg)' },
      task:    { label: 'TO-DO',    color: 'var(--blue)',        bg: 'var(--blue-bg)' },
      status:  { label: 'STATUS',  color: 'var(--purple)',      bg: 'var(--purple-bg)' },
      handoff: { label: 'HANDOFF', color: 'var(--amber)',       bg: 'var(--amber-bg)' },
      comment: { label: 'MSG',     color: 'var(--green)',       bg: 'var(--green-bg)' },
      'msg-out': { label: 'SENT',  color: 'var(--purple)',      bg: 'var(--purple-bg)' },
      'msg-in':  { label: 'MSG',   color: 'var(--green)',       bg: 'var(--green-bg)' },
    };
    const LEVEL_COLOR = { debug: 'var(--text-muted)', info: 'var(--blue)', warn: 'var(--amber)', error: 'var(--orange)' };
    const logSortBar = _sortBar('logs', [
      {key:'recent', label:'Recent'},
      {key:'oldest', label:'Oldest'},
      {key:'type',   label:'Type'},
      {key:'level',  label:'Level'},
    ]);
    const logRows = items.map(e => {
      const ks = KIND_STYLE[e.kind] || KIND_STYLE.log;
      const levelDot = e.kind === 'log'
        ? `<span style="width:6px;height:6px;border-radius:50%;background:${LEVEL_COLOR[e.level]||'var(--blue)'};flex-shrink:0;display:inline-block;margin-right:4px"></span>`
        : '';
      const isMsg = e.kind === 'msg-out' || e.kind === 'msg-in';
      return `
        <div class="agent-modal-log-item"${isMsg ? ' style="align-items:flex-start;flex-direction:column;gap:4px;"' : ''}>
          <div style="display:flex;align-items:center;gap:10px;width:100%">
            <span class="agent-modal-log-level" style="background:${ks.bg};color:${ks.color}">${ks.label}</span>
            ${isMsg
              ? `<span style="font-size:11px;color:var(--text-muted);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(e.detail||'')}</span>`
              : `<span class="agent-modal-mem-content" style="flex:1;min-width:0">${levelDot}${escHtml((e.title||'').slice(0,140))}${e.detail ? '<span style="color:var(--text-muted);font-weight:400"> · ' + escHtml(e.detail.slice(0,80)) + '</span>' : ''}</span>`
            }
            <span class="agent-modal-log-time">${relativeTime(e.ts)}</span>
          </div>
          ${isMsg ? `<div style="font-size:12px;color:var(--text-primary);line-height:1.5;white-space:pre-wrap;word-break:break-word;padding-left:66px">${escHtml(e.title||'')}</div>` : ''}
        </div>
      `;
    }).join('');
    body.innerHTML = `<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
      ${logSortBar}
      <div style="flex:1;overflow-y:auto">${logRows}</div>
    </div>`;
  }
}

// Sort state per tab: { tasks: 'priority', done: 'recent', logs: 'recent', memory: 'recent' }
const _agentModalSort = { tasks: 'priority', done: 'recent', logs: 'recent', memory: 'recent', cost: 'recent' };

// Stat-card tab switching (replaces old tab bar)
function switchAgentModalTab(tab) {
  // Update active stat card highlight
  ['tasks','done','logs','memory','cost'].forEach(t => {
    const el = document.getElementById(`amod-stat-card-${t}`);
    if (el) el.classList.toggle('active-stat', t === tab);
  });
  const data = MC.agentModalData || {};
  renderAgentModalTab(tab, data.tasks||[], data.msgs||[], data.memories||[], data.logs||[]);
}

// Sort change handler — called from sort pill onclick
function agentModalSortBy(tab, sortKey) {
  _agentModalSort[tab] = sortKey;
  switchAgentModalTab(tab);
}

function closeAgentModal() {
  MC.agentModalOpen = false;
  document.getElementById('agent-modal-overlay').classList.remove('open');
}

document.getElementById('agent-modal-close').addEventListener('click', closeAgentModal);
document.getElementById('agent-modal-backdrop').addEventListener('click', closeAgentModal);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    // If card modal is open on top, close it first (ESC acts as back)
    const cardOpen = document.getElementById('card-modal-overlay').classList.contains('open');
    if (cardOpen) {
      const backBtn = document.getElementById('card-modal-back');
      if (backBtn && backBtn.style.display !== 'none') closeCardModalBackToAgent();
      else closeCardModal();
    } else if (MC.agentModalOpen) closeAgentModal();
  }
});

