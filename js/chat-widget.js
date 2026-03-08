// Mission Control — Ask MC chat widget (Gemini Flash 2.0)
// Lightweight floating chat for querying operational data

let _mcChatOpen = false;
let _mcChatHistory = []; // session-only

function _buildDataContext() {
  const tasks = MC.allTasks || [];
  const rocks = MC.allRocks || [];
  const issues = MC.allIssues || [];
  const now = new Date();
  const weekAgo = new Date(now - 7 * 86400000);

  // Task stats
  const byStatus = {};
  const byAgent = {};
  const byLabel = {};
  const byDow = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let overdueCount = 0;
  let totalOverdueDays = 0;
  let completedThisWeek = 0;
  let createdThisWeek = 0;

  tasks.forEach(t => {
    const s = (t.status || 'todo').toLowerCase();
    byStatus[s] = (byStatus[s] || 0) + 1;

    const agent = Array.isArray(t.assigned_to) ? t.assigned_to[0] : (t.assigned_to || 'unassigned');
    if (!byAgent[agent]) byAgent[agent] = { total: 0, done: 0, in_progress: 0, todo: 0, review: 0, overdue: 0, completedThisWeek: 0 };
    byAgent[agent].total++;
    if (s === 'done') byAgent[agent].done++;
    if (s === 'in_progress') byAgent[agent].in_progress++;
    if (s === 'todo') byAgent[agent].todo++;
    if (s === 'review') byAgent[agent].review++;

    // Labels / categories
    const labels = t.labels || t.tags || [];
    (Array.isArray(labels) ? labels : [labels]).forEach(l => {
      if (l) { byLabel[l] = (byLabel[l] || { total: 0, done: 0, overdue: 0 }); byLabel[l].total++; if (s === 'done') byLabel[l].done++; }
    });

    // Overdue
    if (t.due_date && new Date(t.due_date) < now && s !== 'done' && s !== 'cancelled') {
      overdueCount++;
      const days = Math.floor((now - new Date(t.due_date)) / 86400000);
      totalOverdueDays += days;
      byAgent[agent].overdue++;
      (Array.isArray(labels) ? labels : [labels]).forEach(l => { if (l && byLabel[l]) byLabel[l].overdue++; });
    }

    // Weekly velocity
    if (s === 'done' && t.updated_at && new Date(t.updated_at) >= weekAgo) {
      completedThisWeek++;
      byAgent[agent].completedThisWeek++;
    }
    if (t.created_at && new Date(t.created_at) >= weekAgo) createdThisWeek++;

    // Day-of-week for completed tasks
    if (s === 'done' && t.updated_at) {
      byDow[new Date(t.updated_at).getDay()]++;
    }
  });

  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dowSummary = dowNames.map((d, i) => `${d}: ${byDow[i]}`).join(', ');
  const bestDay = dowNames[Object.entries(byDow).sort((a, b) => b[1] - a[1])[0][0]];

  // Completion rate
  const doneCount = byStatus['done'] || 0;
  const completionRate = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  // Agent ranking by completion rate
  const agentRanking = Object.entries(byAgent)
    .filter(([, d]) => d.total >= 2)
    .map(([a, d]) => ({ name: a, rate: d.total ? Math.round((d.done / d.total) * 100) : 0, ...d }))
    .sort((a, b) => b.rate - a.rate);

  // Rock summary
  const rockSummary = rocks.slice(0, 15).map(r =>
    `- ${r.title} (Q${r.quarter || '?'}, ${r.status || 'on_track'}, ${r.progress || 0}%, owner: ${r.owner_id || '?'})`
  ).join('\n');

  // Overdue tasks detail (top 15 most overdue)
  const overdueTasks = tasks
    .filter(t => t.due_date && new Date(t.due_date) < now && (t.status || '').toLowerCase() !== 'done' && (t.status || '').toLowerCase() !== 'cancelled')
    .map(t => ({ ...t, daysLate: Math.floor((now - new Date(t.due_date)) / 86400000) }))
    .sort((a, b) => b.daysLate - a.daysLate)
    .slice(0, 15)
    .map(t => {
      const agent = Array.isArray(t.assigned_to) ? t.assigned_to[0] : (t.assigned_to || '?');
      return `- "${(t.title || '').slice(0, 60)}" | ${agent} | ${t.daysLate}d late | status: ${t.status}`;
    }).join('\n');

  // Label breakdown (top 10)
  const labelSummary = Object.entries(byLabel)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([l, d]) => `- ${l}: ${d.total} total, ${d.done} done (${d.total ? Math.round((d.done / d.total) * 100) : 0}%), ${d.overdue} overdue`)
    .join('\n');

  // Open issues
  const openIssues = issues.filter(i => (i.status || '').toLowerCase() === 'open');

  return `### Summary (${now.toISOString().slice(0, 10)})
Total tasks: ${tasks.length} | Completion rate: **${completionRate}%** (${doneCount} done)
Status: ${Object.entries(byStatus).map(([k, v]) => `${k}: ${v}`).join(', ')}
Overdue: ${overdueCount} tasks (avg ${overdueCount ? Math.round(totalOverdueDays / overdueCount) : 0} days late)
This week: ${completedThisWeek} completed, ${createdThisWeek} created
Best completion day: **${bestDay}**
Open issues: ${openIssues.length}

### Agent Performance (ranked by completion %)
${agentRanking.map((a, i) => `${i + 1}. **${a.name}**: ${a.rate}% done (${a.done}/${a.total}) | ${a.in_progress} active | ${a.overdue} overdue | ${a.completedThisWeek} this week`).join('\n')}

### Most Overdue Tasks
${overdueTasks || 'None'}

### Categories / Labels
${labelSummary || 'No labels on tasks'}

### Rocks (${rocks.length})
${rockSummary || 'None'}

### Completions by Day-of-Week
${dowSummary}

### Open Issues (${openIssues.length})
${openIssues.slice(0, 10).map(i => `- ${i.title || i.description || 'Untitled'} (${i.priority || 'normal'})`).join('\n') || 'None'}`;
}

function _renderMcChat() {
  const root = document.getElementById('mc-chat-widget');
  if (!root) return;

  root.innerHTML = `
    <button class="mc-chat-btn" onclick="_toggleMcChat()" title="Ask MC">
      <i class="ph-thin ph-chat-centered-text"></i>
    </button>
    <div class="mc-chat-panel ${_mcChatOpen ? 'open' : ''}">
      <div class="mc-chat-header">
        <span class="mc-chat-title"><i class="ph-thin ph-sparkle"></i> Ask MC</span>
        <button class="mc-chat-close" onclick="_toggleMcChat()">&times;</button>
      </div>
      <div class="mc-chat-messages" id="mc-chat-messages">
        ${_mcChatHistory.length === 0
          ? `<div class="mc-chat-empty">Ask anything about your data &mdash; tasks, agents, rocks, performance.</div>`
          : _mcChatHistory.map(m => `
            <div class="mc-chat-msg ${m.role}">
              <div class="mc-chat-bubble">${m.role === 'assistant' ? _mdBasic(m.text) : escHtml(m.text)}</div>
            </div>`).join('')
        }
      </div>
      <div class="mc-chat-input-row">
        <input type="text" id="mc-chat-input" class="mc-chat-input" placeholder="e.g. Which agent is most overdue?" onkeydown="if(event.key==='Enter')_sendMcChat()">
        <button class="mc-chat-send" onclick="_sendMcChat()"><i class="ph-thin ph-paper-plane-tilt"></i></button>
      </div>
    </div>`;
}

function _toggleMcChat() {
  _mcChatOpen = !_mcChatOpen;
  _renderMcChat();
  if (_mcChatOpen) {
    setTimeout(() => {
      const input = document.getElementById('mc-chat-input');
      if (input) input.focus();
    }, 100);
  }
}

async function _sendMcChat() {
  const input = document.getElementById('mc-chat-input');
  const question = (input?.value || '').trim();
  if (!question) return;

  _mcChatHistory.push({ role: 'user', text: question });
  _mcChatHistory.push({ role: 'assistant', text: '...' }); // typing indicator
  _renderMcChat();
  _scrollMcChat();

  try {
    const dataContext = _buildDataContext();
    // Send prior conversation (exclude the current question + typing indicator)
    const history = _mcChatHistory.slice(0, -2);
    const res = await fetch('/.netlify/functions/mc-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, dataContext, history }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Replace typing indicator
    _mcChatHistory[_mcChatHistory.length - 1] = { role: 'assistant', text: data.answer || 'No response.' };
  } catch (err) {
    _mcChatHistory[_mcChatHistory.length - 1] = { role: 'assistant', text: `Error: ${err.message}` };
  }

  _renderMcChat();
  _scrollMcChat();
}

function _scrollMcChat() {
  setTimeout(() => {
    const el = document.getElementById('mc-chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }, 50);
}

// Basic markdown: **bold**, *italic*, `code`, - lists
function _mdBasic(text) {
  return escHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n/g, '<br>');
}

function initChatWidget() {
  _renderMcChat();
}

// Self-init: render button immediately on script load
if (document.getElementById('mc-chat-widget')) {
  initChatWidget();
} else {
  document.addEventListener('DOMContentLoaded', initChatWidget);
}
