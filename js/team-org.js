// Mission Control — Team / Org chart page
// =============================================
// TEAM / ORG CHART PAGE
// =============================================

// EOS Accountability Chart structure
// Visionary = Utkarsh (top); Integrator = Jarvis (orchestrator)
// Three depts: Sales & Marketing | Supply Chain & Fulfilment | Operations
// Each dept has a head (seat owner) + members (co-agents in that seat)
const ORG_STRUCTURE = {
  visionary: {
    agent: 'utkarsh',
    accountabilities: ['Brand Vision', 'Growth Strategy', 'Product Selection']
  },
  integrator: {
    agent: 'jarvis',
    accountabilities: ['Squad Orchestration', 'P&L Ownership', 'Barrier Removal']
  },
  departments: [
    {
      title: 'Sales & Marketing',
      color: 'var(--blue)',
      head: 'echo',
      members: [
        { agent: 'echo', accountabilities: ['Ad Scripts', 'Email Sequences', 'Landing Page Copy'] },
        { agent: 'sola', accountabilities: ['Niche Analysis', 'Competitor Intelligence', 'Supplier Sourcing'] },
        { agent: 'luna', accountabilities: ['Ad Creatives', 'Brand Identity', 'UGC Direction'] }
      ]
    },
    {
      title: 'Supply Chain & Fulfilment',
      color: 'var(--green)',
      head: 'quinn',
      members: [
        { agent: 'quinn',  accountabilities: ['Supplier Relations', 'Order Tracking', 'Restock Management'] },
        { agent: 'archie', accountabilities: ['Funnel Structure', 'Upsell Flows', 'Checkout Optimisation'] },
        { agent: 'kai',    accountabilities: ['Platform Build', 'Pixel & Tracking', 'Integration Setup'] }
      ]
    },
    {
      title: 'Operations',
      color: 'var(--orange)',
      head: 'dash',
      members: [
        { agent: 'iris',  accountabilities: ['Review Monitoring', 'Refund Tracking', 'Quality Control'] },
        { agent: 'dash',  accountabilities: ['Scorecard Data', 'ROAS Reporting', 'Performance Trends'] },
        { agent: 'penny', accountabilities: ['Margin Tracking', 'CAC/LTV Analysis', 'Cash Flow'] }
      ]
    }
  ]
};

function renderTeamPage() {
  const container = document.getElementById('team-org-container');
  if (!container) return;

  // Helper: resolve effective status — delegates to canonical getAgentLiveStatus()
  function getEffectiveStatus(agentId) {
    const { si, hb } = getAgentLiveStatus(agentId);
    return { si, hb };
  }

  // Helper: build a node card
  function orgNode(agentId, titleOverride, accountabilities, extraClass = '') {
    const def = agentId === 'utkarsh' ? HUMAN : AGENTS.find(a => a.id === agentId);
    if (!def) return '';
    const color  = agentColor(agentId);
    const { si, hb } = getEffectiveStatus(agentId);
    const pulse  = si.pulse ? 'animation:pulse-dot 2.5s ease-in-out infinite' : 'animation:none';
    const lastSeen = hb ? '· ' + relativeTime(hb.toISOString()) : '';
    const title  = titleOverride || def.role;

    const avatarInnerHtml = def.avatar
      ? `<img src="${escHtml(def.avatar)}?v=${AVATAR_BUST}" alt="${escHtml(def.name)}"
             style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
         <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:inherit">${def.emoji}</span>`
      : `<span>${def.emoji}</span>`;

    const acctList = accountabilities.map(a => `<li>${escHtml(a)}</li>`).join('');

    return `
      <div class="org-node ${extraClass}" onclick="openAgentModal('${escHtml(agentId)}')"
           style="border-top: 3px solid ${color}">
        <div class="org-node-avatar" style="background:${color}18;color:${color}">
          ${avatarInnerHtml}
        </div>
        <div class="org-node-name" style="color:${color}">${escHtml(def.name)}</div>
        <div class="org-node-role">${escHtml(title)}</div>
        <div class="org-node-status">
          <span class="org-status-dot" style="background:${si.dot};${pulse}"></span>
          <span class="org-status-label" style="color:${si.textColor}">${si.label}</span>
          ${lastSeen ? `<span style="font-size:9px;color:var(--text-muted)">${lastSeen}</span>` : ''}
        </div>
        <hr class="org-node-divider">
        <ul class="org-node-accountabilities">${acctList}</ul>
      </div>`;
  }

  // ── Build the tree HTML ──
  const vis = ORG_STRUCTURE.visionary;
  const intg = ORG_STRUCTURE.integrator;
  const depts = ORG_STRUCTURE.departments;

  // Visionary node
  const visHtml = orgNode(vis.agent, 'Visionary', vis.accountabilities, 'org-node-top');

  // Integrator node
  const intgHtml = orgNode(intg.agent, 'Integrator', intg.accountabilities, 'org-node-top');

  // Each dept: coloured seat header + members row below
  const deptColsHtml = depts.map(dept => {
    const headColor = dept.color || 'var(--blue)';

    // Dept seat banner
    const noteHtml = dept.note
      ? `<div style="font-size:10px;color:var(--orange);font-weight:600;margin-top:4px">${escHtml(dept.note)}</div>`
      : '';
    const deptHeader = `<div class="org-dept-header" style="border-color:${headColor}">
      <span class="org-dept-title" style="color:${headColor}">${escHtml(dept.title)}</span>
      ${noteHtml}
    </div>`;

    // Member cards in a horizontal row
    const memberNodesHtml = dept.members.map(m =>
      `<div class="org-member-col">${orgNode(m.agent, null, m.accountabilities, 'org-node-member')}</div>`
    ).join('');
    const membersRow = `<div class="org-members-row" style="--dept-color:${headColor}">${memberNodesHtml}</div>`;

    return `<div class="org-dept-col" style="--dept-color:${headColor}">
      ${deptHeader}
      ${membersRow}
    </div>`;
  }).join('');

  // We'll add the bridge div inside org-dept-row and position it after layout
  const deptRowHtml = `<div class="org-dept-row" id="org-dept-row-main">
    <div class="org-dept-bridge" id="org-dept-bridge"></div>
    ${deptColsHtml}
  </div>`;

  container.innerHTML = `
    <div class="org-tree">

      <!-- Tier 1: Visionary -->
      <div class="org-tier">
        <div class="org-tier-label">Visionary</div>
        ${visHtml}
      </div>

      <div class="org-stem-down"></div>

      <!-- Tier 2: Integrator -->
      <div class="org-tier">
        <div class="org-tier-label">Integrator / Lead Agent</div>
        ${intgHtml}
      </div>

      <div class="org-stem-down"></div>

      <!-- Tier 3: The Four Dept Seats -->
      <div class="org-tier">
        <div class="org-tier-label">The Three Major Functions</div>
        ${deptRowHtml}
      </div>

    </div>`;

  // Init pan/zoom and position bridge line after DOM is painted
  requestAnimationFrame(() => {
    initOrgPanZoom();
    // Position the horizontal bridge to span exactly between first and last dept column stems
    const row = document.getElementById('org-dept-row-main');
    const bridge = document.getElementById('org-dept-bridge');
    if (row && bridge) {
      const cols = row.querySelectorAll(':scope > .org-dept-col');
      if (cols.length >= 2) {
        const rowRect   = row.getBoundingClientRect();
        const firstRect = cols[0].getBoundingClientRect();
        const lastRect  = cols[cols.length - 1].getBoundingClientRect();
        // Bridge spans from center of first col to center of last col
        const leftPx  = (firstRect.left + firstRect.width / 2) - rowRect.left;
        const rightPx = rowRect.right - (lastRect.left + lastRect.width / 2);
        bridge.style.left  = leftPx + 'px';
        bridge.style.right = rightPx + 'px';
      }
    }
  });
}

// =============================================
// ORG CHART PAN + ZOOM
// =============================================
let _orgScale = 1;
let _orgPanX  = 0;
let _orgPanY  = 0;
let _orgDragging = false;
let _orgDragStart = { x: 0, y: 0, panX: 0, panY: 0 };

function _orgApplyTransform() {
  const canvas = document.getElementById('team-org-canvas');
  if (!canvas) return;
  canvas.style.transform = `translate(${_orgPanX}px, ${_orgPanY}px) scale(${_orgScale})`;
  const lbl = document.getElementById('org-zoom-label');
  if (lbl) lbl.textContent = Math.round(_orgScale * 100) + '%';
}

function orgZoom(delta) {
  const vp = document.getElementById('team-org-viewport');
  if (!vp) return;
  const rect = vp.getBoundingClientRect();
  // Zoom toward centre of viewport
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const newScale = Math.min(3, Math.max(0.2, _orgScale + delta));
  const scaleDiff = newScale / _orgScale;
  _orgPanX = cx - scaleDiff * (cx - _orgPanX);
  _orgPanY = cy - scaleDiff * (cy - _orgPanY);
  _orgScale = newScale;
  _orgApplyTransform();
}

function orgResetView() {
  const vp = document.getElementById('team-org-viewport');
  const canvas = document.getElementById('team-org-canvas');
  if (!vp || !canvas) return;
  const vpW = vp.clientWidth;
  const cW  = canvas.scrollWidth;
  // Centre horizontally, start from top with small padding
  _orgScale = Math.min(1, (vpW - 80) / (cW || 1));
  _orgPanX  = (vpW - cW * _orgScale) / 2;
  _orgPanY  = 24;
  _orgApplyTransform();
}

function initOrgPanZoom() {
  const vp = document.getElementById('team-org-viewport');
  if (!vp || vp._orgInited) return;
  vp._orgInited = true;

  // Start at a sensible default view
  orgResetView();

  // ── Wheel to zoom ──
  vp.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = vp.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta  = e.deltaY < 0 ? 0.1 : -0.1;
    const newScale = Math.min(3, Math.max(0.2, _orgScale + delta));
    const scaleDiff = newScale / _orgScale;
    _orgPanX = mouseX - scaleDiff * (mouseX - _orgPanX);
    _orgPanY = mouseY - scaleDiff * (mouseY - _orgPanY);
    _orgScale = newScale;
    _orgApplyTransform();
  }, { passive: false });

  // ── Mouse drag to pan ──
  vp.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    // Don't initiate drag on interactive elements
    if (e.target.closest('.org-node, button, a')) return;
    _orgDragging = true;
    _orgDragStart = { x: e.clientX, y: e.clientY, panX: _orgPanX, panY: _orgPanY };
    vp.classList.add('dragging');
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if (!_orgDragging) return;
    _orgPanX = _orgDragStart.panX + (e.clientX - _orgDragStart.x);
    _orgPanY = _orgDragStart.panY + (e.clientY - _orgDragStart.y);
    _orgApplyTransform();
  });
  window.addEventListener('mouseup', () => {
    if (_orgDragging) {
      _orgDragging = false;
      const vp = document.getElementById('team-org-viewport');
      if (vp) vp.classList.remove('dragging');
    }
  });

  // ── Touch pinch/drag ──
  let _touches = [];
  let _touchPinchDist0 = 0;
  let _touchScale0 = 1;
  let _touchPan0 = { x: 0, y: 0 };
  let _touchStart = { x: 0, y: 0, panX: 0, panY: 0 };

  let _touchStartTime = 0;
  let _touchMoved = false;
  vp.addEventListener('touchstart', e => {
    _touches = Array.from(e.touches);
    _touchStartTime = Date.now();
    _touchMoved = false;
    if (_touches.length === 1) {
      _touchStart = { x: _touches[0].clientX, y: _touches[0].clientY, panX: _orgPanX, panY: _orgPanY };
    } else if (_touches.length === 2) {
      const dx = _touches[0].clientX - _touches[1].clientX;
      const dy = _touches[0].clientY - _touches[1].clientY;
      _touchPinchDist0 = Math.sqrt(dx*dx + dy*dy);
      _touchScale0 = _orgScale;
      _touchPan0 = { x: _orgPanX, y: _orgPanY };
    }
    e.preventDefault();
  }, { passive: false });

  vp.addEventListener('touchmove', e => {
    const ts = Array.from(e.touches);
    if (ts.length === 1 && _touches.length === 1) {
      const dx = ts[0].clientX - _touchStart.x;
      const dy = ts[0].clientY - _touchStart.y;
      if (Math.sqrt(dx*dx + dy*dy) > 8) _touchMoved = true;
      _orgPanX = _touchStart.panX + dx;
      _orgPanY = _touchStart.panY + dy;
      _orgApplyTransform();
    } else if (ts.length === 2) {
      _touchMoved = true;
      const dx = ts[0].clientX - ts[1].clientX;
      const dy = ts[0].clientY - ts[1].clientY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const newScale = Math.min(3, Math.max(0.2, _touchScale0 * (dist / _touchPinchDist0)));
      _orgScale = newScale;
      _orgApplyTransform();
    }
    e.preventDefault();
  }, { passive: false });

  vp.addEventListener('touchend', e => {
    _touches = Array.from(e.touches);
    // Short tap (< 300ms, < 8px move) on a single touch = treat as click
    if (!_touchMoved && Date.now() - _touchStartTime < 300 && e.changedTouches.length === 1) {
      const t = e.changedTouches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      if (el) {
        // Walk up to find the org-node (which has the onclick handler)
        const node = el.closest('[onclick]') || el;
        if (node && node.onclick) node.onclick(new MouseEvent('click', { bubbles: true }));
      }
    }
  });
}

