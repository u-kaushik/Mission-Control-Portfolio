// Mission Control — Polling & mobile panel switching
// =============================================
// POLLING (restartable so settings changes apply)
// =============================================
const FULL_INTERVAL = 120000;

async function loadAgentsOnline(){
  try{
    const agents=await sbQuery('agents',{select:'id,name,status,current_task_id,last_heartbeat,last_seen,metadata',order:'last_heartbeat.desc'});
    if(!Array.isArray(agents))return;
    agents.forEach(a=>{
      if(a.name){
        const ex=Object.entries(MC.dbAgents).find(([id,v])=>v.name&&v.name.toLowerCase()===a.name.toLowerCase());
        if(ex)MC.dbAgents[ex[0]]={...MC.dbAgents[ex[0]],...a};else MC.dbAgents[a.id||a.name]=a;
      }
    });
    const al=document.getElementById('agents-list');if(al)renderAgents(agents);
    // Count online agents using canonical getAgentLiveStatus() — same logic as all other surfaces
    const oc=AGENTS.filter(a=>getAgentLiveStatus(a.id).status!=='offline').length;
    const ha=document.getElementById('hdr-agents');if(ha)ha.textContent=oc+1; // +1 Utkarsh
  } catch (e) { console.warn('[Polling] loadAgentsOnline failed:', e); }
}

async function quickRefresh(){
  await Promise.all([loadMessages(),loadTasks(),loadIssues(),loadNotifications(),loadAgentsOnline()]);
}

async function fullRefresh() {
  // Race each load against a 10s timeout so one slow table can't hang the whole startup
  const withTimeout = (p) => Promise.race([p, new Promise(r => setTimeout(r, 10000))]);
  await Promise.all([
    withTimeout(loadMessages()),
    withTimeout(loadTasks()),
    withTimeout(loadGoals()),
    withTimeout(loadProjects()),
    withTimeout(loadAgents()),
    withTimeout(loadIssues()),
    withTimeout(loadRocks()),
    withTimeout(loadNotifications())
  ]);
}

async function pollTick() {
  MC.pollCount++;
  if (MC.pollCount % Math.max(1, Math.floor(FULL_INTERVAL / S.quickInterval)) === 0) {
    await fullRefresh();
  } else {
    await quickRefresh();
  }
}

function restartPolling() {
  if (MC.pollTimer) clearInterval(MC.pollTimer);
  MC.pollTimer = setInterval(pollTick, S.quickInterval);
}

// =============================================
// MOBILE PANEL SWITCHING
// =============================================
let currentMobilePanel = 'agents';
const COMPACT_PANEL_BREAKPOINT = 1280;
const FEED_POPOUT_BREAKPOINT = 1450;

function isCompactPanelMode() {
  return window.innerWidth <= FEED_POPOUT_BREAKPOINT;
}

function applyCompactPanelStyles(el, open) {
  if (!el) return;
  if (!open) {
    [
      'display',
      'position',
      'top',
      'left',
      'right',
      'bottom',
      'transform',
      'width',
      'max-width',
      'height',
      'z-index',
      'border',
      'border-radius',
      'background',
      'box-shadow',
      'overflow'
    ].forEach(prop => el.style.removeProperty(prop));
    return;
  }

  el.style.display = 'flex';
  el.style.position = 'fixed';
  el.style.top = '50%';
  el.style.left = '50%';
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  el.style.transform = 'translate(-50%, -50%)';
  el.style.width = '380px';
  el.style.maxWidth = 'calc(100vw - 24px)';
  el.style.height = 'min(78dvh, 760px)';
  el.style.zIndex = '350';
  el.style.border = '1px solid var(--border)';
  el.style.borderRadius = '18px 18px 14px 14px';
  el.style.background = 'var(--surface)';
  el.style.boxShadow = 'var(--shadow-lg)';
  el.style.overflow = 'hidden';
}

function closeCompactPanel() {
  currentMobilePanel = 'kanban';
  const activePage = document.querySelector('.page.active') || document;
  activePage.querySelectorAll('.agents-panel,.queue-panel,.feed-panel').forEach(el => {
    el.classList.remove('mobile-active');
  });
  activePage.querySelectorAll('.agents-panel,.feed-panel').forEach(el => applyCompactPanelStyles(el, false));
  const backdrop = document.getElementById('panel-popout-backdrop');
  if (backdrop) backdrop.classList.remove('active');
  document.querySelectorAll('.mobile-panel-btn, .queue-mobile-panel-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.panel === 'kanban');
  });
}

function switchMobilePanel(panel) {
  currentMobilePanel = panel;

  // Handle "notifs" as a special case — open the notif dropdown
  if (panel === 'notifs') {
    MC.notifOpen = true;
    document.getElementById('notif-dropdown').classList.add('open');
    loadNotifications();
    // Keep button highlighted but don't change workspace
    document.querySelectorAll('.mobile-nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.panel === 'notifs');
    });
    return;
  }

  // Close notif dropdown if open
  if (MC.notifOpen) {
    MC.notifOpen = false;
    document.getElementById('notif-dropdown').classList.remove('open');
  }

  // Panel class mapping
  const panelMap = {
    agents: '.agents-panel',
    kanban: '.queue-panel',
    feed:   '.feed-panel',
  };

  // Apply compact panel behavior on tablets/narrow laptops too.
  if (isCompactPanelMode()) {
    const activePage = document.querySelector('.page.active') || document;
    const target = activePage.querySelector(panelMap[panel]);
    const wasOpen = target ? target.classList.contains('mobile-active') : false;
    activePage.querySelectorAll('.agents-panel,.queue-panel,.feed-panel').forEach(el => {
      el.classList.remove('mobile-active');
    });
    if (target && panel !== 'kanban' && !wasOpen) {
      target.classList.add('mobile-active');
      applyCompactPanelStyles(target, true);
      const backdrop = document.getElementById('panel-popout-backdrop');
      if (backdrop) backdrop.classList.add('active');
    } else {
      applyCompactPanelStyles(target, false);
      const backdrop = document.getElementById('panel-popout-backdrop');
      if (backdrop) backdrop.classList.remove('active');
    }
  } else {
    closeCompactPanel();
  }

  // Update nav buttons
  document.querySelectorAll('.mobile-panel-btn, .queue-mobile-panel-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.panel === panel);
  });
}

// Initialise mobile panel on load and on resize
function initMobilePanels() {
  if (window.innerWidth <= COMPACT_PANEL_BREAKPOINT) {
    // Ensure current page's mobile nav btn is highlighted
    document.querySelectorAll('.mobile-nav-btn[data-page]').forEach(b => {
      b.classList.toggle('active', b.dataset.page === MC.currentPage);
    });
  }

  if (window.innerWidth > FEED_POPOUT_BREAKPOINT) {
    closeCompactPanel();
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && document.getElementById('panel-popout-backdrop')?.classList.contains('active')) {
    closeCompactPanel();
  }
});

window.addEventListener('resize', initMobilePanels);
