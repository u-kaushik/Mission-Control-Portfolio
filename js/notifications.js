// Mission Control — Notifications & avatar click delegation
// =============================================
// NOTIFICATIONS
// =============================================

const NOTIF_TYPE_ICONS = {
  mention:      '<i class="ph-thin ph-chat-circle"></i>',
  assigned:     '<i class="ph-thin ph-list-bullets"></i>',
  review_ready: '<i class="ph-thin ph-eye"></i>',
  completed:    '<i class="ph-thin ph-check-circle"></i>',
  blocked:      '<i class="ph-thin ph-prohibit"></i>',
};

// Lookup agent UUID → name using MC.dbAgents
function resolveAgentNameFromId(uuid) {
  if (!uuid) return 'system';
  const db = MC.dbAgents[uuid];
  if (db) return db.name ? db.name.toLowerCase() : 'unknown';
  // Check if it matches any AGENTS by id (non-uuid case)
  const a = AGENTS.find(ag => ag.id === uuid);
  return a ? a.id : 'unknown';
}

async function loadNotifications() {
  try {
    const notifs = await sbQuery('notifications', {
      select: 'id,created_at,agent_id,type,title,message,task_id,read,read_at,metadata',
      order: 'created_at.desc',
      limit: 50
    });
    if (!Array.isArray(notifs)) return;
    MC.allNotifs = notifs;
    renderNotifications(notifs);
  } catch (err) {
    // Notifications table may not exist yet — silently ignore
    if (err.status !== 404 && err.status !== 400) {
      console.warn('Notifications load error:', err.message);
    }
  }
}

function renderNotifications(notifs) {
  const unreadCount = notifs.filter(n => !n.read).length;

  // Header bell badge (sidebar notif button removed; header badge still hidden by default)
  const headerBadge = document.getElementById('header-notif-badge');
  if (headerBadge) {
    headerBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    headerBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
  }

  // Sync mobile badge
  const mobBadge = document.getElementById('mobile-notif-badge');
  if (mobBadge) {
    mobBadge.textContent = unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : '';
    mobBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
  }

  const btn = document.getElementById('notif-btn');
  if (btn) btn.classList.toggle('active', unreadCount > 0 && !MC.notifOpen);

  const list = document.getElementById('notif-list');
  if (!list) return;
  if (notifs.length === 0) {
    list.innerHTML = `<div class="notif-empty">All caught up!</div>`;
    return;
  }

  list.innerHTML = notifs.map(n => {
    const agentId   = resolveAgentNameFromId(n.agent_id);
    const color     = agentColor(agentId);
    const typeIcon  = NOTIF_TYPE_ICONS[n.type] || '<i class="ph-thin ph-bell"></i>';
    const unreadCls = n.read ? '' : 'unread';
    const time      = relativeTime(n.created_at);

    return `
      <div class="notif-item ${unreadCls}" data-notif-id="${n.id}" onclick="markNotifRead('${n.id}', this)">
        <div class="notif-item-avatar" style="background:${color}18;color:${color};">
          ${avatarInner(agentId)}
          <span class="notif-type-icon">${typeIcon}</span>
        </div>
        <div class="notif-item-body">
          <div class="notif-item-title">${escHtml(n.title || 'Notification')}</div>
          ${n.message ? `<div class="notif-item-msg">${escHtml(n.message)}</div>` : ''}
          <div class="notif-item-time">${time}</div>
        </div>
        ${!n.read ? `<div class="notif-unread-dot"></div>` : ''}
      </div>
    `;
  }).join('');
}

async function markNotifRead(notifId, el) {
  // Optimistic UI update
  el.classList.remove('unread');
  const dot = el.querySelector('.notif-unread-dot');
  if (dot) dot.remove();
  const notif = MC.allNotifs.find(n => n.id === notifId);
  if (notif) notif.read = true;
  // Update badge count
  renderNotifications(MC.allNotifs);

  // Persist to Supabase (fire and forget)
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/notifications`);
    url.searchParams.set('id', `eq.${notifId}`);
    fetch(url.toString(), {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ read: true, read_at: new Date().toISOString() })
    }).then(r => { if (!r.ok) console.warn('[Notif] markRead failed:', r.status); })
      .catch(e => console.warn('[Notif] markRead error:', e));
  } catch (e) { console.warn('[Notif] markRead error:', e); }
}

async function markAllNotifsRead() {
  MC.allNotifs.forEach(n => { n.read = true; });
  renderNotifications(MC.allNotifs);

  // Persist all unread to Supabase (fire and forget)
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/notifications`);
    url.searchParams.set('read', 'eq.false');
    fetch(url.toString(), {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ read: true, read_at: new Date().toISOString() })
    }).then(r => { if (!r.ok) console.warn('[Notif] markAllRead failed:', r.status); })
      .catch(e => console.warn('[Notif] markAllRead error:', e));
  } catch (e) { console.warn('[Notif] markAllRead error:', e); }
}

// Toggle notifications dropdown
document.getElementById('notif-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  const dropdown = document.getElementById('notif-dropdown');
  MC.notifOpen = !MC.notifOpen;
  dropdown.classList.toggle('open', MC.notifOpen);
  // When opening, reload and clear the active button state
  if (MC.notifOpen) {
    loadNotifications();
    document.getElementById('notif-btn').classList.remove('active');
  }
});

document.getElementById('notif-mark-all').addEventListener('click', (e) => {
  e.stopPropagation();
  markAllNotifsRead();
});

// Close notifications dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (MC.notifOpen && !document.getElementById('notif-btn-wrap').contains(e.target)) {
    MC.notifOpen = false;
    document.getElementById('notif-dropdown').classList.remove('open');
  }
});

// ── Global avatar click delegation ──
// Any element with data-agent-id that is NOT already inside an .agent-row
// (which has its own full-row click) opens the agent modal on click.
document.addEventListener('click', (e) => {
  const avatar = e.target.closest('[data-agent-id]');
  if (!avatar) return;
  // Don't double-fire when the whole agent-row is clickable
  if (avatar.closest('.agent-row')) return;
  const agentId = avatar.dataset.agentId;
  if (!agentId) return;
  e.stopPropagation();
  openAgentModal(agentId);
});

