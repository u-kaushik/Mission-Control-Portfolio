// Mission Control — Modal & Table shared utilities
// =============================================
// MODAL UTILITY — generic show/hide for overlay modals
// =============================================
function _modalShow(id) { const el = document.getElementById(id); if (el) { el.style.display = 'flex'; el.style.zIndex = ++MC.modalZTop; } }
function _modalHide(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

// =============================================
// TABLE UTILITIES — shared filter/sort/pagination/pills
// =============================================

/** Sort icon arrows for table headers. sortState = { col, dir }. */
function _sortIcon(sortState, col) {
  if (sortState.col !== col) return '<span style="opacity:0.3;font-size:8px;margin-left:3px">\u25B2\u25BC</span>';
  return sortState.dir === 'asc' ? '<span style="font-size:8px;margin-left:3px">\u25B2</span>' : '<span style="font-size:8px;margin-left:3px">\u25BC</span>';
}

/**
 * Render filter pill buttons.
 * @param {string[]} filters       — e.g. ['All','New','Contacted',...]
 * @param {Object}   counts        — e.g. { All: 10, New: 3, ... }
 * @param {string}   active        — currently selected filter
 * @param {Object}   colorMap      — e.g. { New:'var(--purple)', ... }
 * @param {Function} onClickExpr   — fn(filterVal) returns onclick JS string
 * @param {Object}   [labelMap]    — optional display name map
 */
function _renderFilterPills(filters, counts, active, colorMap, onClickExpr, labelMap) {
  let html = '<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;align-items:center">';
  filters.forEach(function(f) {
    const isActive = active === f;
    const clr = colorMap[f] || 'var(--primary)';
    const label = (labelMap && labelMap[f]) || f;
    html += '<button onclick="' + onClickExpr(f) + '" style="padding:5px 14px;border-radius:99px;font-size:11px;font-weight:600;cursor:pointer;border:none;color:' + (isActive ? clr : 'var(--text-secondary)') + ';background:' + (isActive ? clr + '14' : 'var(--surface-2)') + ';font-family:inherit;transition:all 0.12s">' + label + ' <span style="font-size:10px;opacity:0.7">' + (counts[f] || 0) + '</span></button>';
  });
  html += '</div>';
  return html;
}

/**
 * Render pagination controls.
 * @param {number} page       — current page (1-based)
 * @param {number} total      — total filtered items
 * @param {number} perPage    — items per page
 * @param {Function} onClickExpr — fn(pageNum) returns onclick JS string
 */
function _renderPagination(page, total, perPage, onClickExpr) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  let html = '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 4px;font-size:12px;color:var(--text-muted)">';
  html += '<span>Showing ' + (start + 1) + '\u2013' + Math.min(start + perPage, total) + ' of ' + total + '</span>';
  html += '<div style="display:flex;gap:6px;align-items:center">';
  html += '<button onclick="' + onClickExpr(Math.max(1, page - 1)) + '" style="padding:4px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);color:var(--text-secondary);font-size:11px;cursor:pointer;font-family:inherit;opacity:' + (page <= 1 ? '0.4' : '1') + '">Prev</button>';
  for (var pg = 1; pg <= totalPages; pg++) {
    html += '<button onclick="' + onClickExpr(pg) + '" style="padding:4px 8px;border:1px solid ' + (page === pg ? 'var(--primary)' : 'var(--border)') + ';border-radius:var(--radius-sm);background:' + (page === pg ? 'var(--primary)' : 'var(--surface)') + ';color:' + (page === pg ? '#fff' : 'var(--text-secondary)') + ';font-size:11px;cursor:pointer;font-family:inherit;font-weight:' + (page === pg ? '700' : '400') + '">' + pg + '</button>';
  }
  html += '<button onclick="' + onClickExpr(Math.min(totalPages, page + 1)) + '" style="padding:4px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);color:var(--text-secondary);font-size:11px;cursor:pointer;font-family:inherit;opacity:' + (page >= totalPages ? '0.4' : '1') + '">Next</button>';
  html += '<span style="font-size:11px">' + perPage + ' per page</span>';
  html += '</div></div>';
  return html;
}

/**
 * Generic filter + sort for table data.
 * @param {Array}    data        — raw data array
 * @param {string}   filterVal   — active filter value ('All' = no filter)
 * @param {Function} classifyFn  — fn(row) returns the filter category string
 * @param {Object}   sortState   — { col, dir }
 * @param {string[]} [numericCols] — columns to sort numerically
 */
function _filterAndSort(data, filterVal, classifyFn, sortState, numericCols) {
  if (filterVal !== 'All') data = data.filter(function(r) { return classifyFn(r) === filterVal; });
  var col = sortState.col, dir = sortState.dir;
  var isNum = numericCols && numericCols.indexOf(col) >= 0;
  data = data.slice().sort(function(a, b) {
    if (isNum) { var na = Number(a[col]) || 0, nb = Number(b[col]) || 0; return dir === 'asc' ? na - nb : nb - na; }
    var va = (a[col] || '').toString().toLowerCase();
    var vb = (b[col] || '').toString().toLowerCase();
    return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });
  return data;
}

/**
 * Bind form fields from a data object.
 * @param {Array} fieldMap — [['element-id', 'data-key', 'default-value'], ...]
 * @param {Object} data    — the data object (or null for empty)
 * @param {boolean} isEdit — true = populate from data, false = use defaults
 */
function _bindFormFields(fieldMap, data, isEdit) {
  fieldMap.forEach(function(f) {
    var el = document.getElementById(f[0]);
    if (el) el.value = isEdit ? (data[f[1]] || f[2] || '') : (f[2] || '');
  });
}

