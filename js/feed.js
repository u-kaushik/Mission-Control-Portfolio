// Mission Control — Live feed & feed detail dialog
// =============================================
// LIVE FEED
// =============================================

// Telegram group chat IDs (negative numbers) — used for DM vs Group detection
const KNOWN_GROUP_IDS = new Set(['-1002243176440']);

function classifyMessage(msg) {
  const role    = (msg.role    || '').toLowerCase();
  const ctx     = (msg.context || '').toLowerCase();
  const type    = (msg.type    || '').toLowerCase();
  const channel = (msg.channel || '').toLowerCase();
  const content = (msg.content || '').toLowerCase();

  // 1. Explicit type/role/context fields take priority
  if (role === 'status'     || ctx === 'status'     || type === 'status')     return 'status';
  if (role === 'task'       || ctx === 'task'        || type === 'task')       return 'tasks';
  if (role === 'decision'   || ctx === 'decision'    || type === 'decision')   return 'decisions';
  if (role === 'doc'        || ctx === 'doc'         || type === 'doc')        return 'docs';
  if (role === 'rock'       || ctx === 'rock'        || type === 'rock')       return 'rock';
  if (role === 'issue'      || ctx === 'issue'       || type === 'issue')      return 'issue';
  if (role === 'scorecard'  || ctx === 'scorecard'   || type === 'scorecard')  return 'scorecard';

  // 2. EOS-specific keyword heuristics (checked before generic heuristics)
  if (/\b(rock|quarterly rock|q[1-4]\s+rock|90.?day|milestone update)\b/.test(content)) return 'rock';
  if (/\b(issue|blocker|obstacle|stuck on|blocked on|problem with|can't move forward)\b/.test(content)) return 'issue';
  if (/\b(scorecard|kpi|metric|revenue|leads|conversion|numbers|this week we hit|weekly number)\b/.test(content)) return 'scorecard';
  if (/\b(ids|identify.{0,10}discuss.{0,10}solve|root cause|the solution is)\b/.test(content)) return 'issue';

  // 3. Generic content keyword heuristics
  if (/\b(task|todo|to-do|assigned|created task|completed task|ticket)\b/.test(content)) return 'tasks';
  if (/\b(status|online|offline|working|heartbeat|going (online|offline))\b/.test(content)) return 'status';
  if (/\b(decided|decision|agreed|confirmed|approved|rejected|resolved)\b/.test(content)) return 'decisions';
  if (/\b(doc|document|updated|readme|spec|wiki|notes|written)\b/.test(content)) return 'docs';

  // 4. Channel context — telegram = user commentary/chat = comments
  if (channel === 'telegram' || channel === 'chat') return 'comments';

  return 'comments';
}

// Group adjacent feed messages from same sender+receiver within 5 min (or same session)
function _groupFeedMessages(messages) {
  const groups = [];
  let cur = null;

  for (const msg of messages) {
    const sender   = (msg.sender   || '').toLowerCase();
    const receiver = (msg.receiver || '').toLowerCase();
    const sid      = msg.session_id || '';
    const ts       = new Date(msg.created_at).getTime();

    if (cur) {
      const sameSid      = sid && cur.sid && sid === cur.sid;
      const samePair     = sender === cur.sender && receiver === cur.receiver;
      const closeInTime  = Math.abs(ts - cur.latestTs) < 5 * 60 * 1000;

      if (sameSid || (samePair && closeInTime)) {
        cur.messages.push(msg);
        cur.latestTs = Math.max(cur.latestTs, ts);
        continue;
      }
    }

    cur = { sid, sender, receiver, latestTs: ts, messages: [msg] };
    groups.push(cur);
  }

  return groups;
}

function renderFeed(messages) {
  MC.allMessages = messages;
  MC.allMessages = messages; // expose for Dashboard page

  const counts = { tasks: 0, rock: 0, issue: 0, scorecard: 0, decisions: 0, docs: 0, comments: 0, status: 0 };
  messages.forEach(m => { const t = classifyMessage(m); if (counts[t] !== undefined) counts[t]++; });

  const setCount = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setCount('fp-tasks-count',     counts.tasks);
  setCount('fp-rock-count',      counts.rock);
  setCount('fp-issue-count',     counts.issue);
  setCount('fp-scorecard-count', counts.scorecard);
  setCount('fp-decisions-count', counts.decisions);
  setCount('fp-comments-count',  counts.comments);
  setCount('fp-docs-count',      counts.docs);
  setCount('fp-status-count',    counts.status);

  // Build unique display names from senders
  const rawSenders = [...new Set(messages.map(m => m.sender).filter(Boolean))];
  const senderDisplayMap = {}; // raw → display
  rawSenders.forEach(raw => { senderDisplayMap[raw] = resolveSenderName(raw); });
  const uniqueDisplayNames = [...new Set(Object.values(senderDisplayMap))];

  const agentFilterContainer = document.getElementById('agent-filter-pills');
  agentFilterContainer.innerHTML =
    `<span class="agent-filter-pill ${MC.agentFeedFilter === 'all' ? 'active' : ''}" data-agent="all">All</span>` +
    uniqueDisplayNames.slice(0, 8).map(displayName => {
      const agentId = resolveAgentIdFromDisplay(displayName);
      const active = MC.agentFeedFilter === agentId ? 'active' : '';
      const cnt = messages.filter(m => senderDisplayMap[m.sender] === displayName).length;
      return `<span class="agent-filter-pill ${active}" data-agent="${agentId}">${displayName} <span style="opacity:0.6">${cnt}</span></span>`;
    }).join('');

  agentFilterContainer.querySelectorAll('.agent-filter-pill').forEach(pill => {
    pill.addEventListener('click', () => { MC.agentFeedFilter = pill.dataset.agent; renderFeed(MC.allMessages); });
  });

  let filtered = messages;
  if (MC.feedFilter !== 'all') filtered = filtered.filter(m => classifyMessage(m) === MC.feedFilter);
  if (MC.agentFeedFilter !== 'all') {
    filtered = filtered.filter(m => {
      // Sender-only match — filter shows who INITIATED, never who received
      const senderDisplay = senderDisplayMap[m.sender || ''] || resolveSenderName(m.sender || '');
      const senderId      = resolveAgentIdFromDisplay(senderDisplay);
      return senderId === MC.agentFeedFilter;
    });
  }

  const feedBody = document.getElementById('feed-body');
  if (filtered.length === 0) {
    feedBody.innerHTML = `<div style="padding:24px 14px;text-align:center;color:var(--text-muted);font-size:var(--font-size-xs);">No activity yet</div>`;
    return;
  }

  const USER_SENDERS = new Set(['utkarsh','utkarshfk','ukaus7','ukaus']);

  // Known group chat session patterns — extend as needed
  const GROUP_SESSIONS = new Set(['kaush_squad','kaush squad','group','team']);
  const isGroupSession = (msg) => {
    const sid = (msg.session_id || '').toLowerCase();
    const meta = msg.metadata || {};
    if (GROUP_SESSIONS.has(sid)) return true;
    if (sid.includes('squad') || sid.includes('group') || sid.includes('team')) return true;
    if (meta.chat_type === 'group' || meta.type === 'group') return true;
    // Multiple receivers = group
    if (msg.receiver && msg.receiver.includes(',')) return true;
    // Telegram group chat IDs are negative numbers
    const receiver = String(msg.receiver || '');
    const chatId = String(meta.chat_id || '');
    if (KNOWN_GROUP_IDS.has(receiver) || KNOWN_GROUP_IDS.has(chatId)) return true;
    if (receiver.startsWith('-') && /^-\d{10,}$/.test(receiver)) return true;
    if (chatId.startsWith('-') && /^-\d{10,}$/.test(chatId)) return true;
    return false;
  };
  const getChatLabel = (msg) => {
    const meta = msg.metadata || {};
    // No telegram_message_id = never actually sent to Telegram, internal Supabase only
    if (msg.channel === 'telegram' && !meta.telegram_message_id) {
      return { label: 'Internal', cls: 'chip-internal', icon: '<i class="ph-thin ph-database"></i>' };
    }
    if (isGroupSession(msg)) {
      const sid = (msg.session_id || '').toLowerCase();
      const receiver = String(msg.receiver || '');
      const chatId = String(meta.chat_id || '');
      if (sid.includes('kaush') || KNOWN_GROUP_IDS.has(receiver) || KNOWN_GROUP_IDS.has(chatId)) {
        return { label: 'Kaush Squad', cls: 'chip-group', icon: '<i class="ph-thin ph-users-three"></i>' };
      }
      return { label: 'Group Chat', cls: 'chip-group', icon: '<i class="ph-thin ph-users-three"></i>' };
    }
    return { label: 'DM', cls: 'chip-dm', icon: '<i class="ph-thin ph-chat-circle"></i>' };
  };

  const groups = _groupFeedMessages(filtered.slice(0, 80));
  const html = groups.map(group => {
    // Pick the most substantive message (longest content) as the representative
    const msgs = group.messages;
    const msg  = msgs.reduce((best, m) =>
      (m.content || '').length > (best.content || '').length ? m : best, msgs[0]);
    const extraCount = msgs.length - 1;

    const rawSender    = msg.sender || 'unknown';
    const displayName  = resolveSenderName(rawSender);
    const agentId      = resolveAgentIdFromDisplay(displayName);
    const senderColor  = agentColor(agentId);
    const senderInfo   = agentInfo(agentId);

    // Receiver resolution
    let rawReceiver     = (msg.receiver || '').split(',')[0].trim(); // first receiver
    // For DMs with no explicit receiver, infer receiver as Jarvis (the Telegram bot entry point)
    const isDM = !isGroupSession(msg);
    if (!rawReceiver && isDM && agentId !== 'jarvis') {
      rawReceiver = 'jarvis'; // sender → Jarvis (bot received the DM)
    } else if (!rawReceiver && isDM && agentId === 'jarvis') {
      // Jarvis sending outbound — try to get recipient from session_id
      const sid = (msg.session_id || '').toLowerCase();
      const matched = AGENTS.find(a => sid.includes(a.id));
      rawReceiver = matched ? matched.id : '';
    }
    const receiverDisplay = rawReceiver ? resolveSenderName(rawReceiver) : '';
    const receiverId      = receiverDisplay ? resolveAgentIdFromDisplay(receiverDisplay) : '';
    const receiverInfo    = receiverId ? agentInfo(receiverId) : null;
    const receiverColor   = receiverId ? agentColor(receiverId) : 'var(--text-muted)';
    // Show overlapping pair for DMs and any message that has an explicit receiver
    const hasReceiver     = !!rawReceiver;

    const content = msg.content || '';
    const type    = classifyMessage(msg);
    const typeActionMap = {
      tasks: 'created a to-do', status: 'updated status', decisions: 'decided',
      docs: 'updated docs', rock: 'updated Rock', issue: 'raised issue',
      scorecard: 'logged metric', comments: 'messaged'
    };
    const action  = typeActionMap[type] || 'wrote';
    const trunc   = content.length > 90 ? content.slice(0, 90) + '…' : content;

    const isUserMsg = USER_SENDERS.has(rawSender.toLowerCase());

    // Sender avatar inner — use agentInfo (now includes HUMAN for Utkarsh)
    const resolvedSenderInfo = senderInfo || (isUserMsg ? HUMAN : null);
    const senderAvatarInner = resolvedSenderInfo && resolvedSenderInfo.avatar
      ? `<img src="${escHtml(resolvedSenderInfo.avatar)}?v=${AVATAR_BUST}" alt="${escHtml(displayName)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.style.display='none'">`
      : `<span style="font-size:11px">${resolvedSenderInfo ? resolvedSenderInfo.emoji : '<i class="ph-thin ph-user"></i>'}</span>`;

    let avatarHtml;
    if (hasReceiver) {
      // Overlapping pair: sender front-left, receiver back-right
      const recvAvatarInner = receiverInfo && receiverInfo.avatar
        ? `<img src="${escHtml(receiverInfo.avatar)}?v=${AVATAR_BUST}" alt="${escHtml(receiverDisplay)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.style.display='none'">`
        : `<span style="font-size:9px">${receiverInfo ? receiverInfo.emoji : '<i class="ph-thin ph-user"></i>'}</span>`;
      avatarHtml = `<div class="feed-avatar-pair">
        <div class="av-sender" style="background:${senderColor}18;color:${senderColor}">${senderAvatarInner}</div>
        <div class="av-receiver" style="background:${receiverColor}18;color:${receiverColor}">${recvAvatarInner}</div>
      </div>`;
    } else {
      avatarHtml = `<div class="feed-entry-avatar" style="background:${senderColor}18;color:${senderColor}">${avatarInner(agentId)}</div>`;
    }

    // Chat context chip
    const chat = getChatLabel(msg);
    const chatChip = `<span class="feed-chat-chip ${chat.cls}">${chat.icon} ${chat.label}</span>`;

    // Grouped message count badge
    const groupBadge = extraCount > 0
      ? `<span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:99px;background:var(--surface-2);color:var(--text-muted);margin-left:4px">+${extraCount}</span>`
      : '';

    // To line: "Utkarsh → Jarvis" or just "Utkarsh"
    const toLine = hasReceiver
      ? `<span class="feed-agent-name" style="color:${senderColor}">${escHtml(displayName)}</span>
         <span class="feed-action" style="color:var(--text-muted)">→</span>
         <span class="feed-agent-name" style="color:${receiverColor}">${escHtml(receiverDisplay)}</span>
         <span class="feed-action">${action}</span>`
      : `<span class="feed-agent-name" style="color:${senderColor}">${escHtml(displayName)}</span>
         <span class="feed-action">${action}</span>`;

    const msgIdx = MC.allMessages.indexOf(msg);
    return `
      <div class="feed-entry" onclick="openFeedDetail(${msgIdx})">
        ${avatarHtml}
        <div class="feed-entry-body">
          <div class="feed-entry-top">${toLine}</div>
          <div class="feed-task-title">${escHtml(trunc)}</div>
          <div class="feed-entry-bottom">${chatChip}<span class="feed-time">${relativeTime(msgs[0].created_at)}</span>${groupBadge}</div>
        </div>
      </div>
    `;
  }).join('');

  feedBody.innerHTML = html;
  if (S.autoScroll) feedBody.scrollTop = 0;

  document.getElementById('feed-last-updated').textContent = 'Updated ' + formatTime(new Date().toISOString());
}

function renderFeedEmpty() {
  document.getElementById('feed-body').innerHTML =
    `<div style="padding:24px 14px;text-align:center;color:var(--text-muted);font-size:var(--font-size-xs);">No messages yet</div>`;
}

// =============================================
// FEED LOG DETAIL DIALOG
// =============================================
function openFeedDetail(msgIdx) {
  const msg = MC.allMessages[msgIdx];
  if (!msg) return;

  const typeActionMap = {
    tasks: 'Created a to-do', status: 'Updated status', decisions: 'Decided',
    docs: 'Updated docs', rock: 'Updated Rock', issue: 'Raised issue',
    scorecard: 'Logged metric', comments: 'Messaged'
  };
  const type   = classifyMessage(msg);
  const action = typeActionMap[type] || 'Wrote';

  // Sender
  const rawSender      = msg.sender || 'unknown';
  const senderDisplay  = resolveSenderName(rawSender);
  const senderId       = resolveAgentIdFromDisplay(senderDisplay);
  const senderColor    = agentColor(senderId);
  const senderInfo     = senderId === 'utkarsh' ? HUMAN : agentInfo(senderId);

  // Receiver — with DM fallback inference (mirrors renderFeed logic)
  const _detailSid = (msg.session_id || '').toLowerCase();
  const _detailReceiver = String(msg.receiver || '');
  const _detailChatId = String((msg.metadata || {}).chat_id || '');
  const _detailIsGroup = _detailSid.includes('squad') || _detailSid.includes('group') || _detailSid.includes('team')
    || !!(msg.metadata && msg.metadata.chat_type === 'group')
    || !!(msg.receiver && msg.receiver.includes(','))
    || KNOWN_GROUP_IDS.has(_detailReceiver) || KNOWN_GROUP_IDS.has(_detailChatId)
    || (_detailReceiver.startsWith('-') && /^-\d{10,}$/.test(_detailReceiver));
  let rawReceiver = (msg.receiver || '').split(',')[0].trim();
  if (!rawReceiver && !_detailIsGroup) {
    if (senderId !== 'jarvis') {
      rawReceiver = 'jarvis';
    } else {
      const _sidMatch = AGENTS.find(a => _detailSid.includes(a.id));
      rawReceiver = _sidMatch ? _sidMatch.id : '';
    }
  }
  const receiverDisplay  = rawReceiver ? resolveSenderName(rawReceiver) : '';
  const receiverId       = receiverDisplay ? resolveAgentIdFromDisplay(receiverDisplay) : '';
  const receiverColor    = receiverId ? agentColor(receiverId) : '';
  const receiverInfo     = receiverId === 'utkarsh' ? HUMAN : agentInfo(receiverId);

  // Type chip
  const typeChipColors = {
    tasks: 'background:var(--blue-bg);color:var(--blue)',
    comments: 'background:var(--purple-bg);color:var(--purple)',
    issue: 'background:var(--orange-bg);color:var(--orange)',
    decisions: 'background:var(--amber-bg);color:var(--amber)',
    rock: 'background:var(--green-bg);color:var(--green)',
    scorecard: 'background:var(--teal-bg);color:var(--teal)',
    docs: 'background:var(--border);color:var(--text-secondary)',
    status: 'background:var(--border);color:var(--text-secondary)',
  };
  document.getElementById('fdlg-type').textContent = type;
  document.getElementById('fdlg-type').style.cssText = typeChipColors[type] || '';

  // Build overlapping avatar pair — same visual as feed card
  const _senderInner = senderInfo && senderInfo.avatar
    ? `<img src="${escHtml(senderInfo.avatar)}?v=${AVATAR_BUST}" alt="${escHtml(senderDisplay)}" onerror="this.style.display='none'">`
    : `<span style="font-size:11px">${senderInfo ? senderInfo.emoji : '<i class="ph-thin ph-user"></i>'}</span>`;
  let avatarHtml;
  if (receiverDisplay) {
    const _recvInner = receiverInfo && receiverInfo.avatar
      ? `<img src="${escHtml(receiverInfo.avatar)}?v=${AVATAR_BUST}" alt="${escHtml(receiverDisplay)}" onerror="this.style.display='none'">`
      : `<span style="font-size:9px">${receiverInfo ? receiverInfo.emoji : '<i class="ph-thin ph-user"></i>'}</span>`;
    avatarHtml = `<div class="feed-avatar-pair" style="flex-shrink:0">
      <div class="av-sender" style="background:${senderColor}18;color:${senderColor}">${_senderInner}</div>
      <div class="av-receiver" style="background:${receiverColor}18;color:${receiverColor}">${_recvInner}</div>
    </div>`;
  } else {
    avatarHtml = `<div class="fdlg-avatar" style="background:${senderColor}18;color:${senderColor};flex-shrink:0">${_senderInner}</div>`;
  }

  // Chat context chip — reuse already-computed session vars
  const _detailMeta = msg.metadata || {};
  let _chatCls, _chatIcon, _chatLbl;
  if (msg.channel === 'telegram' && !_detailMeta.telegram_message_id) {
    _chatCls  = 'chip-internal';
    _chatIcon = '<i class="ph-thin ph-database"></i>';
    _chatLbl  = 'Internal';
  } else if (_detailIsGroup) {
    _chatCls  = 'chip-group';
    _chatIcon = '<i class="ph-thin ph-users-three"></i>';
    _chatLbl  = (_detailSid.includes('kaush') || KNOWN_GROUP_IDS.has(_detailReceiver) || KNOWN_GROUP_IDS.has(_detailChatId)) ? 'Kaush Squad' : 'Group Chat';
  } else {
    _chatCls  = 'chip-dm';
    _chatIcon = '<i class="ph-thin ph-chat-circle"></i>';
    _chatLbl  = 'DM';
  }
  const chatChipHtml = `<span class="feed-chat-chip ${_chatCls}">${_chatIcon} ${_chatLbl}</span>`;

  // Names + verb row
  const namesHtml = receiverDisplay
    ? `<span class="feed-agent-name" style="color:${senderColor};max-width:unset">${escHtml(senderDisplay)}</span>
       <span class="feed-action" style="color:var(--text-muted)">→</span>
       <span class="feed-agent-name" style="color:${receiverColor};max-width:unset">${escHtml(receiverDisplay)}</span>
       <span class="feed-action">${action}</span>`
    : `<span class="feed-agent-name" style="color:${senderColor};max-width:unset">${escHtml(senderDisplay)}</span>
       <span class="feed-action">${action}</span>`;

  document.getElementById('fdlg-parties').innerHTML =
    `${avatarHtml}<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;min-width:0">${namesHtml} ${chatChipHtml}</div>`;

  // Full content
  document.getElementById('fdlg-content').textContent = msg.content || '(no content)';
  document.getElementById('fdlg-meta').innerHTML = '';

  // Timestamps
  const ts = msg.created_at ? new Date(msg.created_at).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }) : '—';
  document.getElementById('fdlg-ts').textContent = ts;
  const _rt = relativeTime(msg.created_at);
  document.getElementById('fdlg-rel-time').textContent = _rt ? (_rt.charAt(0).toUpperCase() + _rt.slice(1)) : '';

  // Show
  const overlay = document.getElementById('feed-detail-overlay');
  overlay.classList.remove('hidden');
  document.addEventListener('keydown', _feedDetailEscHandler);
}

function closeFeedDetail() {
  document.getElementById('feed-detail-overlay').classList.add('hidden');
  document.removeEventListener('keydown', _feedDetailEscHandler);
}
function _feedDetailEscHandler(e) { if (e.key === 'Escape') closeFeedDetail(); }

