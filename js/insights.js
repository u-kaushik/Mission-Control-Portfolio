// Mission Control — Insights
// ══════════════════════════════════════════════════════════════════
//  Task analytics and work distribution charts (Chart.js)
// ══════════════════════════════════════════════════════════════════

// Chart instance refs (destroy before re-render to prevent leaks)
var _insTagsChart = null;
var _insRockChart = null;
var _insPriorityChart = null;
var _insStatusChart = null;
var _insDueChart = null;
var _insAgentsChart = null;

// Chart colors (inline for agency branch — no bookkeeping.js dependency)
if (typeof BK_CHART_COLORS === 'undefined') {
  var BK_CHART_COLORS = {
    light: {
      green: '#5ba88a', red: '#c26b6b', blue: '#6b8cce', purple: '#9080C0',
      orange: '#c49052', cyan: '#5ea8b8', teal: '#4d9e96', gray: '#6b6e8a',
      surface: '#ffffff', text: '#6b6e8a', border: 'rgba(148,140,180,0.15)'
    },
    dark: {
      green: '#34d399', red: '#f87171', blue: '#60a5fa', purple: '#C0B5E0',
      orange: '#fbbf24', cyan: '#67e8f9', teal: '#5eead4', gray: '#94a3b8',
      surface: '#161a30', text: '#b0b3cc', border: 'rgba(120,115,170,0.18)'
    }
  };
}

// Theme-aware color helper
function _insColors() {
  var clr = document.documentElement.dataset.theme === 'dark'
    ? BK_CHART_COLORS.dark : BK_CHART_COLORS.light;
  clr.text   = document.documentElement.dataset.theme === 'dark' ? '#94a3b8' : '#6b6e8a';
  clr.border = document.documentElement.dataset.theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  return clr;
}

// ══════════════════════════════════════════════════════════════════
//  MAIN RENDER
// ══════════════════════════════════════════════════════════════════
function _insTimeCutoff() {
  var el = document.getElementById('insights-time-filter');
  var v = el ? el.value : 'all';
  if (v === 'all') return null;
  var now = new Date();
  var d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (v === 'today') return d;
  if (v === 'week') { d.setDate(d.getDate() - d.getDay() + 1); return d; } // Monday
  if (v === 'month') { d.setDate(1); return d; }
  return null;
}

function _insTimeLabel() {
  var el = document.getElementById('insights-time-filter');
  var v = el ? el.value : 'all';
  if (v === 'today') return 'Today';
  if (v === 'week') return 'This Week';
  if (v === 'month') return 'This Month';
  return 'All Time';
}

function _insWeekStart() {
  var now = new Date();
  var d = now.getDay() === 0 ? 6 : now.getDay() - 1;
  var ws = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
  ws.setHours(0, 0, 0, 0);
  return ws.getTime();
}

function renderInsightsPage() {
  var tasks = MC.allTasks || [];

  // Weekly done reset: hide done tasks completed before Monday 00:00
  var weekStartMs = _insWeekStart();
  tasks = tasks.filter(function(t) {
    if (effectiveStatus(t) !== 'done') return true;
    var doneAt = t.completed_at || t.updated_at;
    if (!doneAt) return true;
    return new Date(doneAt).getTime() >= weekStartMs;
  });

  // Apply time-range filter (by updated_at for done tasks, created_at for others)
  var cutoff = _insTimeCutoff();
  if (cutoff) {
    var cutoffMs = cutoff.getTime();
    tasks = tasks.filter(function(t) {
      var ts = t.updated_at || t.created_at;
      return ts && new Date(ts).getTime() >= cutoffMs;
    });
  }

  // Apply status filter
  var filterEl = document.getElementById('insights-status-filter');
  var filterVal = filterEl ? filterEl.value : 'all';
  if (filterVal === 'active') {
    tasks = tasks.filter(function(t) { return effectiveStatus(t) !== 'done'; });
  } else if (filterVal === 'done') {
    tasks = tasks.filter(function(t) { return effectiveStatus(t) === 'done'; });
  }

  _insRenderSummary(tasks);
  _insRenderCompleted(tasks);
  _insRenderTagsChart(tasks);
  _insRenderRockChart(tasks);
  _insRenderPriorityChart(tasks);
  _insRenderStatusChart(tasks);
  _insRenderDueChart(tasks);
  _insRenderAgentsChart(tasks);
}

// ══════════════════════════════════════════════════════════════════
//  SUMMARY STAT CARDS
// ══════════════════════════════════════════════════════════════════
function _insStatCard(label, value, color, icon) {
  return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;box-shadow:var(--shadow-xs)">'
    + '<div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:4px;white-space:nowrap"><i class="ph-thin ' + icon + '"></i> ' + label + '</div>'
    + '<div style="font-size:22px;font-weight:700;color:' + color + '">' + value + '</div></div>';
}

function _insRenderSummary(tasks) {
  var el = document.getElementById('ins-summary-cards');
  if (!el) return;
  var total = tasks.length;
  var active = tasks.filter(function(t) { return effectiveStatus(t) !== 'done'; }).length;
  var done = tasks.filter(function(t) { return effectiveStatus(t) === 'done'; }).length;
  var blocked = tasks.filter(function(t) { return effectiveStatus(t) === 'blocked'; }).length;
  var urgent = tasks.filter(function(t) { return (t.priority || 0) >= 8; }).length;
  var today = new Date(new Date().toDateString());
  var overdue = tasks.filter(function(t) {
    if (!t.due_date || effectiveStatus(t) === 'done') return false;
    return new Date(t.due_date) < today;
  }).length;

  el.innerHTML = [
    _insStatCard('Total', total, 'var(--text-primary)', 'ph-list-bullets'),
    _insStatCard('Active', active, 'var(--blue)', 'ph-play'),
    _insStatCard('Done', done, 'var(--green)', 'ph-check-circle'),
    _insStatCard('Blocked', blocked, 'var(--red)', 'ph-prohibit'),
    _insStatCard('Urgent', urgent, 'var(--amber)', 'ph-fire'),
    _insStatCard('Overdue', overdue, overdue > 0 ? 'var(--red)' : 'var(--green)', 'ph-clock-countdown'),
  ].join('');
}

// ══════════════════════════════════════════════════════════════════
//  COMPLETED LIST — quick scan of what got done
// ══════════════════════════════════════════════════════════════════
function _insRenderCompleted(tasks) {
  var el = document.getElementById('ins-completed-list');
  if (!el) return;

  var doneTasks = tasks
    .filter(function(t) { return effectiveStatus(t) === 'done'; })
    .sort(function(a, b) { return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at); });

  if (doneTasks.length === 0) { el.innerHTML = ''; return; }

  var label = _insTimeLabel();
  var rows = doneTasks.slice(0, 30).map(function(t) {
    var agent = resolveAgentName(Array.isArray(t.assigned_to) ? t.assigned_to[0] : t.assigned_to);
    var clr = AGENT_COLORS[agent.toLowerCase()] || '#6b6e8a';
    var doneDate = new Date(t.updated_at || t.created_at);
    var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var dateStr = dayNames[doneDate.getDay()] + ' ' + doneDate.getDate() + '/' + (doneDate.getMonth() + 1);
    var title = (t.title || 'Untitled').length > 65 ? (t.title || '').slice(0, 65) + '...' : (t.title || 'Untitled');
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light)">'
      + '<span style="width:6px;height:6px;border-radius:50%;background:' + clr + ';flex-shrink:0"></span>'
      + '<span style="font-size:12px;color:var(--text-primary);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(title) + '</span>'
      + '<span style="font-size:10px;color:var(--text-muted);flex-shrink:0">' + escHtml(agent) + '</span>'
      + '<span style="font-size:10px;color:var(--green);font-weight:600;flex-shrink:0;white-space:nowrap">' + dateStr + '</span>'
      + '</div>';
  }).join('');

  el.innerHTML = '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow-xs)">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
    + '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted)"><i class="ph-thin ph-check-circle"></i> Completed ' + label + '</div>'
    + '<span style="font-size:11px;font-weight:700;color:var(--green)">' + doneTasks.length + ' done</span>'
    + '</div>'
    + rows
    + (doneTasks.length > 30 ? '<div style="font-size:11px;color:var(--text-muted);padding:6px 0;text-align:center">+' + (doneTasks.length - 30) + ' more</div>' : '')
    + '</div>';
}

// ══════════════════════════════════════════════════════════════════
//  CHART 1 — Work Type Distribution (doughnut by inferred tag)
// ══════════════════════════════════════════════════════════════════
function _insRenderTagsChart(tasks) {
  var canvas = document.getElementById('ins-chart-tags');
  if (!canvas || typeof Chart === 'undefined') return;
  var clr = _insColors();

  var tagCounts = {};
  var untagged = 0;
  tasks.forEach(function(t) {
    var tags = inferTags(t);
    if (tags.length === 0) { untagged++; return; }
    tags.forEach(function(tag) { tagCounts[tag] = (tagCounts[tag] || 0) + 1; });
  });
  if (untagged > 0) tagCounts['untagged'] = untagged;

  var sorted = Object.keys(tagCounts).sort(function(a, b) { return tagCounts[b] - tagCounts[a]; });
  var values = sorted.map(function(t) { return tagCounts[t]; });
  var labels = sorted.map(function(t) { return t.charAt(0).toUpperCase() + t.slice(1); });

  var TAG_CLR = {
    engineering: 'green', content: 'blue', research: 'purple',
    design: 'purple', marketing: 'orange', ops: 'teal', qa: 'cyan',
    untagged: 'gray'
  };
  var bgColors = sorted.map(function(t) { return (clr[TAG_CLR[t] || 'gray']) + '90'; });
  var borderColors = sorted.map(function(t) { return clr[TAG_CLR[t] || 'gray']; });

  if (_insTagsChart) { _insTagsChart.destroy(); _insTagsChart = null; }
  _insTagsChart = new Chart(canvas, {
    type: 'doughnut',
    data: { labels: labels, datasets: [{ data: values, backgroundColor: bgColors, borderColor: borderColors, borderWidth: 1.5 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '55%',
      plugins: {
        legend: { position: 'right', labels: { color: clr.text, font: { size: 11 }, padding: 8, boxWidth: 12 } },
        tooltip: { callbacks: { label: function(ctx) {
          var total = ctx.dataset.data.reduce(function(a, b) { return a + b; }, 0);
          return ctx.label + ': ' + ctx.parsed + ' (' + (total > 0 ? ((ctx.parsed / total) * 100).toFixed(0) : 0) + '%)';
        }}}
      }
    }
  });
}

// ══════════════════════════════════════════════════════════════════
//  CHART 2 — Rock vs Ad Hoc (doughnut)
// ══════════════════════════════════════════════════════════════════
function _insRenderRockChart(tasks) {
  var canvas = document.getElementById('ins-chart-rock');
  if (!canvas || typeof Chart === 'undefined') return;
  var clr = _insColors();

  // Simple two-slice: Rock-linked vs Ad Hoc
  var rockCount = 0, adHocCount = 0;
  tasks.forEach(function(t) {
    if (t.rock_id) rockCount++;
    else adHocCount++;
  });

  var labels = ['Rock', 'Ad Hoc'];
  var values = [rockCount, adHocCount];
  var bgColors = [clr.purple + '90', clr.gray + '90'];
  var borderColors = [clr.purple, clr.gray];

  if (_insRockChart) { _insRockChart.destroy(); _insRockChart = null; }
  _insRockChart = new Chart(canvas, {
    type: 'doughnut',
    data: { labels: labels, datasets: [{ data: values, backgroundColor: bgColors, borderColor: borderColors, borderWidth: 1.5 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '55%',
      plugins: {
        legend: { position: 'right', labels: { color: clr.text, font: { size: 11 }, padding: 8, boxWidth: 12 } },
        tooltip: { callbacks: { label: function(ctx) {
          var total = ctx.dataset.data.reduce(function(a, b) { return a + b; }, 0);
          return ctx.label + ': ' + ctx.parsed + ' (' + (total > 0 ? ((ctx.parsed / total) * 100).toFixed(0) : 0) + '%)';
        }}}
      }
    }
  });
}

// ══════════════════════════════════════════════════════════════════
//  CHART 3 — Priority Distribution (horizontal bar)
// ══════════════════════════════════════════════════════════════════
function _insRenderPriorityChart(tasks) {
  var canvas = document.getElementById('ins-chart-priority');
  if (!canvas || typeof Chart === 'undefined') return;
  var clr = _insColors();

  var urgent = 0, high = 0, normal = 0, unset = 0;
  tasks.forEach(function(t) {
    var p = t.priority || 0;
    if (p >= 8) urgent++;
    else if (p >= 5) high++;
    else if (p >= 1) normal++;
    else unset++;
  });

  if (_insPriorityChart) { _insPriorityChart.destroy(); _insPriorityChart = null; }
  _insPriorityChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Urgent (8-10)', 'High (5-7)', 'Normal (1-4)', 'Unset'],
      datasets: [{
        data: [urgent, high, normal, unset],
        backgroundColor: [clr.red + '70', clr.orange + '70', clr.blue + '70', clr.gray + '70'],
        borderColor: [clr.red, clr.orange, clr.blue, clr.gray],
        borderWidth: 1, borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return ctx.parsed.x + ' tasks'; } } } },
      scales: {
        x: { beginAtZero: true, grid: { color: clr.border }, ticks: { color: clr.text, font: { size: 10 }, stepSize: 1 } },
        y: { grid: { display: false }, ticks: { color: clr.text, font: { size: 11 } } }
      }
    }
  });
}

// ══════════════════════════════════════════════════════════════════
//  CHART 4 — Status Overview (horizontal bar, kanban-colored)
// ══════════════════════════════════════════════════════════════════
function _insRenderStatusChart(tasks) {
  var canvas = document.getElementById('ins-chart-status');
  if (!canvas || typeof Chart === 'undefined') return;
  var clr = _insColors();

  var statusCounts = {};
  KANBAN_COLS.forEach(function(c) { statusCounts[c.key] = 0; });
  tasks.forEach(function(t) {
    var s = effectiveStatus(t);
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  var labels = KANBAN_COLS.map(function(c) { return c.label; });
  var values = KANBAN_COLS.map(function(c) { return statusCounts[c.key]; });
  var STATUS_CLR = { backlog: 'purple', todo: 'gray', in_progress: 'blue', review: 'orange', done: 'green', blocked: 'red' };
  var bgColors = KANBAN_COLS.map(function(c) { return (clr[STATUS_CLR[c.key] || 'gray']) + '70'; });
  var borderColors = KANBAN_COLS.map(function(c) { return clr[STATUS_CLR[c.key] || 'gray']; });

  if (_insStatusChart) { _insStatusChart.destroy(); _insStatusChart = null; }
  _insStatusChart = new Chart(canvas, {
    type: 'bar',
    data: { labels: labels, datasets: [{ data: values, backgroundColor: bgColors, borderColor: borderColors, borderWidth: 1, borderRadius: 4 }] },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return ctx.parsed.x + ' tasks'; } } } },
      scales: {
        x: { beginAtZero: true, grid: { color: clr.border }, ticks: { color: clr.text, font: { size: 10 }, stepSize: 1 } },
        y: { grid: { display: false }, ticks: { color: clr.text, font: { size: 11 } } }
      }
    }
  });
}

// ══════════════════════════════════════════════════════════════════
//  CHART 5 — Due Date Timeline (vertical bar)
// ══════════════════════════════════════════════════════════════════
function _insRenderDueChart(tasks) {
  var canvas = document.getElementById('ins-chart-due');
  if (!canvas || typeof Chart === 'undefined') return;
  var clr = _insColors();

  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var tomorrow = new Date(today.getTime() + 86400000);
  var dayOfWeek = today.getDay();
  var daysUntilSun = (7 - dayOfWeek) % 7 || 7;
  var endOfWeek = new Date(today.getTime() + daysUntilSun * 86400000);
  var endOfNextWeek = new Date(endOfWeek.getTime() + 7 * 86400000);

  var overdue = 0, dueToday = 0, thisWeek = 0, nextWeek = 0, later = 0, noDate = 0;
  tasks.forEach(function(t) {
    if (!t.due_date) { noDate++; return; }
    var d = new Date(t.due_date); d.setHours(0, 0, 0, 0);
    if (d < today && effectiveStatus(t) !== 'done') overdue++;
    else if (d >= today && d < tomorrow) dueToday++;
    else if (d >= tomorrow && d < endOfWeek) thisWeek++;
    else if (d >= endOfWeek && d < endOfNextWeek) nextWeek++;
    else later++;
  });

  if (_insDueChart) { _insDueChart.destroy(); _insDueChart = null; }
  _insDueChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Overdue', 'Today', 'This Week', 'Next Week', 'Later', 'No Date'],
      datasets: [{
        data: [overdue, dueToday, thisWeek, nextWeek, later, noDate],
        backgroundColor: [clr.red + '70', clr.orange + '70', clr.blue + '70', clr.cyan + '70', clr.green + '70', clr.gray + '70'],
        borderColor: [clr.red, clr.orange, clr.blue, clr.cyan, clr.green, clr.gray],
        borderWidth: 1, borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return ctx.parsed.y + ' tasks'; } } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: clr.text, font: { size: 10 } } },
        y: { beginAtZero: true, grid: { color: clr.border }, ticks: { color: clr.text, font: { size: 10 }, stepSize: 1 } }
      }
    }
  });
}

// ══════════════════════════════════════════════════════════════════
//  CHART 6 — Agent Workload (horizontal bar)
// ══════════════════════════════════════════════════════════════════
function _insRenderAgentsChart(tasks) {
  var canvas = document.getElementById('ins-chart-agents');
  if (!canvas || typeof Chart === 'undefined') return;
  var clr = _insColors();

  var agentCounts = {};
  tasks.forEach(function(t) {
    if (!t.assigned_to) { agentCounts['Unassigned'] = (agentCounts['Unassigned'] || 0) + 1; return; }
    var ids = Array.isArray(t.assigned_to) ? t.assigned_to : [t.assigned_to];
    ids.forEach(function(id) {
      var name = resolveAgentName(id);
      agentCounts[name] = (agentCounts[name] || 0) + 1;
    });
  });

  var sorted = Object.keys(agentCounts).sort(function(a, b) { return agentCounts[b] - agentCounts[a]; });
  var values = sorted.map(function(a) { return agentCounts[a]; });
  var bgColors = sorted.map(function(name) { return (AGENT_COLORS[name.toLowerCase()] || clr.gray) + '70'; });
  var borderColors = sorted.map(function(name) { return AGENT_COLORS[name.toLowerCase()] || clr.gray; });

  if (_insAgentsChart) { _insAgentsChart.destroy(); _insAgentsChart = null; }
  _insAgentsChart = new Chart(canvas, {
    type: 'bar',
    data: { labels: sorted, datasets: [{ data: values, backgroundColor: bgColors, borderColor: borderColors, borderWidth: 1, borderRadius: 4 }] },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return ctx.parsed.x + ' tasks'; } } } },
      scales: {
        x: { beginAtZero: true, grid: { color: clr.border }, ticks: { color: clr.text, font: { size: 10 }, stepSize: 1 } },
        y: { grid: { display: false }, ticks: { color: clr.text, font: { size: 11 } } }
      }
    }
  });
}
