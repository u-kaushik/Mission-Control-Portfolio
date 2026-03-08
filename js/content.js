// Mission Control — Content planner (vertical short-form video)
// ── Content Planner ──
const CP_COLUMNS = ['Idea', 'Research', 'Drafting', 'Review', 'Scheduled', 'Published'];
const CP_COL_COLORS = {
  Idea:'var(--purple)', Research:'var(--blue)', Drafting:'var(--amber)',
  Review:'var(--red)', Scheduled:'var(--green)', Published:'var(--green)'
};
const CP_COL_ICONS = {
  Idea:'<i class="ph-thin ph-lightbulb"></i>', Research:'<i class="ph-thin ph-magnifying-glass"></i>', Drafting:'<i class="ph-thin ph-pencil-simple"></i>', Review:'<i class="ph-thin ph-magnifying-glass"></i>', Scheduled:'<i class="ph-thin ph-calendar-blank"></i>', Published:'<i class="ph-thin ph-rocket"></i>'
};

// All pieces go to every platform
const CP_PLATFORMS = ['TikTok', 'YT Shorts', 'IG Reels', 'FB Reels'];

// Sample cards seeded once if board is empty
const CP_SAMPLE_CARDS = [
  { id:'__s1__', title:'POV: You hired 9 AI agents to run your business', status:'Idea', agent:'echo', desc:'Camera on laptop, reveal agent dashboard. Trending audio.', views:0, likes:0, comments:0, shares:0 },
  { id:'__s2__', title:'3 tools that replaced my entire marketing team', status:'Research', agent:'sola', desc:'Research competitor shorts for hook pacing and CTA placement.', views:0, likes:0, comments:0, shares:0 },
  { id:'__s3__', title:'Day in my life running a £50k/m agency', status:'Drafting', agent:'luna', desc:'B-roll of desk setup, Mission Control dashboard, morning routine. 45s cut.', views:0, likes:0, comments:0, shares:0 },
  { id:'__s4__', title:'Why your AI agents keep hallucinating (and how to fix it)', status:'Review', agent:'iris', desc:'Quick-cut explainer with on-screen text. Iris QA pass on captions.', views:0, likes:0, comments:0, shares:0 },
  { id:'__s5__', title:'The 5am routine that built a 6-figure agency', status:'Scheduled', agent:'quinn', desc:'Scheduled Thu 7am all platforms. Quinn approved caption variants.', due_date:'2026-03-05', views:0, likes:0, comments:0, shares:0 },
  { id:'__s6__', title:'I automated my entire business with AI — here\'s what happened', status:'Published', agent:'echo', desc:'Top performer this month. Strong saves and shares across TT and IG.', views:284000, likes:18400, comments:1260, shares:3100 },
  { id:'__s7__', title:'Stop doing this if you want to scale past £10k/m', status:'Published', agent:'echo', desc:'Contrarian hook. High comment rate drove algorithm push on Reels.', views:147000, likes:9200, comments:890, shares:1450 },
  { id:'__s8__', title:'How I run 9 AI agents from my phone', status:'Published', agent:'luna', desc:'Screen-record walkthrough of Telegram + Mission Control mobile.', views:92000, likes:5800, comments:420, shares:710 },
];

// ── State ──
let _cpCards = [];
let _cpViewMode = (typeof S !== 'undefined' && S.contentView) || 'table';
let _cpFilter = 'All';
let _cpSort = { col: 'status', dir: 'asc' };
let _cpSearch = '';

// ── Data loading ──
async function loadCpCards() {
  try {
    const rows = await sbQuery('content_tracker', { 'deleted_at': 'is.null', order: 'created_at.asc', limit: 200 });
    _cpCards = (rows || []).map(r => ({
      id: r.id, title: r.title, status: r.stage,
      agent: r.assigned_to || '',
      desc: r.description || '', due_date: r.due_date || '',
      content_type: r.content_type || '',
      views: Number(r.views) || 0,
      likes: Number(r.likes) || 0,
      comments: Number(r.comments) || 0,
      shares: Number(r.shares) || 0
    }));
    return _cpCards.length > 0 ? _cpCards : CP_SAMPLE_CARDS;
  } catch(e) { console.warn('[Content] loadCpCards failed, using samples:', e); return CP_SAMPLE_CARDS; }
}

// ── Stats strip (performance metrics) ──
function _renderCpStats(cards) {
  var el = document.getElementById('cp-stats');
  if (!el) return;

  var published = cards.filter(function(c) { return c.status === 'Published'; });
  var totalViews = published.reduce(function(s, c) { return s + (c.views || 0); }, 0);
  var totalLikes = published.reduce(function(s, c) { return s + (c.likes || 0); }, 0);
  var totalComments = published.reduce(function(s, c) { return s + (c.comments || 0); }, 0);
  var totalShares = published.reduce(function(s, c) { return s + (c.shares || 0); }, 0);

  var stat = function(label, val, color, icon) {
    return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;box-shadow:var(--shadow-xs);transition:box-shadow 0.18s,transform 0.18s" onmouseenter="this.style.boxShadow=\'var(--shadow-md)\';this.style.transform=\'translateY(-1px)\'" onmouseleave="this.style.boxShadow=\'var(--shadow-xs)\';this.style.transform=\'none\'">' +
      '<div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:6px;white-space:nowrap"><i class="ph-thin ' + icon + '"></i> ' + label + '</div>' +
      '<div style="font-size:22px;font-weight:700;color:' + (color || 'var(--text-primary)') + '">' + val + '</div></div>';
  };

  el.innerHTML =
    stat('Total Views', _cpFmtNum(totalViews), 'var(--text-primary)', 'ph-eye') +
    stat('Likes', _cpFmtNum(totalLikes), 'var(--red)', 'ph-heart') +
    stat('Comments', _cpFmtNum(totalComments), 'var(--blue)', 'ph-chat-circle') +
    stat('Shares', _cpFmtNum(totalShares), 'var(--green)', 'ph-share-network');
}

// ── View toggle ──
function toggleContentView() {
  _cpViewMode = _cpViewMode === 'table' ? 'board' : 'table';
  var btn = document.getElementById('cp-view-toggle');
  if (btn) {
    btn.innerHTML = _cpViewMode === 'table'
      ? '<i class="ph-thin ph-squares-four"></i> Board'
      : '<i class="ph-thin ph-list"></i> Table';
  }
  _renderCpView();
}

// ── Main entry ──
async function renderContentPlanner() {
  var cards = await loadCpCards();
  _renderCpStats(cards);
  _renderCpView();
}

function _renderCpView() {
  // Apply saved default on first render
  if (typeof S !== 'undefined' && S.contentView && !_renderCpView._init) {
    _cpViewMode = S.contentView;
    _renderCpView._init = true;
  }
  // Sync toggle button label
  var btn = document.getElementById('cp-view-toggle');
  if (btn) {
    btn.innerHTML = _cpViewMode === 'table'
      ? '<i class="ph-thin ph-squares-four"></i> Board'
      : '<i class="ph-thin ph-list"></i> Table';
  }
  if (_cpViewMode === 'board') {
    _renderCpBoard();
  } else {
    _renderCpTable();
  }
}

// ── Platform badges (all platforms) ──
function _cpPlatformBadges() {
  return '<span style="display:inline-flex;gap:3px;align-items:center">' +
    '<span style="padding:1px 5px;border-radius:6px;background:var(--text-primary)12;color:var(--text-secondary);font-weight:700;font-size:8px;letter-spacing:0.02em">TT</span>' +
    '<span style="padding:1px 5px;border-radius:6px;background:var(--red)12;color:var(--red);font-weight:700;font-size:8px;letter-spacing:0.02em">YT</span>' +
    '<span style="padding:1px 5px;border-radius:6px;background:var(--purple)12;color:var(--purple);font-weight:700;font-size:8px;letter-spacing:0.02em">IG</span>' +
    '<span style="padding:1px 5px;border-radius:6px;background:var(--blue)12;color:var(--blue);font-weight:700;font-size:8px;letter-spacing:0.02em">FB</span>' +
  '</span>';
}

// ── Performance mini-stats (for published cards) ──
function _cpPerfLine(c) {
  if (c.status !== 'Published' || (!c.views && !c.likes)) return '';
  return '<div style="display:flex;gap:8px;align-items:center;font-size:10px;color:var(--text-muted);margin-top:6px">' +
    (c.views ? '<span><i class="ph-thin ph-eye" style="margin-right:2px"></i>' + _cpFmtNum(c.views) + '</span>' : '') +
    (c.likes ? '<span style="color:var(--red)"><i class="ph-thin ph-heart" style="margin-right:2px"></i>' + _cpFmtNum(c.likes) + '</span>' : '') +
    (c.comments ? '<span style="color:var(--blue)"><i class="ph-thin ph-chat-circle" style="margin-right:2px"></i>' + _cpFmtNum(c.comments) + '</span>' : '') +
    (c.shares ? '<span style="color:var(--green)"><i class="ph-thin ph-share-network" style="margin-right:2px"></i>' + _cpFmtNum(c.shares) + '</span>' : '') +
  '</div>';
}

// ── Agent avatar helper (scorecard style) ──
function _cpAgentAvatar(agentId, size) {
  if (!agentId) return '';
  var sz = size || 22;
  var ag = agentInfo(agentId);
  if (!ag) return '<span style="font-size:10px;color:var(--text-muted)">' + escHtml(agentId) + '</span>';
  var inner = ag.avatar
    ? '<img src="' + ag.avatar + '?v=' + AVATAR_BUST + '" alt="' + escHtml(ag.name) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;pointer-events:none;position:absolute;inset:0" onerror="_avErr(this)"><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:' + Math.round(sz * 0.55) + 'px">' + ag.emoji + '</span>'
    : '<span style="font-size:' + Math.round(sz * 0.55) + 'px;pointer-events:none">' + ag.emoji + '</span>';
  return '<span style="display:inline-flex;align-items:center;justify-content:center;width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;overflow:hidden;flex-shrink:0;position:relative">' + inner + '</span>';
}

function _cpAgentCell(agentId) {
  if (!agentId) return '<span style="color:var(--text-muted)">\u2014</span>';
  var ag = agentInfo(agentId);
  var name = ag ? ag.name : agentId;
  return '<div style="display:flex;align-items:center;gap:6px">' +
    _cpAgentAvatar(agentId, 22) +
    '<span style="font-size:11px;color:var(--text-secondary);white-space:nowrap">' + escHtml(name) + '</span>' +
  '</div>';
}

// ── Board view (kanban) ──
function _renderCpBoard() {
  var wrap = document.getElementById('cp-view-wrap');
  if (!wrap) return;
  var cards = _cpCards.length > 0 ? _cpCards : CP_SAMPLE_CARDS;
  if (_cpSearch) {
    var q = _cpSearch.toLowerCase();
    cards = cards.filter(function(c) {
      return (c.title || '').toLowerCase().includes(q) ||
        (c.desc || '').toLowerCase().includes(q) ||
        (c.agent || '').toLowerCase().includes(q);
    });
  }

  // Filter pills
  var statuses = ['All'].concat(CP_COLUMNS);
  var statusCounts = {};
  statuses.forEach(function(s) {
    statusCounts[s] = s === 'All' ? cards.length : cards.filter(function(c) { return c.status === s; }).length;
  });

  var html = _renderFilterPills(statuses, statusCounts, _cpFilter, CP_COL_COLORS, function(f) {
    return "_cpFilter='" + f + "';_renderCpView()";
  });

  html += '<div class="cp-board">';
  CP_COLUMNS.forEach(function(col) {
    var colCards = cards.filter(function(c) { return c.status === col; });
    var color = CP_COL_COLORS[col] || 'var(--gray)';
    var icon  = CP_COL_ICONS[col] || '';
    var showCards = _cpFilter === 'All' || _cpFilter === col;
    html += '<div class="cp-col">';
    html += '<div class="cp-col-header" style="border-top-color:' + color + '">';
    html += '<span>' + icon + ' ' + col + '</span>';
    html += '<span class="cp-col-count" style="color:' + color + '">' + colCards.length + '</span>';
    html += '</div>';
    if (showCards) {
      colCards.forEach(function(c) {
        var isDemo = c.id.startsWith('__s');
        html += '<div class="cp-card" onclick="' + (isDemo ? "cpAddCard('" + col + "')" : "cpEditCard('" + c.id + "')") + '">';
        html += '<div class="cp-card-title">' + escHtml(c.title || 'Untitled') + '</div>';
        if (c.desc) html += '<div class="cp-card-desc">' + escHtml(c.desc) + '</div>';
        html += '<div class="cp-card-meta">';
        html += _cpPlatformBadges();
        if (c.agent) html += '<span style="display:inline-flex;align-items:center;gap:4px">' + _cpAgentAvatar(c.agent, 18) + '<span style="font-size:9px;font-weight:600;color:var(--text-secondary)">' + escHtml((agentInfo(c.agent)||{}).name || c.agent) + '</span></span>';
        if (c.due_date) html += '<span style="font-size:9px;color:var(--text-muted);margin-left:auto"><i class="ph-thin ph-calendar"></i> ' + _cpFmtDate(c.due_date) + '</span>';
        if (isDemo) html += '<span style="font-size:9px;opacity:0.4;margin-left:auto">sample</span>';
        html += '</div>';
        html += _cpPerfLine(c);
        html += '</div>';
      });
      html += '<button class="cp-add-card" onclick="cpAddCard(\'' + col + '\')">+ Add</button>';
    }
    html += '</div>';
  });
  html += '</div>';

  wrap.innerHTML = html;
}

// ── Table view ──
function _renderCpTable() {
  var wrap = document.getElementById('cp-view-wrap');
  if (!wrap) return;
  var cards = _cpCards.length > 0 ? _cpCards : CP_SAMPLE_CARDS;
  if (_cpSearch) {
    var q = _cpSearch.toLowerCase();
    cards = cards.filter(function(c) {
      return (c.title || '').toLowerCase().includes(q) ||
        (c.desc || '').toLowerCase().includes(q) ||
        (c.agent || '').toLowerCase().includes(q);
    });
  }

  // Filter pills
  var statuses = ['All'].concat(CP_COLUMNS);
  var statusCounts = {};
  statuses.forEach(function(s) {
    statusCounts[s] = s === 'All' ? cards.length : cards.filter(function(c) { return c.status === s; }).length;
  });

  var html = _renderFilterPills(statuses, statusCounts, _cpFilter, CP_COL_COLORS, function(f) {
    return "_cpFilter='" + f + "';_renderCpView()";
  });

  // Filter + sort
  var filtered = _filterAndSort(cards, _cpFilter, function(c) { return c.status; }, _cpSort, ['views', 'likes', 'comments', 'shares']);

  if (filtered.length === 0) {
    var msg = cards.length ? 'No content matches your filters' : 'No content yet — click "+ New Piece" to get started';
    html += '<div style="padding:60px 20px;text-align:center"><div style="font-size:36px;opacity:0.3;margin-bottom:12px"><i class="ph-thin ph-video-camera"></i></div><div style="font-size:12px;color:var(--text-muted)">' + msg + '</div></div>';
    wrap.innerHTML = html;
    return;
  }

  var columns = [
    { key: 'title',    label: 'TITLE',     flex: '2' },
    { key: 'status',   label: 'STAGE',     flex: '0.6' },
    { key: 'agent',    label: 'ASSIGNED',  flex: '0.8' },
    { key: 'views',    label: 'VIEWS',     flex: '0.6', align: 'right' },
    { key: 'likes',    label: 'LIKES',     flex: '0.5', align: 'right' },
    { key: 'comments', label: 'COMMENTS',  flex: '0.5', align: 'right' },
    { key: 'shares',   label: 'SHARES',    flex: '0.5', align: 'right' },
  ];

  var sortIcon = function(col) { return _sortIcon(_cpSort, col); };
  var isMobile = window.innerWidth <= 768;

  if (isMobile) {
    // Mobile: card layout
    html += '<div style="display:flex;flex-direction:column;gap:10px">';
    filtered.forEach(function(c) {
      var st = c.status || 'Idea';
      var clr = CP_COL_COLORS[st] || 'var(--gray)';
      var isDemo = c.id.startsWith('__s');
      html += '<div onclick="' + (isDemo ? "cpAddCard('" + st + "')" : "cpEditCard('" + c.id + "')") + '" style="background:var(--surface);border:1px solid var(--border-light);border-left:3px solid ' + clr + ';border-radius:var(--radius);padding:14px;cursor:pointer">';
      html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">';
      html += '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(c.title || 'Untitled') + '</div></div>';
      html += '<span style="padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:' + clr + '14;color:' + clr + ';flex-shrink:0">' + escHtml(st) + '</span>';
      html += '</div>';
      if (c.desc) html += '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + escHtml(c.desc) + '</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:11px;color:var(--text-muted)">';
      html += _cpPlatformBadges();
      if (c.agent) html += '<span style="display:inline-flex;align-items:center;gap:4px">' + _cpAgentAvatar(c.agent, 16) + '<span style="font-size:10px;font-weight:600;color:var(--text-secondary)">' + escHtml((agentInfo(c.agent)||{}).name || c.agent) + '</span></span>';
      if (c.due_date) html += '<span style="margin-left:auto"><i class="ph-thin ph-calendar"></i> ' + _cpFmtDate(c.due_date) + '</span>';
      html += '</div>';
      html += _cpPerfLine(c);
      html += '</div>';
    });
    html += '</div>';
  } else {
    // Desktop: table
    html += '<div style="border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--surface)">';
    // Header
    html += '<div style="display:flex;border-bottom:1px solid var(--border);background:var(--surface-2)">';
    columns.forEach(function(c) {
      var textAlign = c.align === 'right' ? 'justify-content:flex-end;text-align:right;' : '';
      html += '<div onclick="_cpSort={col:\'' + c.key + '\',dir:_cpSort.col===\'' + c.key + '\'&&_cpSort.dir===\'asc\'?\'desc\':\'asc\'};_renderCpView()" style="flex:' + c.flex + ';padding:10px 14px;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;cursor:pointer;user-select:none;display:flex;align-items:center;white-space:nowrap;' + textAlign + '">' + c.label + sortIcon(c.key) + '</div>';
    });
    html += '</div>';

    // Rows
    filtered.forEach(function(c) {
      var st = c.status || 'Idea';
      var clr = CP_COL_COLORS[st] || 'var(--gray)';
      var isDemo = c.id.startsWith('__s');

      html += '<div onclick="' + (isDemo ? "cpAddCard('" + st + "')" : "cpEditCard('" + c.id + "')") + '" style="display:flex;border-bottom:1px solid var(--border-light);cursor:pointer;transition:background 0.1s" onmouseenter="this.style.background=\'var(--surface-2)\'" onmouseleave="this.style.background=\'var(--surface)\'">';

      // Title + platforms
      html += '<div style="flex:2;padding:10px 14px;min-width:0">';
      html += '<div style="font-size:12px;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(c.title || 'Untitled') + '</div>';
      html += '<div style="display:flex;align-items:center;gap:6px;margin-top:3px">' + _cpPlatformBadges() + '</div></div>';

      // Stage
      html += '<div style="flex:0.6;padding:10px 14px;display:flex;align-items:center">';
      html += '<span style="padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:' + clr + '14;color:' + clr + '">' + escHtml(st) + '</span>';
      html += '</div>';

      // Agent (avatar + name)
      html += '<div style="flex:0.8;padding:10px 14px;display:flex;align-items:center">';
      html += _cpAgentCell(c.agent);
      html += '</div>';

      // Views
      html += '<div style="flex:0.6;padding:10px 14px;font-size:12px;display:flex;align-items:center;justify-content:flex-end;font-variant-numeric:tabular-nums">';
      html += c.views ? '<span style="font-weight:600;color:var(--text-primary)">' + _cpFmtNum(c.views) + '</span>' : '<span style="color:var(--text-muted)">\u2014</span>';
      html += '</div>';

      // Likes
      html += '<div style="flex:0.5;padding:10px 14px;font-size:12px;display:flex;align-items:center;justify-content:flex-end;font-variant-numeric:tabular-nums">';
      html += c.likes ? '<span style="font-weight:600;color:var(--red)">' + _cpFmtNum(c.likes) + '</span>' : '<span style="color:var(--text-muted)">\u2014</span>';
      html += '</div>';

      // Comments
      html += '<div style="flex:0.5;padding:10px 14px;font-size:12px;display:flex;align-items:center;justify-content:flex-end;font-variant-numeric:tabular-nums">';
      html += c.comments ? '<span style="font-weight:600;color:var(--blue)">' + _cpFmtNum(c.comments) + '</span>' : '<span style="color:var(--text-muted)">\u2014</span>';
      html += '</div>';

      // Shares
      html += '<div style="flex:0.5;padding:10px 14px;font-size:12px;display:flex;align-items:center;justify-content:flex-end;font-variant-numeric:tabular-nums">';
      html += c.shares ? '<span style="font-weight:600;color:var(--green)">' + _cpFmtNum(c.shares) + '</span>' : '<span style="color:var(--text-muted)">\u2014</span>';
      html += '</div>';

      html += '</div>';
    });
    html += '</div>';
  }

  wrap.innerHTML = html;
}

// ── Helpers ──
function _cpFmtDate(d) {
  if (!d) return '';
  var dt = new Date(d);
  if (isNaN(dt)) return d;
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return dt.getDate() + ' ' + months[dt.getMonth()];
}

function _cpFmtNum(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

// ── Card actions ──
async function cpAddCard(status) {
  var title = prompt('New content piece for "' + status + '":'); if (!title) return;
  var agent = prompt('Assigned agent? (echo / sola / luna / etc)') || '';
  try {
    await sbInsert('content_tracker', { title: title, stage: status, assigned_to: agent || null });
    renderContentPlanner();
  } catch(e) { showToast('Failed to add card: ' + e.message); }
}

async function cpEditCard(id) {
  var card = _cpCards.find(function(c) { return c.id === id; }); if (!card) return;
  var newStatus = prompt('Move "' + card.title + '" to:\n' + CP_COLUMNS.join(' / '), card.status);
  if (!newStatus || CP_COLUMNS.indexOf(newStatus) < 0) return;
  try {
    await sbUpdate('content_tracker', id, { stage: newStatus, updated_at: new Date().toISOString() });
    renderContentPlanner();
  } catch(e) { showToast('Failed to update card: ' + e.message); }
}

document.getElementById('cp-add-btn').addEventListener('click', function() { cpAddCard('Idea'); });

// ── Search wiring (200ms debounce) ──
(function() {
  var _t;
  document.addEventListener('DOMContentLoaded', function() {
    var inp = document.getElementById('cp-search');
    if (inp) inp.addEventListener('input', function() {
      clearTimeout(_t);
      _t = setTimeout(function() {
        _cpSearch = inp.value.trim();
        _renderCpView();
      }, 200);
    });
  });
})();
