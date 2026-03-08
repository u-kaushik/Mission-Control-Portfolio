// Mission Control — Init & boot sequence (must load last)
// =============================================
// INIT
// =============================================
loadSettings();
applySettings();

// Initial render with hardcoded agents while DB loads
renderAgents([]);

initMobilePanels();


// ── Guard: if opened as file:// instead of http://, redirect to server ──
if (window.location.protocol === 'file:') {
  document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif;background:#f5f5f2;gap:16px;text-align:center;padding:24px">
      <div style="font-size:40px"><i class="ph-thin ph-rocket"></i></div>
      <div style="font-size:20px;font-weight:700;color:#111">Open via the server</div>
      <div style="font-size:14px;color:#737373;max-width:400px">Mission Control needs to run through the local server to load Supabase data and assets. You've opened it as a plain file.</div>
      <a href="http://localhost:3000" style="margin-top:8px;padding:10px 24px;background:var(--blue);color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Open http://localhost:3000 →</a>
      <div style="font-size:12px;color:#a3a3a3">Server running via PM2. If this link doesn't work, run: <code style="background:#e5e5e0;padding:2px 6px;border-radius:4px">pm2 start pm2.config.js</code></div>
    </div>`;
  throw new Error('Opened as file:// — redirected to server notice');
}

// ── Startup: fire scorecard + ticker immediately (no DB data needed for initial render)
// Kick off news fetch early so headlines are ready when ticker re-inits after DB load
fetchNewsHeadlines().then(items => { MC.ticker.newsItems = items; try { initTicker(); } catch(_){} }).catch(() => {});
try { initTicker(); }         catch(e) { console.warn('[startup:immediate] initTicker:', e); }
renderScorecardPage().catch(e => console.warn('[startup:immediate] renderScorecardPage:', e));
try { renderDashboard(); }    catch(e) { console.warn('[startup:immediate] renderDashboard:', e); }

// ── Load all DB data, then re-render with real data
fullRefresh()
  .catch(err => console.warn('[startup] fullRefresh failed:', err))
  .finally(() => {
    try { restartPolling(); }     catch(e) { console.warn('[startup] restartPolling:', e); }
    try { renderDashboard(); }    catch(e) { console.warn('[startup] renderDashboard:', e); }
    renderScorecardPage()
      .then(() => {
        // Re-fetch news (may have loaded by now) and re-init ticker with full DB data
        fetchNewsHeadlines().then(items => { MC.ticker.newsItems = items; }).catch(() => {}).finally(() => {
          try { initTicker(); } catch(e) { console.warn('[startup] initTicker:', e); }
        });
        // Auto-populate scorecard from live data, then re-render to show computed values
        const curWeek = scorecardWeekISO(scorecardMondayOf(new Date()));
        scorecardAutoPopulate(curWeek)
          .then(changed => { if (changed) renderScorecardPage().catch(() => {}); })
          .catch(e => console.warn('[startup] scorecard auto-populate:', e));
      })
      .catch(e => console.warn('[startup] renderScorecardPage:', e));
    try { updateNavBadge(); }     catch(e) { console.warn('[startup] updateNavBadge:', e); }
    try { initChatWidget(); }    catch(e) { console.warn('[startup] initChatWidget:', e); }
  });
