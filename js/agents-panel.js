// Mission Control — Agents panel
// =============================================
// RENDER AGENTS PANEL
// =============================================
function agentStatusInfo(dbStatus) {
  const s = (dbStatus || 'idle').toLowerCase();
  if (s === 'working') return { label: 'Working',  dot: 'var(--green-dot)',  textColor: 'var(--green)',      pulse: true  };
  if (s === 'blocked') return { label: 'Blocked',  dot: 'var(--orange)',     textColor: 'var(--orange)',     pulse: false };
  if (s === 'offline') return { label: 'Offline',  dot: 'var(--text-muted)', textColor: 'var(--text-muted)', pulse: false };
  // idle / online / any other = Online
  return                       { label: 'Online',  dot: 'var(--green-dot)', textColor: 'var(--green)',      pulse: false };
}

/**
 * CANONICAL status resolver — single source of truth for every surface.
 * Accepts either an agent id (e.g. 'jarvis') or display name ('Jarvis').
 * Returns { si, status, hb, staleMs } where si = agentStatusInfo result.
 * Presence thresholds tuned for real-world async agent operation.
 * Thresholds: Jarvis = 5 min, specialists = 30 min.
 */
function getAgentLiveStatus(agentIdOrName) {
  if (!agentIdOrName) return { si: agentStatusInfo('offline'), status: 'offline', hb: null, staleMs: Infinity };
  const key = agentIdOrName.toLowerCase();
  // Utkarsh (human) is always online
  if (key === 'utkarsh') return { si: agentStatusInfo('online'), status: 'online', hb: null, staleMs: 0 };
  // Find DB row — match by name or id field
  const dbA = Object.values(MC.dbAgents).find(d =>
    (d.name  && d.name.toLowerCase()  === key) ||
    (d.id    && d.id.toLowerCase()    === key)
  );
  const rawStatus = dbA ? (dbA.status || 'idle') : 'offline';
  const hb        = dbA && dbA.last_heartbeat ? new Date(dbA.last_heartbeat) : null;
  const staleMs   = hb ? (Date.now() - hb.getTime()) : Infinity;
  const threshold = key === 'jarvis' ? 5 * 60 * 1000 : 30 * 60 * 1000;

  // If the worker has an active task id, force visible "working" state.
  const hasActiveTask = !!(
    dbA && (
      dbA.current_task_id ||
      (dbA.metadata && (dbA.metadata.current_task_id || dbA.metadata.active_task_id || dbA.metadata.currentTaskId))
    )
  );

  let status = staleMs > threshold ? 'offline' : rawStatus;
  // If an agent has an active task, keep it visible as working unless heartbeat is very stale.
  if (hasActiveTask && staleMs <= (2 * 60 * 60 * 1000)) status = 'working';

  return { si: agentStatusInfo(status), status, hb, staleMs };
}

function renderAgentRow(agent, dbStatus, extraClass = '') {
  const si    = agentStatusInfo(dbStatus);
  const color = agentColor(agent.id);
  const pulseStyle = si.pulse ? '' : 'animation:none;';
  return `
    <div class="agent-row ${extraClass}" onclick="openAgentModal('${agent.id}')" data-agent-id="${agent.id}">
      <div style="position:relative;flex-shrink:0">
        <div class="agent-avatar" style="background:${color}18;color:${color};">
          ${avatarInner(agent.id)}
        </div>
        <span class="agent-presence-dot" style="background:${si.dot};${pulseStyle}"></span>
      </div>
      <div class="agent-info">
        <div class="agent-name-row">
          <span class="agent-name">${agent.name}</span>
        </div>
        <div class="agent-status-row">
          <span class="agent-role-sub">${agent.role}</span>
          <div class="agent-status-dot" style="background:${si.dot};${pulseStyle}"></div>
          <span class="agent-status-label" style="color:${si.textColor}">${si.label}</span>
        </div>
      </div>
    </div>
  `;
}

function renderAgents(dbAgents) {
  const list = document.getElementById('agents-list');

  // Merge DB data — use canonical getAgentLiveStatus() for consistent status across all surfaces
  const mergedAgents = AGENTS.map(a => {
    const { status } = getAgentLiveStatus(a.id);
    return { ...a, dbStatus: status };
  });

  // Count genuinely online agents (not offline/stale) + Utkarsh (always online)
  const onlineCount = mergedAgents.filter(a => a.dbStatus !== 'offline').length + 1; // +1 for Utkarsh
  document.getElementById('agents-count').textContent = mergedAgents.length;
  document.getElementById('hdr-agents').textContent = onlineCount;
  // Update label: "ONLINE" or pluralise correctly
  const hdrLabel = document.querySelector('#hdr-agents + .header-stat-label');
  if (hdrLabel) hdrLabel.textContent = onlineCount === 1 ? 'AGENT ONLINE' : 'AGENTS ONLINE';

  // Utkarsh pinned at top
  const humanRow = renderAgentRow(
    { ...HUMAN },
    'online',
    'agent-row-human'
  );

  const agentRows = mergedAgents.map(agent =>
    renderAgentRow(agent, agent.dbStatus)
  ).join('');

  list.innerHTML = humanRow + agentRows;
}

