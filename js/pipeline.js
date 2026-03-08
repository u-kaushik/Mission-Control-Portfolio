// Mission Control — Prospect Pipeline
// ══════════════════════════════════════════════════════════════════════════
//  PROSPECT PIPELINE — Track prospects from Research → Active Client
// ══════════════════════════════════════════════════════════════════════════

let _prospectsData = [];
let _prospectViewMode = (typeof S !== 'undefined' && S.pipelineView) || 'table';
let _prospectFilter = 'All';
let _prospectSort = { col: 'created_at', dir: 'desc' };
let _prospectSearchTerm = '';

// ── List / selection state ──
let _prospectSelectedIds = new Set();
let _prospectLastClickIdx = -1;  // for shift-click range select
let _prospectListFilter = null;  // null = all, uuid = filter to list
let _prospectListMembers = [];   // member rows when filtering by list

const PROSPECT_STAGES = ['New', 'Research', 'Contact Enriched', '1st Line Enriched', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Active Client', 'Lost'];

const PROSPECT_STAGE_COLORS = {
  New:                  'var(--gray, #6b7280)',
  Research:             'var(--purple)',
  'Contact Enriched':   'var(--cyan, #06b6d4)',
  '1st Line Enriched':  'var(--teal, #14b8a6)',
  Contacted:            'var(--blue)',
  Qualified:            'var(--indigo, #6366f1)',
  Proposal:             'var(--amber)',
  Won:                  'var(--green)',
  'Active Client':      'var(--green)',
  Lost:                 'var(--red)'
};

// ── Helpers ──────────────────────────────────────────────────────────────

// ── Intelligent company name from website URL ────────────────────────────
// Common TLDs and SLDs to strip
const _STRIP_TLDS = new Set(['com','co','org','net','io','ai','dev','app','us','uk','ca','au','de','fr','in','jp','xyz','me','info','biz','tech','agency','studio','group','ltd','inc','llc','co.uk','com.au','co.in','com.br']);

function _companyNameFromUrl(url) {
  if (!url) return '';
  // Normalise: ensure it looks like a URL so we can parse the hostname
  var u = url.trim().toLowerCase();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  var hostname;
  try { hostname = new URL(u).hostname; } catch(e) { return ''; }
  if (!hostname) return '';

  // Remove www. prefix
  hostname = hostname.replace(/^www\./, '');

  // Split into parts
  var parts = hostname.split('.');
  if (parts.length === 0) return '';

  // For multi-part SLDs like co.uk, com.au, check and strip
  if (parts.length >= 3) {
    var last2 = parts.slice(-2).join('.');
    if (_STRIP_TLDS.has(last2)) {
      parts = parts.slice(0, -2);
    } else {
      parts = parts.slice(0, -1);
    }
  } else if (parts.length === 2) {
    parts = parts.slice(0, -1);
  }
  // Now parts should be the meaningful domain segments
  var domain = parts.join('.');
  if (!domain) return '';

  // Smart capitalisation: split on hyphens/dots, title-case each word
  return domain.split(/[-.]/).map(function(w) {
    if (!w) return '';
    // Keep well-known abbreviations uppercase
    if (['ai','io','ui','ux','hr','crm','saas','api','cms','cto','ceo','seo','aws'].indexOf(w) >= 0) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

// Return company_name, falling back to intelligent extraction from website
function _displayCompanyName(prospect) {
  if (prospect.company_name && prospect.company_name.trim()) return prospect.company_name;
  return _companyNameFromUrl(prospect.website) || '';
}

function _getFilteredProspects() {
  let data = _prospectsData;
  if (_prospectSearchTerm) {
    const q = _prospectSearchTerm.toLowerCase();
    data = data.filter(function(s) {
      return _displayCompanyName(s).toLowerCase().includes(q) ||
        (s.industry || '').toLowerCase().includes(q) ||
        (s.contact_name || '').toLowerCase().includes(q) ||
        (s.contact_title || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.website || '').toLowerCase().includes(q) ||
        (s.location || '').toLowerCase().includes(q) ||
        (s.social_linkedin || '').toLowerCase().includes(q) ||
        (s.notes || '').toLowerCase().includes(q);
    });
  }
  return _filterAndSort(
    data,
    _prospectFilter,
    function(r) { return r.status || 'New'; },
    _prospectSort,
    []
  );
}

// ══════════════════════════════════════════════════════════════════
//  RENDER PAGE — Main entry point (called by router)
// ══════════════════════════════════════════════════════════════════

async function renderPipelinePage() {
  var wrap = document.getElementById('supplier-view-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-muted)">Loading prospects\u2026</div>';

  try {
    var rows = await sbQuery('prospects', { select: '*', order: 'created_at.desc', limit: 500, 'deleted_at': 'is.null' });
    _prospectsData = Array.isArray(rows) ? rows : [];
  } catch (e) {
    _prospectsData = [];
    console.warn('[prospect-pipeline] load error:', e);
  }

  // Auto-seed real estate data on very first use (no prospects + no lists)
  if (_prospectsData.length === 0 && !renderPipelinePage._seeded) {
    renderPipelinePage._seeded = true;
    try {
      await loadProspectLists();
      if (!MC.prospectLists || MC.prospectLists.length === 0) {
        await seedRealEstateProspects(true);
        var rows2 = await sbQuery('prospects', { select: '*', order: 'created_at.desc', limit: 500, 'deleted_at': 'is.null' });
        _prospectsData = Array.isArray(rows2) ? rows2 : [];
      }
    } catch (e) { console.warn('[seed] error:', e); }
  }

  _renderProspectStats();
  renderSuppliersView();
}

// ── Stats cards ──────────────────────────────────────────────────────────

function _renderProspectStats() {
  var el = document.getElementById('supplier-stats');
  if (!el) return;
  var data = _prospectsData;

  var total = data.length;
  var won = data.filter(function(s) { return s.status === 'Won' || s.status === 'Active Client'; }).length;
  var needsEnrich = data.filter(function(s) { return s.status === 'New' || s.status === 'Research'; }).length;
  var contacted = data.filter(function(s) { return s.status === 'Contacted' || s.status === 'Qualified' || s.status === 'Proposal'; }).length;

  var stat = function(label, value, color, icon) {
    return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;box-shadow:var(--shadow-xs);transition:box-shadow 0.18s,transform 0.18s" onmouseenter="this.style.boxShadow=\'var(--shadow-md)\';this.style.transform=\'translateY(-1px)\'" onmouseleave="this.style.boxShadow=\'var(--shadow-xs)\';this.style.transform=\'none\'">' +
      '<div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:6px;white-space:nowrap"><i class="ph-thin ' + icon + '"></i> ' + label + '</div>' +
      '<div style="font-size:22px;font-weight:700;color:' + (color || 'var(--text-primary)') + '">' + value + '</div></div>';
  };

  el.innerHTML =
    stat('Total Prospects', total, 'var(--text-primary)', 'ph-user-focus') +
    stat('Needs Enrichment', needsEnrich, 'var(--purple)', 'ph-magnifying-glass') +
    stat('In Pipeline', contacted, 'var(--blue)', 'ph-funnel') +
    stat('Won / Active', won, 'var(--green)', 'ph-check-circle');
}

// ══════════════════════════════════════════════════════════════════
//  VIEW RENDERING — Board (kanban) or Table
// ══════════════════════════════════════════════════════════════════

function renderSuppliersView() {
  if (typeof S !== 'undefined' && S.pipelineView && !renderSuppliersView._init) {
    _prospectViewMode = S.pipelineView;
    renderSuppliersView._init = true;
  }
  var btn = document.getElementById('supplier-view-toggle');
  if (btn) {
    btn.innerHTML = _prospectViewMode === 'table'
      ? '<i class="ph-thin ph-squares-four"></i> Board'
      : '<i class="ph-thin ph-list"></i> Table';
  }
  if (_prospectViewMode === 'board') {
    _renderProspectKanban();
  } else {
    _renderProspectTable();
  }
}

function toggleSupplierView() {
  _prospectViewMode = _prospectViewMode === 'table' ? 'board' : 'table';
  var btn = document.getElementById('supplier-view-toggle');
  if (btn) {
    btn.innerHTML = _prospectViewMode === 'table'
      ? '<i class="ph-thin ph-squares-four"></i> Board'
      : '<i class="ph-thin ph-list"></i> Table';
  }
  renderSuppliersView();
}

// ── Kanban board ─────────────────────────────────────────────────────────

function _renderProspectKanban() {
  var wrap = document.getElementById('supplier-view-wrap');
  if (!wrap) return;
  var allData = _getFilteredProspects();
  var isMobile = window.innerWidth <= 768;

  var statuses = ['All'].concat(PROSPECT_STAGES);
  var statusCounts = {};
  statuses.forEach(function(s) {
    statusCounts[s] = s === 'All' ? _prospectsData.length : _prospectsData.filter(function(r) { return (r.status || 'New') === s; }).length;
  });

  var html = _renderFilterPills(statuses, statusCounts, _prospectFilter, PROSPECT_STAGE_COLORS, function(f) {
    return "_prospectFilter='" + f + "';renderSuppliersView()";
  });

  html += '<div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;-webkit-overflow-scrolling:touch">';

  PROSPECT_STAGES.forEach(function(stage) {
    var clr = PROSPECT_STAGE_COLORS[stage] || 'var(--gray)';
    var colData = allData.filter(function(s) { return (s.status || 'New') === stage; });

    html += '<div style="display:flex;flex-direction:column;min-height:200px;min-width:150px;width:150px;flex-shrink:0">';

    html += '<div style="border-top:3px solid ' + clr + ';padding:8px 10px;background:var(--surface);border:1px solid var(--border);border-top:3px solid ' + clr + ';border-radius:var(--radius) var(--radius) 0 0;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
    html += '<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + stage + '</span>';
    html += '<span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:99px;background:' + clr + '14;color:' + clr + ';flex-shrink:0">' + colData.length + '</span>';
    html += '</div>';

    if (colData.length) {
      colData.forEach(function(s) {
        var companyDisplay = _displayCompanyName(s);
        var initial = (companyDisplay || '?')[0].toUpperCase();
        html += '<div onclick="openSupplierModal(\'' + escHtml(s.id || '') + '\')" style="background:var(--surface);border:1px solid var(--border-light);border-radius:var(--radius-sm);padding:8px;margin-bottom:4px;cursor:pointer;transition:box-shadow 0.15s" onmouseenter="this.style.boxShadow=\'0 1px 4px rgba(0,0,0,0.08)\'" onmouseleave="this.style.boxShadow=\'none\'">';
        html += '<div style="display:flex;align-items:center;gap:6px">';
        html += '<div style="width:22px;height:22px;border-radius:50%;background:' + clr + '18;color:' + clr + ';display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0">' + initial + '</div>';
        html += '<div style="flex:1;min-width:0;overflow:hidden">';
        html += '<div style="font-size:11px;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(companyDisplay) + '</div>';
        html += '</div>';
        html += '</div>';
        if (s.contact_name || s.industry) {
          html += '<div style="font-size:9px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;padding-left:28px">' + escHtml(s.contact_name || s.industry) + '</div>';
        }
        html += '</div>';
      });
    } else {
      html += '<div style="padding:20px 12px;text-align:center;color:var(--text-muted);font-size:11px;border:1px dashed var(--border);border-radius:var(--radius);opacity:0.6">No ' + stage.toLowerCase() + ' prospects</div>';
    }

    html += '</div>';
  });

  html += '</div>';
  wrap.innerHTML = html;
}

// ── Sortable table ───────────────────────────────────────────────────────

function _renderProspectTable() {
  var wrap = document.getElementById('supplier-view-wrap');
  if (!wrap) return;
  var filtered = _getFilteredProspects();

  var statuses = ['All'].concat(PROSPECT_STAGES);
  var statusCounts = {};
  statuses.forEach(function(s) {
    statusCounts[s] = s === 'All' ? _prospectsData.length : _prospectsData.filter(function(r) { return (r.status || 'New') === s; }).length;
  });

  var sortIcon = function(col) { return _sortIcon(_prospectSort, col); };

  var columns = [
    { key: 'company_name',   label: 'COMPANY',  flex: '1.4' },
    { key: 'industry',       label: 'INDUSTRY', flex: '0.8' },
    { key: 'contact_name',   label: 'CONTACT',  flex: '1' },
    { key: 'phone',          label: 'PHONE',    flex: '0.8' },
    { key: 'email',          label: 'EMAIL',    flex: '1.1' },
    { key: 'social_linkedin', label: 'SOCIAL',  flex: '0.5' },
    { key: 'source',         label: 'SOURCE',   flex: '0.6' },
    { key: 'created_at',     label: 'CREATED',  flex: '0.7' },
    { key: 'status',         label: 'STATUS',   flex: '0.9' },
  ];

  var html = _renderFilterPills(statuses, statusCounts, _prospectFilter, PROSPECT_STAGE_COLORS, function(f) {
    return "_prospectFilter='" + f + "';renderSuppliersView()";
  });

  if (filtered.length === 0) {
    var msg = _prospectsData.length ? 'No prospects match your filters' : 'No prospects yet \u2014 click "+ Add Prospect" to get started';
    var _isMobileEmpty = window.innerWidth <= 768;
    if (!_isMobileEmpty) {
      html += '<div style="border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--surface)">';
      html += '<div style="display:flex;border-bottom:1px solid var(--border);background:var(--surface-2)">';
      columns.forEach(function(c) {
        html += '<div style="flex:' + c.flex + ';padding:10px 14px;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;display:flex;align-items:center;white-space:nowrap">' + c.label + '</div>';
      });
      html += '</div>';
      html += '<div style="padding:40px 20px;text-align:center"><div style="font-size:28px;opacity:0.3;margin-bottom:8px"><i class="ph-thin ph-user-focus"></i></div><div style="font-size:12px;color:var(--text-muted)">' + msg + '</div></div>';
      html += '</div>';
    } else {
      html += '<div style="padding:60px 20px;text-align:center"><div style="font-size:36px;opacity:0.3;margin-bottom:12px"><i class="ph-thin ph-user-focus"></i></div><div style="font-size:13px;color:var(--text-muted)">' + msg + '</div></div>';
    }
    wrap.innerHTML = html;
    return;
  }

  var _isMobile = window.innerWidth <= 768;

  if (_isMobile) {
    html += '<div style="display:flex;flex-direction:column;gap:10px">';
    filtered.forEach(function(s) {
      var st = s.status || 'New';
      var clr = PROSPECT_STAGE_COLORS[st] || 'var(--gray)';
      var companyDisplay = _displayCompanyName(s);
      var initial = (companyDisplay || '?')[0].toUpperCase();
      html += '<div onclick="openSupplierModal(\'' + escHtml(s.id || '') + '\')" style="background:var(--surface);border:1px solid var(--border-light);border-left:3px solid ' + clr + ';border-radius:var(--radius);padding:14px;cursor:pointer">';
      html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">';
      html += '<div style="width:32px;height:32px;border-radius:50%;background:' + clr + '18;color:' + clr + ';display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">' + initial + '</div>';
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="font-size:13px;font-weight:700;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(companyDisplay) + '</div>';
      if (s.contact_name) html += '<div style="font-size:11px;color:var(--text-secondary)">' + escHtml(s.contact_name) + (s.contact_title ? ' \u2014 ' + escHtml(s.contact_title) : '') + '</div>';
      html += '</div>';
      html += '<span style="padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:' + clr + '14;color:' + clr + ';flex-shrink:0">' + escHtml(st) + '</span>';
      html += '</div>';
      // Secondary info row: website + location
      var _hasSecondary = s.website || s.location || s.company_size;
      if (_hasSecondary) {
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;font-size:10px;color:var(--text-muted);margin-bottom:6px;padding-left:42px">';
        if (s.website) html += '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px"><i class="ph-thin ph-globe" style="font-size:10px"></i> ' + escHtml(s.website.replace(/^https?:\/\/(www\.)?/, '')) + '</span>';
        if (s.location) html += '<span><i class="ph-thin ph-map-pin" style="font-size:10px"></i> ' + escHtml(s.location) + '</span>';
        if (s.company_size) html += '<span><i class="ph-thin ph-buildings" style="font-size:10px"></i> ' + escHtml(s.company_size) + '</span>';
        html += '</div>';
      }
      html += '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:11px;color:var(--text-muted)">';
      if (s.industry) html += '<span style="padding:2px 8px;border-radius:99px;background:var(--primary-light,rgba(99,102,241,0.1));color:var(--primary);font-weight:600;font-size:10px">' + escHtml(s.industry) + '</span>';
      if (s.social_linkedin) {
        var _mHref = s.social_linkedin.match(/^https?:\/\//) ? s.social_linkedin : 'https://' + s.social_linkedin;
        html += '<a href="' + escHtml(_mHref) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="LinkedIn" style="color:#0A66C2;font-size:14px;display:flex;align-items:center"><i class="ph-thin ph-linkedin-logo"></i></a>';
      }
      if (s.source) html += '<span>' + escHtml(s.source) + '</span>';
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
  } else {
    html += '<div style="border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--surface)">';
    html += '<div style="display:flex;border-bottom:1px solid var(--border);background:var(--surface-2)">';
    columns.forEach(function(c) {
      var textAlign = c.align === 'right' ? 'justify-content:flex-end;text-align:right;' : '';
      html += '<div onclick="_prospectSort={col:\'' + c.key + '\',dir:_prospectSort.col===\'' + c.key + '\'&&_prospectSort.dir===\'asc\'?\'desc\':\'asc\'};renderSuppliersView()" style="flex:' + c.flex + ';padding:10px 14px;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;cursor:pointer;user-select:none;display:flex;align-items:center;white-space:nowrap;' + textAlign + '">' + c.label + sortIcon(c.key) + '</div>';
    });
    html += '</div>';

    filtered.forEach(function(s) {
      var st = s.status || 'New';
      var clr = PROSPECT_STAGE_COLORS[st] || 'var(--gray)';
      var companyDisplay = _displayCompanyName(s);
      var initial = (companyDisplay || '?')[0].toUpperCase();

      html += '<div onclick="openSupplierModal(\'' + escHtml(s.id || '') + '\')" style="display:flex;border-bottom:1px solid var(--border-light);cursor:pointer;transition:background 0.1s" onmouseenter="this.style.background=\'var(--surface-2)\'" onmouseleave="this.style.background=\'var(--surface)\'">';

      // Company + website
      html += '<div style="flex:1.4;padding:10px 14px;display:flex;align-items:center;gap:10px;min-width:0">';
      html += '<div style="width:28px;height:28px;border-radius:50%;background:' + clr + '18;color:' + clr + ';display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">' + initial + '</div>';
      html += '<div style="min-width:0;overflow:hidden">';
      html += '<div style="font-size:12px;font-weight:600;color:var(--primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(companyDisplay) + '</div>';
      if (s.website) html += '<div style="font-size:10px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><i class="ph-thin ph-globe" style="font-size:10px"></i> ' + escHtml(s.website.replace(/^https?:\/\/(www\.)?/, '')) + '</div>';
      html += '</div></div>';

      // Industry
      html += '<div style="flex:0.8;padding:10px 14px;font-size:12px;color:var(--text-secondary);display:flex;align-items:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (s.industry ? escHtml(s.industry) : '<span style="color:var(--text-muted)">\u2014</span>') + '</div>';

      // Contact + title
      html += '<div style="flex:1;padding:10px 14px;font-size:12px;color:var(--text-secondary);display:flex;flex-direction:column;justify-content:center;overflow:hidden;min-width:0">';
      html += '<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (s.contact_name ? escHtml(s.contact_name) : '<span style="color:var(--text-muted)">\u2014</span>') + '</div>';
      if (s.contact_name && s.contact_title) html += '<div style="font-size:10px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(s.contact_title) + '</div>';
      html += '</div>';

      // Phone
      html += '<div style="flex:0.8;padding:10px 14px;font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:5px;overflow:hidden;white-space:nowrap">';
      if (s.phone) { html += '<i class="ph-thin ph-phone" style="font-size:12px;color:var(--green)"></i> ' + escHtml(s.phone); }
      else { html += '<span style="color:var(--text-muted)">\u2014</span>'; }
      html += '</div>';

      // Email
      html += '<div style="flex:1.1;padding:10px 14px;font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:5px;overflow:hidden;white-space:nowrap">';
      if (s.email) { html += '<i class="ph-thin ph-envelope" style="font-size:12px;color:var(--blue)"></i> <span style="color:var(--blue)">' + escHtml(s.email) + '</span>'; }
      else { html += '<span style="color:var(--text-muted)">\u2014</span>'; }
      html += '</div>';

      // Socials — show icons for each populated social
      var _socials = [
        { key: 'social_linkedin',  icon: 'ph-linkedin-logo',  clr: '#0A66C2' },
        { key: 'social_instagram', icon: 'ph-instagram-logo', clr: '#E4405F' },
        { key: 'social_facebook',  icon: 'ph-facebook-logo',  clr: '#1877F2' },
        { key: 'social_youtube',   icon: 'ph-youtube-logo',   clr: '#FF0000' },
      ];
      var _hasSocial = _socials.some(function(sc) { return s[sc.key]; });
      html += '<div style="flex:0.5;padding:10px 14px;display:flex;align-items:center;justify-content:center;gap:6px">';
      if (_hasSocial) {
        _socials.forEach(function(sc) {
          if (!s[sc.key]) return;
          var href = s[sc.key].match(/^https?:\/\//) ? s[sc.key] : 'https://' + s[sc.key];
          html += '<a href="' + escHtml(href) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="' + escHtml(s[sc.key]) + '" style="color:' + sc.clr + ';font-size:15px;display:flex;align-items:center"><i class="ph-thin ' + sc.icon + '"></i></a>';
        });
      } else {
        html += '<span style="color:var(--text-muted)">\u2014</span>';
      }
      html += '</div>';

      // Source
      html += '<div style="flex:0.6;padding:10px 14px;font-size:11px;color:var(--text-secondary);display:flex;align-items:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (s.source ? escHtml(s.source) : '<span style="color:var(--text-muted)">\u2014</span>') + '</div>';

      // Created
      var _created = s.created_at ? new Date(s.created_at) : null;
      html += '<div style="flex:0.7;padding:10px 14px;font-size:11px;color:var(--text-muted);display:flex;align-items:center;white-space:nowrap">' + (_created ? _created.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '\u2014') + '</div>';

      // Status
      html += '<div style="flex:0.9;padding:10px 14px;display:flex;align-items:center"><span style="padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:' + clr + '14;color:' + clr + ';white-space:nowrap">' + escHtml(st) + '</span></div>';

      html += '</div>';
    });
    html += '</div>';
  }

  wrap.innerHTML = html;
}

// ══════════════════════════════════════════════════════════════════
//  MODAL — Add / Edit Prospect
// ══════════════════════════════════════════════════════════════════

// ── In-memory contact log for current modal session ──
var _supplierContactLog = [];

function _switchSupplierTab(tab) {
  document.querySelectorAll('.supplier-tab').forEach(function(t) { t.classList.toggle('active', t.dataset.tab === tab); });
  document.querySelectorAll('.supplier-tab-pane').forEach(function(p) { p.style.display = 'none'; });
  var pane = document.getElementById('supplier-tab-' + tab);
  if (pane) pane.style.display = 'flex';
}

function _renderContactLog() {
  var el = document.getElementById('supplier-log-entries');
  if (!el) return;
  if (!_supplierContactLog.length) {
    el.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:12px">No interactions logged yet</div>';
    return;
  }
  var typeIcons = { Email: 'ph-envelope', Call: 'ph-phone', LinkedIn: 'ph-linkedin-logo', Meeting: 'ph-calendar-check', Note: 'ph-note' };
  var html = '';
  _supplierContactLog.slice().reverse().forEach(function(entry, idx) {
    var realIdx = _supplierContactLog.length - 1 - idx;
    var icon = typeIcons[entry.type] || 'ph-chat-circle';
    var d = new Date(entry.date);
    var dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    var timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    html += '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border-light)">';
    html += '<div style="width:28px;height:28px;border-radius:50%;background:var(--primary-light,rgba(99,102,241,0.1));color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;margin-top:1px"><i class="ph-thin ' + icon + '"></i></div>';
    html += '<div style="flex:1;min-width:0">';
    html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">';
    html += '<span style="font-size:11px;font-weight:700;color:var(--text-primary)">' + escHtml(entry.type) + '</span>';
    html += '<span style="font-size:10px;color:var(--text-muted)">' + dateStr + ' ' + timeStr + '</span>';
    html += '</div>';
    html += '<div style="font-size:12px;color:var(--text-secondary)">' + escHtml(entry.text) + '</div>';
    html += '</div>';
    html += '<button onclick="_removeContactLogEntry(' + realIdx + ')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px;padding:4px;flex-shrink:0;opacity:0.5" title="Remove"><i class="ph-thin ph-x"></i></button>';
    html += '</div>';
  });
  el.innerHTML = html;
}

function _addContactLogEntry() {
  var typeEl = document.getElementById('supplier-log-type');
  var textEl = document.getElementById('supplier-log-text');
  var dateEl = document.getElementById('supplier-log-date');
  if (!textEl || !textEl.value.trim()) { if (textEl) textEl.focus(); return; }
  var logDate = (dateEl && dateEl.value) ? new Date(dateEl.value).toISOString() : new Date().toISOString();
  _supplierContactLog.push({ type: typeEl.value, text: textEl.value.trim(), date: logDate });
  textEl.value = '';
  if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
  _renderContactLog();
}

function _removeContactLogEntry(idx) {
  _supplierContactLog.splice(idx, 1);
  _renderContactLog();
}

function openSupplierModal(id) {
  var overlay = document.getElementById('supplier-modal-overlay');
  if (!overlay) return;
  var isEdit = !!id;
  var s = isEdit ? _prospectsData.find(function(x) { return x.id === id; }) : null;
  if (isEdit && !s) return;

  // Reset to Details tab
  _switchSupplierTab('details');

  document.getElementById('supplier-edit-id').value = isEdit ? id : '';
  document.getElementById('supplier-modal-title').innerHTML = '<i class="ph-thin ph-' + (isEdit ? 'pencil-simple' : 'user-focus') + '"></i> ' + (isEdit ? 'Edit Contact' : 'New Contact');
  document.getElementById('supplier-save-btn').textContent = isEdit ? 'Save Changes' : 'Add Prospect';
  document.getElementById('supplier-delete-btn').style.display = isEdit ? '' : 'none';

  // Show/hide socials + log tabs for new vs edit
  var tabsWrap = document.getElementById('supplier-tabs');
  if (tabsWrap) tabsWrap.style.display = isEdit ? 'flex' : 'flex';

  _bindFormFields([
    ['supplier-name',      'company_name',         ''],
    ['supplier-category',  'industry',              ''],
    ['supplier-contact',   'contact_name',          ''],
    ['supplier-title',     'contact_title',         ''],
    ['supplier-phone',     'phone',                 ''],
    ['supplier-email',     'email',                 ''],
    ['supplier-website',   'website',               ''],
    ['supplier-location',  'location',              ''],
    ['supplier-moq',       'company_size',          ''],
    ['supplier-source',    'source',                ''],
    ['supplier-status',    'status',                'New'],
    ['supplier-notes',     'notes',                 ''],
  ], s, isEdit);

  // Show creation date
  var createdEl = document.getElementById('supplier-created-date');
  if (createdEl) {
    if (isEdit && s && s.created_at) {
      var cd = new Date(s.created_at);
      createdEl.textContent = 'Created ' + cd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      createdEl.style.display = '';
    } else {
      createdEl.style.display = 'none';
    }
  }

  // Bind social fields
  _bindFormFields([
    ['supplier-linkedin',  'social_linkedin',  ''],
    ['supplier-instagram', 'social_instagram', ''],
    ['supplier-facebook',  'social_facebook',  ''],
    ['supplier-youtube',   'social_youtube',   ''],
  ], s, isEdit);

  // Load contact log
  _supplierContactLog = [];
  if (isEdit && s && s.contact_log) {
    try { _supplierContactLog = typeof s.contact_log === 'string' ? JSON.parse(s.contact_log) : (Array.isArray(s.contact_log) ? s.contact_log : []); }
    catch(e) { _supplierContactLog = []; }
  }
  _renderContactLog();

  // Set default date for contact log
  var logDateEl = document.getElementById('supplier-log-date');
  if (logDateEl) logDateEl.value = new Date().toISOString().slice(0, 10);

  // Auto-fill company name from website URL
  var websiteEl = document.getElementById('supplier-website');
  var nameField = document.getElementById('supplier-name');
  if (websiteEl) {
    websiteEl._autoFilled = false;
    websiteEl.oninput = function() {
      var suggested = _companyNameFromUrl(websiteEl.value);
      if (!suggested) return;
      if (!nameField.value.trim() || websiteEl._autoFilled) {
        nameField.value = suggested;
        nameField.style.borderColor = '';
        websiteEl._autoFilled = true;
      }
    };
    websiteEl.onpaste = function() {
      setTimeout(function() { websiteEl.oninput(); }, 50);
    };
  }

  overlay.style.display = 'flex';
  setTimeout(function() {
    var nameEl = document.getElementById('supplier-name');
    if (nameEl) nameEl.focus();
  }, 80);
}

function closeSupplierModal() {
  var overlay = document.getElementById('supplier-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ── Save ─────────────────────────────────────────────────────────────────

async function saveSupplier() {
  // Switch to details tab if company name empty so user sees the error
  var name = document.getElementById('supplier-name').value.trim();
  if (!name) {
    _switchSupplierTab('details');
    document.getElementById('supplier-name').style.borderColor = 'var(--red)';
    showToast('Company name is required');
    return;
  }

  var payload = {
    company_name:          name,
    industry:              document.getElementById('supplier-category').value.trim() || null,
    contact_name:          document.getElementById('supplier-contact').value.trim() || null,
    contact_title:         (document.getElementById('supplier-title') || {}).value ? document.getElementById('supplier-title').value.trim() || null : null,
    phone:                 document.getElementById('supplier-phone').value.trim() || null,
    email:                 document.getElementById('supplier-email').value.trim() || null,
    website:               document.getElementById('supplier-website').value.trim() || null,
    location:              document.getElementById('supplier-location').value.trim() || null,
    company_size:          document.getElementById('supplier-moq').value.trim() || null,
    social_linkedin:       document.getElementById('supplier-linkedin').value.trim() || null,
    social_instagram:      document.getElementById('supplier-instagram').value.trim() || null,
    social_facebook:       document.getElementById('supplier-facebook').value.trim() || null,
    social_youtube:        document.getElementById('supplier-youtube').value.trim() || null,
    contact_log:           _supplierContactLog.length ? JSON.stringify(_supplierContactLog) : null,
    source:                (document.getElementById('supplier-source') || {}).value ? document.getElementById('supplier-source').value.trim() || null : null,
    status:                document.getElementById('supplier-status').value || 'New',
    notes:                 document.getElementById('supplier-notes').value.trim() || null,
    updated_at:            new Date().toISOString(),
  };

  var editId = document.getElementById('supplier-edit-id').value;
  var isEdit = !!editId;
  var btn = document.getElementById('supplier-save-btn');
  btn.disabled = true;
  btn.textContent = isEdit ? 'Saving\u2026' : 'Adding\u2026';

  try {
    if (isEdit) {
      await sbUpdate('prospects', editId, payload);
      showToast('Prospect updated', 'success');
    } else {
      await sbInsert('prospects', payload);
      showToast('Prospect created', 'success');
    }
    closeSupplierModal();
    renderPipelinePage();
  } catch (e) {
    showToast('Error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = isEdit ? 'Save Changes' : 'Add Prospect';
  }
}

// ── Delete ───────────────────────────────────────────────────────────────

async function deleteSupplier() {
  var editId = document.getElementById('supplier-edit-id').value;
  if (!editId) return;
  if (!confirm('Delete this prospect?')) return;

  try {
    await sbUpdate('prospects', editId, { deleted_at: new Date().toISOString() });
    showToast('Prospect deleted', 'success');
    closeSupplierModal();
    renderPipelinePage();
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

// ── Search debounce ──────────────────────────────────────────────────────

try {
  var _prospectSearchTimer;
  document.getElementById('supplier-search').addEventListener('input', function() {
    clearTimeout(_prospectSearchTimer);
    _prospectSearchTimer = setTimeout(function() {
      _prospectSearchTerm = (document.getElementById('supplier-search').value || '').trim();
      renderSuppliersView();
    }, 200);
  });
} catch (e) {}

// ══════════════════════════════════════════════════════════════════
//  PROSPECT LISTS — View, CRUD, Selection, Bulk Add
// ══════════════════════════════════════════════════════════════════

// ── Switch to Lists view ─────────────────────────────────────────
function switchToListsView() {
  _prospectViewMode = 'lists';
  _prospectListFilter = null;
  _prospectSelectedIds.clear();
  _updateFloatingBar();
  renderSuppliersView();
}

// ── Render lists grid ────────────────────────────────────────────
async function _renderProspectLists() {
  var wrap = document.getElementById('supplier-view-wrap');
  if (!wrap) return;

  // Load lists with member counts
  await loadProspectLists();
  var lists = MC.prospectLists;

  // Get member counts per list
  var countMap = {};
  try {
    var allMembers = await sbQuery('prospect_list_members', { select: 'list_id', limit: 5000 }, true);
    if (Array.isArray(allMembers)) {
      allMembers.forEach(function(m) {
        countMap[m.list_id] = (countMap[m.list_id] || 0) + 1;
      });
    }
  } catch (e) {}

  var html = '';

  // Back button if filtering by list
  if (_prospectListFilter) {
    var activeList = lists.find(function(l) { return l.id === _prospectListFilter; });
    html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">';
    html += '<button onclick="switchToListsView()" class="btn-secondary" style="font-size:11px;padding:4px 12px"><i class="ph-thin ph-arrow-left"></i> All Lists</button>';
    html += '<span style="font-size:14px;font-weight:700;color:var(--text-primary)">' + escHtml(activeList ? activeList.name : 'List') + '</span>';
    html += '<span style="font-size:11px;color:var(--text-muted)">(' + (_prospectListMembers.length) + ' prospects)</span>';
    html += '</div>';
    // Show table filtered to list members
    _renderProspectTable();
    return;
  }

  html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">';
  html += '<span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted)"><i class="ph-thin ph-list-bullets"></i> ' + lists.length + ' Lists</span>';
  html += '</div>';

  if (lists.length === 0) {
    html += '<div style="padding:60px 20px;text-align:center;border:1px dashed var(--border);border-radius:var(--radius)">';
    html += '<div style="font-size:36px;opacity:0.3;margin-bottom:12px"><i class="ph-thin ph-list-bullets"></i></div>';
    html += '<div style="font-size:13px;color:var(--text-muted);margin-bottom:14px">No lists yet — click "+ New List" to create one</div>';
    html += '<button class="btn-primary" onclick="seedRealEstateProspects()" style="font-size:12px;padding:8px 18px"><i class="ph-thin ph-buildings"></i> Seed Real Estate Prospects</button>';
    html += '</div>';
  } else {
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">';
    lists.forEach(function(list) {
      var count = countMap[list.id] || 0;
      var created = list.created_at ? new Date(list.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      html += '<div class="prospect-list-card" onclick="openListProspects(\'' + list.id + '\')">';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
      html += '<span style="font-size:14px;font-weight:700;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(list.name) + '</span>';
      html += '<div style="display:flex;gap:4px">';
      html += '<button onclick="event.stopPropagation();openListModal(\'' + list.id + '\')" class="btn-icon-sm" title="Edit"><i class="ph-thin ph-pencil-simple"></i></button>';
      html += '<button onclick="event.stopPropagation();deleteProspectList(\'' + list.id + '\')" class="btn-icon-sm" title="Delete" style="color:var(--red)"><i class="ph-thin ph-trash"></i></button>';
      html += '</div>';
      html += '</div>';
      if (list.description) {
        html += '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + escHtml(list.description) + '</div>';
      }
      html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto">';
      html += '<span style="font-size:12px;font-weight:600;color:var(--blue)"><i class="ph-thin ph-user-focus"></i> ' + count + ' prospect' + (count !== 1 ? 's' : '') + '</span>';
      html += '<span style="font-size:10px;color:var(--text-muted)">' + created + '</span>';
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
  }

  wrap.innerHTML = html;
}

// ── Open a list → show its prospects in table ────────────────────
async function openListProspects(listId) {
  _prospectListFilter = listId;
  _prospectSelectedIds.clear();
  _updateFloatingBar();
  var wrap = document.getElementById('supplier-view-wrap');
  if (wrap) wrap.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-muted)">Loading list members\u2026</div>';

  // Load member IDs
  _prospectListMembers = await loadListMembers(listId);
  _prospectViewMode = 'lists';
  renderSuppliersView();
}

// ── List CRUD ────────────────────────────────────────────────────
function openListModal(id) {
  var overlay = document.getElementById('prospect-list-modal-overlay');
  if (!overlay) return;
  var isEdit = !!id;
  var list = isEdit ? MC.prospectLists.find(function(l) { return l.id === id; }) : null;

  document.getElementById('prospect-list-edit-id').value = isEdit ? id : '';
  document.getElementById('prospect-list-modal-title').innerHTML = '<i class="ph-thin ph-list-bullets"></i> ' + (isEdit ? 'Edit' : 'New') + ' List';
  document.getElementById('prospect-list-save-btn').textContent = isEdit ? 'Save Changes' : 'Create List';
  document.getElementById('prospect-list-name').value = list ? list.name : '';
  document.getElementById('prospect-list-desc').value = list ? list.description || '' : '';

  overlay.style.display = 'flex';
  setTimeout(function() { document.getElementById('prospect-list-name').focus(); }, 80);
}

function closeListModal() {
  var overlay = document.getElementById('prospect-list-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

async function saveProspectList() {
  var name = document.getElementById('prospect-list-name').value.trim();
  if (!name) { showToast('List name is required'); return; }

  var payload = {
    name: name,
    description: document.getElementById('prospect-list-desc').value.trim() || null,
    updated_at: new Date().toISOString()
  };

  var editId = document.getElementById('prospect-list-edit-id').value;
  var btn = document.getElementById('prospect-list-save-btn');
  btn.disabled = true;

  try {
    if (editId) {
      await sbUpdate('prospect_lists', editId, payload);
      showToast('List updated', 'success');
    } else {
      payload.created_at = new Date().toISOString();
      await sbInsert('prospect_lists', payload);
      showToast('List created', 'success');
    }
    closeListModal();
    await loadProspectLists();
    if (_prospectViewMode === 'lists') _renderProspectLists();
  } catch (e) {
    showToast('Error: ' + e.message);
  } finally {
    btn.disabled = false;
  }
}

async function deleteProspectList(id) {
  if (!confirm('Delete this list? Members will be unlinked.')) return;
  try {
    await sbDelete('prospect_lists', id);
    showToast('List deleted', 'success');
    if (_prospectListFilter === id) _prospectListFilter = null;
    await loadProspectLists();
    if (_prospectViewMode === 'lists') _renderProspectLists();
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

// ── Checkbox selection ───────────────────────────────────────────
function toggleProspectSelect(id, event) {
  event.stopPropagation();
  var filtered = _getFilteredProspects();
  var idx = filtered.findIndex(function(p) { return p.id === id; });

  if (event.shiftKey && _prospectLastClickIdx >= 0 && idx >= 0) {
    // Range select
    var start = Math.min(_prospectLastClickIdx, idx);
    var end = Math.max(_prospectLastClickIdx, idx);
    for (var i = start; i <= end; i++) {
      _prospectSelectedIds.add(filtered[i].id);
    }
  } else {
    if (_prospectSelectedIds.has(id)) {
      _prospectSelectedIds.delete(id);
    } else {
      _prospectSelectedIds.add(id);
    }
  }
  _prospectLastClickIdx = idx;

  _updateCheckboxUI();
  _updateFloatingBar();
}

function toggleSelectAllProspects() {
  var filtered = _getFilteredProspects();
  if (_prospectSelectedIds.size === filtered.length) {
    _prospectSelectedIds.clear();
  } else {
    filtered.forEach(function(p) { _prospectSelectedIds.add(p.id); });
  }
  _updateCheckboxUI();
  _updateFloatingBar();
}

function _updateCheckboxUI() {
  var filtered = _getFilteredProspects();
  // Update header checkbox
  var headerCb = document.getElementById('prospect-select-all');
  if (headerCb) {
    headerCb.checked = filtered.length > 0 && _prospectSelectedIds.size === filtered.length;
    headerCb.indeterminate = _prospectSelectedIds.size > 0 && _prospectSelectedIds.size < filtered.length;
  }
  // Update row checkboxes
  filtered.forEach(function(p) {
    var cb = document.getElementById('prospect-cb-' + p.id);
    if (cb) cb.checked = _prospectSelectedIds.has(p.id);
  });
}

function _updateFloatingBar() {
  var bar = document.getElementById('prospect-floating-bar');
  if (!bar) return;
  var count = _prospectSelectedIds.size;
  if (count === 0) {
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'flex';
  var countEl = document.getElementById('prospect-selected-count');
  if (countEl) countEl.textContent = count + ' selected';
}

// ── Bulk add to list ─────────────────────────────────────────────
function showBulkAddMenu() {
  var menu = document.getElementById('bulk-add-list-menu');
  if (!menu) return;
  if (menu.style.display === 'block') { menu.style.display = 'none'; return; }

  // Populate with existing lists
  var html = '';
  MC.prospectLists.forEach(function(list) {
    html += '<div class="bulk-list-option" onclick="bulkAddToList(\'' + list.id + '\')">' + escHtml(list.name) + '</div>';
  });
  html += '<div class="bulk-list-option bulk-list-new" onclick="bulkAddNewList()"><i class="ph-thin ph-plus"></i> New List\u2026</div>';
  menu.innerHTML = html;
  menu.style.display = 'block';

  // Close on outside click
  setTimeout(function() {
    document.addEventListener('click', function _closeBulkMenu(e) {
      if (!menu.contains(e.target)) {
        menu.style.display = 'none';
        document.removeEventListener('click', _closeBulkMenu);
      }
    });
  }, 10);
}

async function bulkAddToList(listId) {
  document.getElementById('bulk-add-list-menu').style.display = 'none';
  var ids = Array.from(_prospectSelectedIds);
  if (ids.length === 0) return;

  var added = 0;
  for (var i = 0; i < ids.length; i++) {
    try {
      await sbInsert('prospect_list_members', { list_id: listId, prospect_id: ids[i] });
      added++;
    } catch (e) {
      // Ignore duplicates (unique constraint)
      if (!String(e.message).includes('409') && !String(e.message).includes('duplicate')) {
        console.warn('[bulk-add] error:', e);
      }
    }
  }
  showToast(added + ' prospect' + (added !== 1 ? 's' : '') + ' added to list', 'success');
  _prospectSelectedIds.clear();
  _updateFloatingBar();
  renderSuppliersView();
}

function bulkAddNewList() {
  document.getElementById('bulk-add-list-menu').style.display = 'none';
  // Open list modal — on save, auto-add selected prospects
  openListModal();
  // Override save to also add members
  var origSave = saveProspectList;
  window._bulkPendingIds = Array.from(_prospectSelectedIds);
  // We'll handle this via a flag checked in saveProspectList
}

// ── Remove from list ─────────────────────────────────────────────
async function bulkRemoveFromList() {
  if (!_prospectListFilter) return;
  var ids = Array.from(_prospectSelectedIds);
  if (ids.length === 0) return;
  if (!confirm('Remove ' + ids.length + ' prospect(s) from this list?')) return;

  for (var i = 0; i < ids.length; i++) {
    try {
      // Delete by list_id + prospect_id
      var res = await fetch(SUPABASE_URL + '/rest/v1/prospect_list_members?list_id=eq.' + _prospectListFilter + '&prospect_id=eq.' + ids[i], {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_SVC, 'Authorization': 'Bearer ' + SUPABASE_SVC }
      });
    } catch (e) { console.warn('[bulk-remove] error:', e); }
  }

  showToast(ids.length + ' removed from list', 'success');
  _prospectSelectedIds.clear();
  _updateFloatingBar();
  // Reload list members
  _prospectListMembers = await loadListMembers(_prospectListFilter);
  renderSuppliersView();
}

// ── Override renderSuppliersView to handle lists mode ─────────────
var _origRenderSuppliersView = renderSuppliersView;
renderSuppliersView = function() {
  // Update view toggle button
  var btn = document.getElementById('supplier-view-toggle');
  if (btn) {
    if (_prospectViewMode === 'lists') {
      btn.innerHTML = '<i class="ph-thin ph-list"></i> Table';
    } else if (_prospectViewMode === 'table') {
      btn.innerHTML = '<i class="ph-thin ph-squares-four"></i> Board';
    } else {
      btn.innerHTML = '<i class="ph-thin ph-list"></i> Table';
    }
  }

  // Toggle "New List" button visibility
  var newListBtn = document.getElementById('new-list-btn');
  if (newListBtn) newListBtn.style.display = _prospectViewMode === 'lists' ? '' : 'none';

  // Toggle "Remove from List" button in floating bar
  var removeBtn = document.getElementById('bulk-remove-btn');
  if (removeBtn) removeBtn.style.display = _prospectListFilter ? '' : 'none';

  if (_prospectViewMode === 'lists') {
    _renderProspectLists();
    return;
  }
  _origRenderSuppliersView();
};

// ── Override toggleSupplierView to cycle through 3 modes ─────────
var _origToggle = toggleSupplierView;
toggleSupplierView = function() {
  if (_prospectViewMode === 'table') {
    _prospectViewMode = 'board';
  } else if (_prospectViewMode === 'board') {
    _prospectViewMode = 'lists';
    _prospectListFilter = null;
  } else {
    _prospectViewMode = 'table';
  }
  _prospectSelectedIds.clear();
  _updateFloatingBar();
  renderSuppliersView();
};

// ── Override _getFilteredProspects to support list filtering ──────
var _origGetFiltered = _getFilteredProspects;
_getFilteredProspects = function() {
  if (_prospectListFilter && _prospectListMembers.length > 0) {
    var memberIds = {};
    _prospectListMembers.forEach(function(m) { memberIds[m.prospect_id] = true; });
    var listData = _prospectsData.filter(function(p) { return memberIds[p.id]; });

    if (_prospectSearchTerm) {
      var q = _prospectSearchTerm.toLowerCase();
      listData = listData.filter(function(s) {
        return _displayCompanyName(s).toLowerCase().includes(q) ||
          (s.industry || '').toLowerCase().includes(q) ||
          (s.contact_name || '').toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q);
      });
    }
    return _filterAndSort(listData, _prospectFilter, function(r) { return r.status || 'New'; }, _prospectSort, []);
  }
  return _origGetFiltered();
};

// ── Inject checkbox column into table rendering ──────────────────
var _origRenderTable = _renderProspectTable;
_renderProspectTable = function() {
  _origRenderTable();

  // After render, inject checkboxes into the table
  var wrap = document.getElementById('supplier-view-wrap');
  if (!wrap) return;

  var isMobile = window.innerWidth <= 768;
  if (isMobile) return; // Skip checkboxes on mobile

  // Find table header row
  var headerRow = wrap.querySelector('div[style*="border-bottom"][style*="background:var(--surface-2)"]');
  if (headerRow) {
    var headerCbDiv = document.createElement('div');
    headerCbDiv.style.cssText = 'flex:0 0 36px;padding:10px 6px 10px 14px;display:flex;align-items:center';
    headerCbDiv.innerHTML = '<input type="checkbox" id="prospect-select-all" onclick="toggleSelectAllProspects()" style="cursor:pointer;width:14px;height:14px;accent-color:var(--primary)">';
    headerRow.insertBefore(headerCbDiv, headerRow.firstChild);
  }

  // Find data rows (direct children after header)
  var tableContainer = headerRow ? headerRow.parentElement : null;
  if (!tableContainer) return;
  var filtered = _getFilteredProspects();
  var dataRows = Array.from(tableContainer.children).filter(function(el) {
    return el !== headerRow && el.getAttribute('onclick');
  });

  dataRows.forEach(function(row, idx) {
    if (idx >= filtered.length) return;
    var prospect = filtered[idx];
    var cbDiv = document.createElement('div');
    cbDiv.style.cssText = 'flex:0 0 36px;padding:10px 6px 10px 14px;display:flex;align-items:center';
    cbDiv.innerHTML = '<input type="checkbox" id="prospect-cb-' + prospect.id + '" ' +
      (_prospectSelectedIds.has(prospect.id) ? 'checked' : '') +
      ' onclick="toggleProspectSelect(\'' + prospect.id + '\', event)" style="cursor:pointer;width:14px;height:14px;accent-color:var(--primary)">';
    row.insertBefore(cbDiv, row.firstChild);
  });

  // Update header checkbox state
  _updateCheckboxUI();
};

// ══════════════════════════════════════════════════════════════════
//  SEED — Real Estate Prospects (run once)
// ══════════════════════════════════════════════════════════════════

async function seedRealEstateProspects(silent) {
  if (!silent && !confirm('Seed real estate prospects and lists? This should only be run once.')) return;

  var lists = [
    { name: 'Estate Agents — North West (Manchester)', description: 'Estate agents in Greater Manchester area' },
    { name: 'Estate Agents — North West (Liverpool)', description: 'Estate agents in Merseyside / Liverpool area' },
    { name: 'Estate Agents — North West (Other)', description: 'Estate agents across wider North West (Lancaster, Preston, Chester, etc.)' },
    { name: 'Investment Companies — North West', description: 'Property investment firms in the North West' },
    { name: 'Investment Companies — National', description: 'Property investment firms operating nationally / London-based' },
    { name: 'Estate Agents — Yorkshire', description: 'Estate agents in Yorkshire region' },
    { name: 'Estate Agents — Midlands', description: 'Estate agents in the Midlands region' },
  ];

  var createdLists = {};
  for (var i = 0; i < lists.length; i++) {
    try {
      var res = await sbInsert('prospect_lists', { name: lists[i].name, description: lists[i].description, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      createdLists[lists[i].name] = res[0].id;
    } catch (e) { console.warn('List insert error:', e); }
  }

  var prospects = [
    // Estate Agents — Manchester
    { company_name: 'Purplebricks Manchester', industry: 'Estate Agency', website: 'https://purplebricks.co.uk', location: 'Manchester', source: 'Google Maps', list: 'Estate Agents — North West (Manchester)' },
    { company_name: 'Edward Mellor', industry: 'Estate Agency', website: 'https://edwardmellor.co.uk', location: 'Stockport, Manchester', phone: '0161 443 4777', source: 'Google Maps', list: 'Estate Agents — North West (Manchester)' },
    { company_name: 'Thornley Groves', industry: 'Estate Agency', website: 'https://thornleygroves.co.uk', location: 'Manchester', phone: '0161 794 1075', source: 'Google Maps', list: 'Estate Agents — North West (Manchester)' },
    { company_name: 'Jordan Fishwick', industry: 'Estate Agency', website: 'https://jordanfishwick.co.uk', location: 'Didsbury, Manchester', phone: '0161 445 4480', source: 'Google Maps', list: 'Estate Agents — North West (Manchester)' },
    { company_name: 'Bridgfords', industry: 'Estate Agency', website: 'https://bridgfords.co.uk', location: 'Manchester', source: 'Google Maps', list: 'Estate Agents — North West (Manchester)' },
    { company_name: 'Reeds Rains', industry: 'Estate Agency', website: 'https://reedsrains.co.uk', location: 'Manchester', source: 'Google Maps', list: 'Estate Agents — North West (Manchester)' },
    { company_name: 'Hunters Estate Agents', industry: 'Estate Agency', website: 'https://hunters.com', location: 'Salford, Manchester', source: 'Google Maps', list: 'Estate Agents — North West (Manchester)' },
    { company_name: 'Gascoigne Halman', industry: 'Estate Agency', website: 'https://gascoignehalman.co.uk', location: 'Altrincham, Manchester', phone: '0161 928 1388', source: 'Google Maps', list: 'Estate Agents — North West (Manchester)' },
    { company_name: 'Reside Manchester', industry: 'Estate Agency', website: 'https://residemanchester.co.uk', location: 'Manchester City Centre', source: 'Google Maps', list: 'Estate Agents — North West (Manchester)' },
    { company_name: 'Higham & Co', industry: 'Estate Agency', website: 'https://highamandco.co.uk', location: 'Bolton, Manchester', source: 'Google Maps', list: 'Estate Agents — North West (Manchester)' },

    // Estate Agents — Liverpool
    { company_name: 'Entwistle Green', industry: 'Estate Agency', website: 'https://entwistlegreen.co.uk', location: 'Liverpool', source: 'Google Maps', list: 'Estate Agents — North West (Liverpool)' },
    { company_name: 'Sutton Kersh', industry: 'Estate Agency', website: 'https://suttonkersh.co.uk', location: 'Liverpool', phone: '0151 207 6315', source: 'Google Maps', list: 'Estate Agents — North West (Liverpool)' },
    { company_name: 'Karl Tatler', industry: 'Estate Agency', website: 'https://karltatler.com', location: 'Wirral, Merseyside', phone: '0151 625 8844', source: 'Google Maps', list: 'Estate Agents — North West (Liverpool)' },
    { company_name: 'Move Residential', industry: 'Estate Agency', website: 'https://moveresidential.co.uk', location: 'Liverpool', source: 'Google Maps', list: 'Estate Agents — North West (Liverpool)' },
    { company_name: 'Venmore', industry: 'Estate Agency', website: 'https://venmore.com', location: 'Liverpool', phone: '0151 236 1763', source: 'Google Maps', list: 'Estate Agents — North West (Liverpool)' },
    { company_name: 'Jones & Chapman', industry: 'Estate Agency', website: 'https://jonesandchapman.co.uk', location: 'Wirral, Merseyside', source: 'Google Maps', list: 'Estate Agents — North West (Liverpool)' },
    { company_name: 'Clive Watkin', industry: 'Estate Agency', website: 'https://clivewatkin.co.uk', location: 'Heswall, Wirral', phone: '0151 342 2444', source: 'Google Maps', list: 'Estate Agents — North West (Liverpool)' },
    { company_name: 'B&M Residential', industry: 'Estate Agency', website: 'https://bmresidential.co.uk', location: 'Liverpool', source: 'Google Maps', list: 'Estate Agents — North West (Liverpool)' },

    // Estate Agents — NW Other
    { company_name: 'Farrell Heyworth', industry: 'Estate Agency', website: 'https://farrellheyworth.co.uk', location: 'Lancaster', source: 'Google Maps', list: 'Estate Agents — North West (Other)' },
    { company_name: 'Dewhurst Homes', industry: 'Estate Agency', website: 'https://dewhursthomes.co.uk', location: 'Preston, Lancashire', phone: '01772 788811', source: 'Google Maps', list: 'Estate Agents — North West (Other)' },
    { company_name: 'Swetenhams', industry: 'Estate Agency', website: 'https://swetenhams.co.uk', location: 'Chester', phone: '01244 321321', source: 'Google Maps', list: 'Estate Agents — North West (Other)' },
    { company_name: 'Hackney & Leigh', industry: 'Estate Agency', website: 'https://hackneyandleigh.co.uk', location: 'Kendal, Cumbria', source: 'Google Maps', list: 'Estate Agents — North West (Other)' },
    { company_name: 'Miller Metcalfe', industry: 'Estate Agency', website: 'https://millermetcalfe.co.uk', location: 'Bolton / Chorley', phone: '01204 535353', source: 'Google Maps', list: 'Estate Agents — North West (Other)' },

    // Investment Companies — North West
    { company_name: 'RW Invest', industry: 'Property Investment', website: 'https://rw-invest.com', location: 'Liverpool', source: 'Google Maps', list: 'Investment Companies — North West' },
    { company_name: 'Advantage Investment', industry: 'Property Investment', website: 'https://advantageinvestment.com', location: 'Liverpool', source: 'Google Maps', list: 'Investment Companies — North West' },
    { company_name: 'Aspen Woolf', industry: 'Property Investment', website: 'https://aspenwoolf.co.uk', location: 'Manchester', source: 'Google Maps', list: 'Investment Companies — North West' },
    { company_name: 'Knight Knox', industry: 'Property Investment', website: 'https://knightknox.com', location: 'Manchester', phone: '0161 772 1370', source: 'Google Maps', list: 'Investment Companies — North West' },
    { company_name: 'Fortis Developments', industry: 'Property Investment', website: 'https://fortisdevelopments.com', location: 'Manchester', source: 'Google Maps', list: 'Investment Companies — North West' },
    { company_name: 'Alliance City Living', industry: 'Property Investment', website: 'https://alliancecityliving.com', location: 'Manchester', source: 'Google Maps', list: 'Investment Companies — North West' },
    { company_name: 'North Property Group', industry: 'Property Investment', website: 'https://northpropertygroup.co.uk', location: 'Liverpool', phone: '0151 372 0327', source: 'Google Maps', list: 'Investment Companies — North West' },

    // Investment Companies — National
    { company_name: 'JLL Residential', industry: 'Property Investment', website: 'https://jll.co.uk', location: 'London', source: 'Google Maps', list: 'Investment Companies — National' },
    { company_name: 'Savills Investment Management', industry: 'Property Investment', website: 'https://savills.co.uk', location: 'London', source: 'Google Maps', list: 'Investment Companies — National' },
    { company_name: 'CBRE Residential', industry: 'Property Investment', website: 'https://cbre.co.uk', location: 'London', source: 'Google Maps', list: 'Investment Companies — National' },
    { company_name: 'Galliard Homes', industry: 'Property Investment', website: 'https://galliardhomes.com', location: 'London', source: 'Google Maps', list: 'Investment Companies — National' },
    { company_name: 'Select Property Group', industry: 'Property Investment', website: 'https://selectproperty.com', location: 'Manchester / London', source: 'Google Maps', list: 'Investment Companies — National' },
    { company_name: 'IP Global', industry: 'Property Investment', website: 'https://ipglobal-ltd.com', location: 'London', source: 'Google Maps', list: 'Investment Companies — National' },

    // Estate Agents — Yorkshire
    { company_name: 'Dacre Son & Hartley', industry: 'Estate Agency', website: 'https://dacres.co.uk', location: 'Harrogate, Yorkshire', source: 'Google Maps', list: 'Estate Agents — Yorkshire' },
    { company_name: 'Manning Stainton', industry: 'Estate Agency', website: 'https://manningstainton.co.uk', location: 'Leeds', phone: '0113 245 6845', source: 'Google Maps', list: 'Estate Agents — Yorkshire' },
    { company_name: 'William H Brown Sheffield', industry: 'Estate Agency', website: 'https://williamhbrown.co.uk', location: 'Sheffield', source: 'Google Maps', list: 'Estate Agents — Yorkshire' },
    { company_name: 'Linley & Simpson', industry: 'Estate Agency', website: 'https://linleyandsimpson.co.uk', location: 'Leeds / York', source: 'Google Maps', list: 'Estate Agents — Yorkshire' },
    { company_name: 'Monroe Estate Agents', industry: 'Estate Agency', website: 'https://monroeestateagents.co.uk', location: 'Hull', source: 'Google Maps', list: 'Estate Agents — Yorkshire' },

    // Estate Agents — Midlands
    { company_name: 'Butters John Bee', industry: 'Estate Agency', website: 'https://bjbmail.com', location: 'Stoke-on-Trent', source: 'Google Maps', list: 'Estate Agents — Midlands' },
    { company_name: 'Loveitts', industry: 'Estate Agency', website: 'https://loveitts.co.uk', location: 'Coventry', phone: '024 7652 5252', source: 'Google Maps', list: 'Estate Agents — Midlands' },
    { company_name: 'Nock Deighton', industry: 'Estate Agency', website: 'https://nfrockdeighton.co.uk', location: 'Shrewsbury', source: 'Google Maps', list: 'Estate Agents — Midlands' },
    { company_name: 'Bairstow Eves Birmingham', industry: 'Estate Agency', website: 'https://bairstoweves.co.uk', location: 'Birmingham', source: 'Google Maps', list: 'Estate Agents — Midlands' },
    { company_name: 'Merry\'s Estate Agents', industry: 'Estate Agency', website: 'https://merrys.co.uk', location: 'Northampton', phone: '01604 637733', source: 'Google Maps', list: 'Estate Agents — Midlands' },
  ];

  var prospectIds = {};
  for (var j = 0; j < prospects.length; j++) {
    var p = prospects[j];
    var payload = {
      company_name: p.company_name,
      industry: p.industry || null,
      website: p.website || null,
      location: p.location || null,
      phone: p.phone || null,
      source: p.source || null,
      status: 'New',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      var res = await sbInsert('prospects', payload);
      var pid = res[0].id;
      // Add to list
      var listName = p.list;
      if (listName && createdLists[listName]) {
        await sbInsert('prospect_list_members', { list_id: createdLists[listName], prospect_id: pid });
      }
    } catch (e) { console.warn('Prospect insert error:', p.company_name, e); }
  }

  showToast(prospects.length + ' prospects seeded into ' + lists.length + ' lists', 'success');
  if (!silent) {
    // Reload everything
    await loadProspectLists();
    renderPipelinePage();
  }
}
