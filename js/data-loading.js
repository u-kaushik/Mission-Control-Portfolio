// Mission Control — Data loading functions
// =============================================
// DATA LOADING
// =============================================
let _loadedAgents = null;

async function loadAgents() {
  try {
    const agents = await sbQuery('agents', { order: 'name.asc' });
    if (Array.isArray(agents)) {
      agents.forEach(a => { if (a.id) MC.dbAgents[a.id] = a; });
      _loadedAgents = agents;
      renderAgents(agents);
    }
  } catch { renderAgents([]); }
}

async function loadTasks() {
  try {
    const tasks = await sbQuery('agency_todos', {
      select: 'id,title,description,status,priority,assigned_to,todo_source,due_date,linked_issue_id,rock_id,created_at,updated_at,metadata',
      order: 'updated_at.desc',
      limit: 200
    }, true);  // use service key — matches loadRocks() and bypasses RLS
    const taskList = Array.isArray(tasks) ? tasks : [];
    renderKanban(taskList);
    // Auto-escalate any newly-blocked to-dos → issues
    syncBlockedTasksToIssues(taskList).catch(e => console.warn('[DataLoad] syncBlocked failed:', e));
  } catch (err) {
    // Keep last known good board on transient errors — only show empty on first load (no prior data)
    if (MC.allTasks && MC.allTasks.length > 0) {
      console.warn('[DataLoad] Tasks poll failed, keeping last known board:', err.message);
    } else {
      renderKanbanEmpty();
    }
  }
}

// ── Blocked to-do → Issue auto-escalation ──────────────────────────────
// Any task whose effective status is "blocked" and has no linked issue
// is automatically raised as an open issue so the assigned agent can see it.
async function syncBlockedTasksToIssues(tasks) {
  const toEscalate = tasks.filter(t =>
    effectiveStatus(t) === 'blocked' &&
    !t.linked_issue_id &&
    t.id && !t.id.startsWith('__')   // skip demo / temp tasks
  );
  if (toEscalate.length === 0) return;

  for (const task of toEscalate) {
    try {
      const assignedRaw = task.assigned_to;
      const assignedIds = Array.isArray(assignedRaw) ? assignedRaw : (assignedRaw ? [assignedRaw] : []);
      const agentId  = assignedIds[0] || null;
      const priority = (task.priority || 0) >= 8 ? 'high' : (task.priority || 0) >= 5 ? 'medium' : 'low';

      const issuePayload = {
        title:       `Blocked: ${(task.title || 'Untitled Task').slice(0, 200)}`,
        description: task.description
          ? `To-do is blocked — ${task.description.slice(0, 400)}`
          : 'This to-do is blocked and needs resolution before work can continue.',
        status:      'open',
        priority,
        raised_by:   agentId,
        rock_id:     task.rock_id || null,
        source:      'blocked_todo',
        created_at:  new Date().toISOString(),
      };

      const resp = await fetch(`${SUPABASE_URL}/rest/v1/issues`, {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=representation',
        },
        body: JSON.stringify(issuePayload),
      });

      if (!resp.ok) continue;
      const created  = await resp.json();
      const newIssue = Array.isArray(created) ? created[0] : created;
      if (!newIssue?.id) continue;

      // Link issue back to the to-do (fire & forget)
      fetch(`${SUPABASE_URL}/rest/v1/agency_todos?id=eq.${task.id}`, {
        method: 'PATCH',
        headers: {
          'apikey':        SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({ linked_issue_id: newIssue.id }),
      }).catch(e => console.warn('[DataLoad] link-back PATCH failed:', e));

      // Update in-memory task so we don't re-escalate on next poll
      const idx = MC.allTasks.findIndex(t => t.id === task.id);
      if (idx !== -1) { MC.allTasks[idx].linked_issue_id = newIssue.id;  }

      // Prepend to issues list and refresh
      MC.allIssues = [newIssue, ...MC.allIssues.filter(i => i.id !== newIssue.id)];
      renderIssues();
      updateIssuesBadge();
      console.info(`[BlockedSync] Auto-raised issue for task "${task.title}" → issue ${newIssue.id}`);
    } catch (e) {
      console.warn('[BlockedSync] Failed for task', task.id, e);
    }
  }
}

// ── Prospect Lists ──────────────────────────────────────────────────────
async function loadProspectLists() {
  try {
    const rows = await sbQuery('prospect_lists', { select: '*', order: 'created_at.desc' }, true);
    MC.prospectLists = Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.warn('[DataLoad] prospect_lists load error:', e);
    MC.prospectLists = [];
  }
  return MC.prospectLists;
}

async function loadListMembers(listId) {
  try {
    const rows = await sbQuery('prospect_list_members', {
      select: 'id,list_id,prospect_id,added_at',
      'list_id': `eq.${listId}`,
      order: 'added_at.desc'
    }, true);
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.warn('[DataLoad] list members load error:', e);
    return [];
  }
}

async function loadListMemberCount(listId) {
  try {
    const rows = await sbQuery('prospect_list_members', {
      select: 'id',
      'list_id': `eq.${listId}`
    }, true);
    return Array.isArray(rows) ? rows.length : 0;
  } catch (e) { return 0; }
}

async function loadMessages() {
  try {
    // Explicitly select only the columns we need — avoids issues with vector columns
    const messages = await sbQuery('messages', {
      select: 'id,created_at,sender,receiver,role,content,context,channel,session_id,metadata',
      order: 'created_at.desc',
      limit: 200
    });
    renderFeed(Array.isArray(messages) ? messages : []);
  } catch (err) {
    if (err.status === 404 || err.status === 400) renderFeedEmpty();
    else { console.warn('Messages load error:', err.message); renderFeedEmpty(); }
  }
}

