// Mission Control — Page router, mobile nav, nav collapse
// =============================================
// PAGE ROUTER
// =============================================
// MC.currentPage declared early (near pollTimer) to avoid TDZ in resize handler

function openTaskFromDashboard(taskId) {
  // Navigate to tasks page, ensure it's visible, then open the modal
  navigateTo('tasks');
  const tryOpen = (attempt) => {
    const cardEl = document.querySelector(`[data-task-id="${taskId}"]`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => openCardModal(cardEl), 80);
    } else if (attempt < 6) {
      // Card may not be rendered yet (week filter) — retry
      setTimeout(() => tryOpen(attempt + 1), 200);
    } else {
      // Fallback: open modal directly from MC.allTasks data without a card element
      const task = (window.MC.allTasks || MC.allTasks || []).find(t => t.id === taskId);
      if (task) {
        // Create a synthetic card element with the data the modal needs
        const synth = document.createElement('div');
        synth.dataset.taskId = taskId;
        // Add accent class based on task
        const accent = accentForTask(task);
        synth.classList.add(accent || 'accent-gray');
        document.body.appendChild(synth);
        openCardModal(synth);
        synth.remove();
      }
    }
  };
  setTimeout(() => tryOpen(0), 300);
}

function navigateTo(page) {
  MC.currentPage = page;
  if (typeof closeCompactPanel === 'function') closeCompactPanel();
  // Update desktop nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });
  // Update mobile bottom nav buttons
  const mainPages = ['dashboard','tasks','projects','issues'];
  document.querySelectorAll('.mobile-nav-btn[data-page]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });
  // If navigating to a non-primary page, deactivate all main nav btns
  if (!mainPages.includes(page)) {
    document.querySelectorAll('.mobile-nav-btn[data-page]').forEach(b => b.classList.remove('active'));
  }
  // Show/hide pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');
  // Scroll to top on page change
  if (target) { const body = target.querySelector('.page-body'); if (body) body.scrollTop = 0; }
  // Render page content
  if (page === 'dashboard') { renderDashboard(); renderScorecardPage(); }
  else if (page === 'scorecard') { renderScorecardFullPage(); }
  else if (page === 'projects') {
    renderProjectsPage();
    if (!MC.allRocks.length) loadRocks().catch(e => console.warn('[Router] loadRocks failed:', e));
  }
  else if (page === 'tasks') {
    /* On compact layouts, default to showing the kanban/queue panel */
    if (window.innerWidth <= 1280) switchMobilePanel('kanban');
    if (MC.pendingTaskId) {
      const pendTId = MC.pendingTaskId;
      MC.pendingTaskId = null;
      setTimeout(() => {
        const el = document.querySelector(`[data-task-id="${pendTId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.transition = 'box-shadow 0.3s';
          el.style.boxShadow = '0 0 0 2px var(--primary)';
          setTimeout(() => { el.style.boxShadow = ''; }, 2000);
        }
      }, 300);
    }
  }
  else if (page === 'issues') { renderIssues(); }
  else if (page === 'l10') { renderL10Page(); }
  else if (page === 'calendar') renderCalendarPage();
  else if (page === 'pipeline') renderPipelinePage();
  else if (page === 'clients') renderClientsPage();
  else if (page === 'campaigns') renderCampaignsPage();
  else if (page === 'vto') renderVTOPage();
  else if (page === 'team') renderTeamPage();
  else if (page === 'content') renderContentPlanner();
  else if (page === 'insights') renderInsightsPage();
}

// ── Mobile "More" menu ──────────────────────────────────────────────────
let _mobileMenuOpen = false;
function toggleMobileMenu() {
  _mobileMenuOpen = !_mobileMenuOpen;
  const overlay = document.getElementById('mobile-more-overlay');
  if (overlay) overlay.style.display = _mobileMenuOpen ? 'block' : 'none';
  const moreBtn = document.getElementById('mobile-more-btn');
  if (moreBtn) moreBtn.classList.toggle('active', _mobileMenuOpen);
}

// Nav item clicks
document.getElementById('left-nav').addEventListener('click', e => {
  const item = e.target.closest('.nav-item[data-page]');
  if (item) { navigateTo(item.dataset.page); return; }
});

// Collapse / expand nav
let navCollapsed = false;
document.getElementById('nav-collapse-btn').addEventListener('click', () => {
  navCollapsed = true;
  document.getElementById('left-nav').classList.add('collapsed');
});
document.getElementById('nav-expand-btn').addEventListener('click', () => {
  navCollapsed = false;
  document.getElementById('left-nav').classList.remove('collapsed');
});

// Settings now navigates to its own page (data-page="settings" handled by nav click router above)

// ── Settings page: left-nav panel switcher ──
document.querySelectorAll('.settings-nav-item[data-panel]').forEach(btn => {
  btn.addEventListener('click', () => {
    // Activate nav item
    document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Show correct panel
    const panelId = 'sp-' + btn.dataset.panel;
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.add('active');
  });
});
