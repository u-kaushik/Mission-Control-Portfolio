// Mission Control — Agency Clients
// ══════════════════════════════════════════════════════════════════════════
//  CLIENTS — Track existing client base, MRR & contracts
// ══════════════════════════════════════════════════════════════════════════

let _productsData = [];
let _productsFilter = 'all';
let _productsSort = { col: 'created_at', dir: 'desc' };
let _productsSearch = '';

const PRODUCT_STATUSES = ['Active', 'Onboarding', 'Paused', 'Churned'];

const PRODUCT_STATUS_COLORS = {
  Active: 'var(--green, #22c55e)',
  Onboarding: 'var(--blue, #3b82f6)',
  Paused: 'var(--amber, #f59e0b)',
  Churned: 'var(--red, #ef4444)'
};

// ══════════════════════════════════════════════════════════════════
//  RENDER PAGE  (entry point — called by router as renderClientsPage)
// ══════════════════════════════════════════════════════════════════
async function renderClientsPage() {
  const statsEl = document.getElementById('products-stats');
  const filtersEl = document.getElementById('products-filters');
  const tableWrap = document.getElementById('products-table-wrap');
  if (!tableWrap) return;
  tableWrap.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-muted)">Loading\u2026</div>';

  try {
    const rows = await sbQuery('agency_clients', { select: '*', order: 'created_at.desc', limit: 200, 'deleted_at': 'is.null' }, true);
    _productsData = Array.isArray(rows) ? rows : [];
  } catch (e) {
    _productsData = [];
    console.warn('[clients] load error:', e);
  }

  _renderProductsStats(statsEl);
  _renderProductsFilters(filtersEl);
  renderProductsView();
}

// ── Filtered data ──
function _productsFilteredData() {
  let data = _productsData;
  if (_productsFilter !== 'all') {
    data = data.filter(p => p.status === _productsFilter);
  }
  if (_productsSearch) {
    const q = _productsSearch.toLowerCase();
    data = data.filter(p =>
      (p.company_name || '').toLowerCase().includes(q) ||
      (p.contact_name || '').toLowerCase().includes(q) ||
      (p.service || '').toLowerCase().includes(q) ||
      (p.notes || '').toLowerCase().includes(q)
    );
  }
  return data;
}

// ── Stats strip ──
function _renderProductsStats(el) {
  if (!el) return;
  const data = _productsFilteredData();
  const total = data.length;
  const active = data.filter(p => p.status === 'Active').length;
  const totalMRR = data.filter(p => p.status === 'Active').reduce((s, p) => s + (Number(p.monthly_value) || 0), 0);
  const churned = data.filter(p => p.status === 'Churned').length;

  el.innerHTML = [
    _pStatCard('Total Clients', String(total), 'var(--text-primary)', 'ph-users'),
    _pStatCard('Active', String(active), 'var(--green)', 'ph-check-circle'),
    _pStatCard('MRR', '\u00A3' + totalMRR.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }), 'var(--blue)', 'ph-currency-gbp'),
    _pStatCard('Churned', String(churned), 'var(--red)', 'ph-user-minus'),
  ].join('');
}

function _pStatCard(label, value, color, icon) {
  return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;box-shadow:var(--shadow-xs);transition:box-shadow 0.18s,transform 0.18s" onmouseenter="this.style.boxShadow=\'var(--shadow-md)\';this.style.transform=\'translateY(-1px)\'" onmouseleave="this.style.boxShadow=\'var(--shadow-xs)\';this.style.transform=\'none\'">' +
    '<div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:6px;white-space:nowrap"><i class="ph-thin ' + icon + '"></i> ' + label + '</div>' +
    '<div style="font-size:22px;font-weight:700;color:' + (color || 'var(--text-primary)') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + value + '</div></div>';
}

// ── Filter pills (shared utility) ──
function _renderProductsFilters(el) {
  if (!el) return;
  var filters = ['all'].concat(PRODUCT_STATUSES);
  var counts = { all: _productsData.length };
  _productsData.forEach(function(p) { counts[p.status] = (counts[p.status] || 0) + 1; });
  el.innerHTML = _renderFilterPills(filters, counts, _productsFilter,
    PRODUCT_STATUS_COLORS, function(f) { return "setProductsFilter('" + f + "')"; }, { all: 'All' });
}

function setProductsFilter(f) {
  _productsFilter = f;
  _renderProductsFilters(document.getElementById('products-filters'));
  renderProductsView();
}

// ── Search wiring ──
(function() {
  var _searchTimer;
  document.addEventListener('DOMContentLoaded', function() {
    var inp = document.getElementById('products-search');
    if (inp) inp.addEventListener('input', function() {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(function() {
        _productsSearch = inp.value.trim();
        renderProductsView();
      }, 200);
    });
  });
})();

// ══════════════════════════════════════════════════════════════════
//  TABLE
// ══════════════════════════════════════════════════════════════════
function renderProductsView() {
  var wrap = document.getElementById('products-table-wrap');
  if (!wrap) return;
  var data = _productsFilteredData();

  _renderProductsStats(document.getElementById('products-stats'));

  var sorted = data.slice().sort(function(a, b) {
    var col = _productsSort.col;
    var va = a[col], vb = b[col];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va == null) return 1; if (vb == null) return -1;
    if (va < vb) return _productsSort.dir === 'asc' ? -1 : 1;
    if (va > vb) return _productsSort.dir === 'asc' ? 1 : -1;
    return 0;
  });

  var cols = [
    { key: 'company_name', label: 'Company', align: 'left' },
    { key: 'contact_name', label: 'Contact', align: 'left' },
    { key: 'contact_email', label: 'Email', align: 'left' },
    { key: 'service', label: 'Service', align: 'left' },
    { key: 'monthly_value', label: 'MRR (£)', align: 'right' },
    { key: 'contract_start', label: 'Start', align: 'center' },
    { key: 'status', label: 'Status', align: 'center' }
  ];

  var sortIcon = function(key) {
    if (_productsSort.col !== key) return '';
    return _productsSort.dir === 'asc' ? ' \u2191' : ' \u2193';
  };

  var thead = cols.map(function(c) {
    return '<th onclick="sortProductsTable(\'' + c.key + '\')" style="padding:10px 14px;text-align:' + c.align + ';font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);cursor:pointer;white-space:nowrap;user-select:none">' + c.label + sortIcon(c.key) + '</th>';
  }).join('');

  if (sorted.length === 0) {
    wrap.innerHTML = '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow-x:auto">' +
      '<table style="width:100%;border-collapse:collapse;font-size:13px;min-width:800px">' +
        '<thead><tr style="border-bottom:1px solid var(--border);background:var(--surface-2)">' + thead + '</tr></thead>' +
        '<tbody><tr><td colspan="' + cols.length + '" style="padding:40px;text-align:center;color:var(--text-muted)">' +
          '<div style="font-size:28px;margin-bottom:8px;opacity:0.4"><i class="ph-thin ph-users"></i></div>' +
          (_productsData.length ? 'No clients match this filter.' : 'No clients yet. Click "+ Add Client" to start tracking.') +
        '</td></tr></tbody></table></div>';
    return;
  }

  var tbody = sorted.map(function(p) {
    var statusColor = PRODUCT_STATUS_COLORS[p.status] || 'var(--text-muted)';
    var mrr = Number(p.monthly_value) || 0;
    var startDate = p.contract_start ? new Date(p.contract_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '\u2014';

    return '<tr onclick="openProductModal(\'' + p.id + '\')" style="cursor:pointer;border-bottom:1px solid var(--border-light);transition:background 0.1s" onmouseenter="this.style.background=\'var(--surface-2)\'" onmouseleave="this.style.background=\'var(--surface)\'">' +
      '<td style="padding:10px 14px;font-weight:600;font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(p.company_name || '') + '</td>' +
      '<td style="padding:10px 14px;font-size:12px;color:var(--text-secondary)">' + escHtml(p.contact_name || '\u2014') + '</td>' +
      '<td style="padding:10px 14px;font-size:12px;color:var(--text-secondary)">' + escHtml(p.contact_email || '\u2014') + '</td>' +
      '<td style="padding:10px 14px;font-size:12px;color:var(--text-secondary)">' + escHtml(p.service || '\u2014') + '</td>' +
      '<td style="padding:10px 14px;text-align:right;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:' + (mrr > 0 ? 'var(--green)' : '') + '">' + (mrr > 0 ? '\u00A3' + mrr.toLocaleString() : '\u2014') + '</td>' +
      '<td style="padding:10px 14px;text-align:center;font-size:11px;color:var(--text-secondary)">' + startDate + '</td>' +
      '<td style="padding:10px 14px;text-align:center"><span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:' + statusColor + '15;color:' + statusColor + '">' + escHtml(p.status || '') + '</span></td>' +
    '</tr>';
  }).join('');

  wrap.innerHTML = '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow-x:auto">' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px;min-width:800px">' +
      '<thead><tr style="border-bottom:1px solid var(--border);background:var(--surface-2)">' + thead + '</tr></thead>' +
      '<tbody>' + tbody + '</tbody>' +
    '</table>' +
  '</div>';
}

function sortProductsTable(col) {
  if (_productsSort.col === col) {
    _productsSort.dir = _productsSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    _productsSort = { col: col, dir: col === 'company_name' ? 'asc' : 'desc' };
  }
  renderProductsView();
}

// ══════════════════════════════════════════════════════════════════
//  MODAL — Add / Edit Client
// ══════════════════════════════════════════════════════════════════
async function openProductModal(id) {
  var overlay = document.getElementById('product-modal-overlay');
  if (!overlay) return;
  var isEdit = !!id && id !== 'undefined' && id !== 'null';
  var p = isEdit ? _productsData.find(function(x) { return x.id === id; }) : null;

  document.getElementById('product-edit-id').value = isEdit ? id : '';
  document.getElementById('product-modal-title').innerHTML = '<i class="ph-thin ph-users"></i> ' + (isEdit ? 'Edit' : 'New') + ' Client';
  document.getElementById('product-save-btn').textContent = isEdit ? 'Save Changes' : 'Add Client';
  document.getElementById('product-delete-btn').style.display = isEdit ? '' : 'none';

  document.getElementById('product-company').value = p ? (p.company_name || '') : '';
  document.getElementById('product-contact').value = p ? (p.contact_name || '') : '';
  document.getElementById('product-email').value = p ? (p.contact_email || '') : '';
  document.getElementById('product-phone').value = p ? (p.phone || '') : '';
  document.getElementById('product-service').value = p ? (p.service || '') : '';
  document.getElementById('product-mrr').value = p ? (p.monthly_value || '') : '';
  document.getElementById('product-start').value = p ? (p.contract_start || '') : '';
  document.getElementById('product-end').value = p ? (p.contract_end || '') : '';
  document.getElementById('product-status').value = p ? (p.status || 'Active') : 'Active';
  document.getElementById('product-notes').value = p ? (p.notes || '') : '';

  overlay.style.display = 'flex';
  setTimeout(function() { document.getElementById('product-company').focus(); }, 80);
}

function closeProductModal() {
  var overlay = document.getElementById('product-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ── Save ──
async function saveProduct() {
  var name = document.getElementById('product-company').value.trim();
  if (!name) { showToast('Company name is required'); return; }

  var payload = {
    company_name: name,
    contact_name: document.getElementById('product-contact').value.trim() || null,
    contact_email: document.getElementById('product-email').value.trim() || null,
    phone: document.getElementById('product-phone').value.trim() || null,
    service: document.getElementById('product-service').value.trim() || null,
    monthly_value: Number(document.getElementById('product-mrr').value) || null,
    contract_start: document.getElementById('product-start').value || null,
    contract_end: document.getElementById('product-end').value || null,
    status: document.getElementById('product-status').value,
    notes: document.getElementById('product-notes').value.trim() || null,
    updated_at: new Date().toISOString()
  };

  var editId = document.getElementById('product-edit-id').value;
  try {
    if (editId) {
      await sbUpdate('agency_clients', editId, payload);
      showToast('Client updated');
    } else {
      await sbInsert('agency_clients', payload);
      showToast('Client added');
    }
    closeProductModal();
    renderClientsPage();
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

// ── Delete (soft) ──
async function deleteProduct() {
  var editId = document.getElementById('product-edit-id').value;
  if (!editId || !confirm('Delete this client?')) return;
  try {
    await sbUpdate('agency_clients', editId, { deleted_at: new Date().toISOString() });
    showToast('Client deleted');
    closeProductModal();
    renderClientsPage();
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}
