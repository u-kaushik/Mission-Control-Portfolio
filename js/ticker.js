// Mission Control — Header news ticker
// =============================================
// HEADER NEWS TICKER
// =============================================

// ── Fetch AI/agentic news headlines from HN Algolia (free, CORS-friendly) ──
const _NEWS_CACHE_KEY = 'mc_news_cache';
const _NEWS_TTL = 30 * 60 * 1000; // 30 minutes

async function fetchNewsHeadlines() {
  // Check localStorage cache
  try {
    const raw = localStorage.getItem(_NEWS_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached.ts && (Date.now() - cached.ts) < _NEWS_TTL) return cached.items;
    }
  } catch (_) {}

  const queries = [
    '"AI agents"',
    '"OpenAI" OR "Claude" OR "Anthropic"',
    '"LLM" OR "AI coding"',
    '"OpenClaw"',
  ];
  const base = 'https://hn.algolia.com/api/v1/search_by_date';

  try {
    const results = await Promise.all(queries.map(q =>
      fetch(`${base}?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=5`)
        .then(r => r.ok ? r.json() : { hits: [] })
        .catch(() => ({ hits: [] }))
    ));

    // Deduplicate by objectID, sort newest first
    const seen = new Set();
    const all = [];
    results.forEach(r => (r.hits || []).forEach(h => {
      if (!seen.has(h.objectID)) {
        seen.add(h.objectID);
        const domain = h.url ? new URL(h.url).hostname.replace(/^www\./, '') : 'news.ycombinator.com';
        all.push({ title: h.title, url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`, source: domain, ts: h.created_at_i || 0 });
      }
    }));
    all.sort((a, b) => b.ts - a.ts);
    const items = all.slice(0, 8);

    try { localStorage.setItem(_NEWS_CACHE_KEY, JSON.stringify({ ts: Date.now(), items })); } catch (_) {}
    return items;
  } catch (_) {
    // On failure, return stale cache if any
    try {
      const raw = localStorage.getItem(_NEWS_CACHE_KEY);
      if (raw) return JSON.parse(raw).items || [];
    } catch (__) {}
    return [];
  }
}

function initTicker() {
  const win    = document.getElementById('header-ticker-window');
  if (!win) return;
  // Kill any pre-existing interval from a previous initTicker call
  if (MC.ticker.interval) { clearInterval(MC.ticker.interval); MC.ticker.interval = null; }

  const vto = (MC.vtoData) || MC.vtoData || {};

  const slides = [
    // ── VISION ──
    { section:'VISION',   sub:'<i class="ph-thin ph-lightbulb"></i> Purpose',        page:'vto', text: vto.vto_purpose       || 'Eliminate the friction of B2B storytelling for founders.' },
    { section:'VISION',   sub:'<i class="ph-thin ph-crosshair"></i> Niche',           page:'vto', text: vto.vto_niche         || 'Ghostwriting for Boutique Service Firms (10–50 employees).' },
    { section:'VISION',   sub:'<i class="ph-thin ph-target"></i> 10-Year',         page:'vto', text: vto.vto_10yr          || 'The Content Utility — backend Content OS for 500 firms.' },
    { section:'VISION',   sub:'<i class="ph-thin ph-compass"></i> Market',          page:'vto', text: vto.vto_target_market || 'Boutique UK/US service firms — Law, Consultancy, Agency Owners.' },
    { section:'VISION',   sub:'<i class="ph-thin ph-lightning"></i> Differentiators', page:'vto', text: (vto.vto_uniques||'Profit Proof · Agent Velocity · Human Soul').split('\n')[0] },
    { section:'VISION',   sub:'<i class="ph-thin ph-shield"></i> Guarantee',       page:'vto', text: vto.vto_guarantee     || 'Every piece reviewed by a human editor — rewrite if it misses brief.' },
    { section:'VISION',   sub:'<i class="ph-thin ph-binoculars"></i> 3-Year Rev',      page:'vto', text: `${vto.vto_3yr_revenue || '£1M MRR'} by ${vto.vto_3yr_date || 'Sep 2029'} — ${vto.vto_3yr_measurables || '500+ retainers, hubs in Spain & London'}` },
    // ── TRACTION ──
    { section:'TRACTION', sub:'<i class="ph-thin ph-calendar-blank"></i> 1-Year Goal',     page:'vto', text: `${vto.vto_1yr_revenue || '£100k MRR'} by ${vto.vto_1yr_date || 'Sep 2026'}` },
    { section:'TRACTION', sub:'<i class="ph-thin ph-list-bullets"></i> Measurables',     page:'vto', text: vto.vto_1yr_measurables || '30 retainers · Voice Engine 95% · Client Portal live' },
    { section:'TRACTION', sub:'<i class="ph-thin ph-currency-dollar"></i> 1-Year Profit',   page:'vto', text: `Target profit: ${vto.vto_1yr_profit || '£50k/month (50%)'}` },
    { section:'TRACTION', sub:'<i class="ph-thin ph-mountains"></i> Q1 Rocks',        page:'vto', text: vto.vto_q_measurables || '3 beta clients live · Voice Profiles for 10 founders · Conversion Tracker live' },
    { section:'TRACTION', sub:'<i class="ph-thin ph-currency-dollar"></i> Q1 Revenue',      page:'vto', text: `Q1 target: ${vto.vto_q_revenue || '£10k MRR'} · profit ${vto.vto_q_profit || '£5k/month'}` },
  ];

  // ── DATA slides — one per metric, latest row only, canonical order ──
  const _TICKER_METRIC_ORDER = [
    'Revenue (£)', 'Orders', 'Ad spend (£)', 'ROAS',
    'Conversion rate (%)', 'New email subscribers', 'Avg order value (£)',
  ];
  const scRows = (MC.scorecardRows) || [];
  const latestByMetric = {};
  scRows.forEach(function(row) {
    if (!row || !row.metric_name) return;
    const ex = latestByMetric[row.metric_name];
    if (!ex || row.week_of > ex.week_of) latestByMetric[row.metric_name] = row;
  });
  const metricKeys = _TICKER_METRIC_ORDER.filter(n => latestByMetric[n])
    .concat(Object.keys(latestByMetric).filter(n => !_TICKER_METRIC_ORDER.includes(n)));
  metricKeys.forEach(function(name) {
    const row = latestByMetric[name];
    const actual = row.actual_value;
    const target = row.target_value;
    const below  = actual != null && target != null && Number(actual) < Number(target);
    const statusStr = actual != null ? (below ? 'Off Track' : 'On Track') : 'No data yet';
    const targetStr = target != null ? (target === 0 ? '' : ' ≥' + target) : '';
    slides.push({ section:'DATA', sub:'<i class="ph-thin ph-chart-bar"></i> Scorecard', page:'scorecard',
      text: name + targetStr + ' — ' + statusStr });
  });

  // ── ISSUE slides (open issues, up to 4) ──
  const openIssues = (typeof MC.allIssues !== 'undefined' ? MC.allIssues : []).filter(function(iss) {
    return (iss.status || '').toLowerCase() !== 'solved';
  }).slice(0, 4);
  openIssues.forEach(function(iss) {
    const owner = iss.owner || iss.assigned_to || 'Team';
    const label = iss.status === 'ids' ? 'IDS' : 'Open';
    slides.push({ section:'ISSUE', sub:'<i class="ph-thin ph-fire"></i> ' + label, page:'issues',
      text: (iss.title || 'Untitled') + ' — ' + owner });
  });

  // ── NEWS slides (from pre-fetched HN headlines) ──
  (MC.ticker.newsItems || []).forEach(function(item) {
    slides.push({ section:'NEWS', sub:'<i class="ph-thin ph-newspaper"></i> ' + escHtml(item.source || 'HN'), page:null,
      text: item.title, url: item.url });
  });

  // Inject slide divs
  win.innerHTML = slides.map((s, i) =>
    `<div class="header-ticker-slide ${i === 0 ? 'active' : 'below'}" data-idx="${i}">`
    + `<span style="overflow:hidden;text-overflow:ellipsis">${escHtml(s.text)}</span>`
    + `</div>`
  ).join('');

  const pillEl    = document.getElementById('header-ticker-label');
  const subPillEl = document.getElementById('header-ticker-sublabel');
  if (pillEl)    pillEl.textContent    = slides[0].section;
  if (subPillEl) subPillEl.innerHTML = slides[0].sub;

  const PILL_COLORS = {
    VISION:   { color:'var(--blue)',   bg:'var(--blue-bg)' },
    TRACTION: { color:'var(--amber)',  bg:'var(--amber-bg)' },
    DATA:     { color:'var(--green)',  bg:'var(--green-bg)' },
    ISSUE:    { color:'var(--orange)', bg:'var(--orange-bg)' },
    NEWS:     { color:'var(--cyan)',   bg:'var(--cyan-bg)' },
  };
  function updatePillColors(slide) {
    if (!pillEl) return;
    const c = PILL_COLORS[slide.section] || PILL_COLORS.VISION;
    pillEl.style.color      = c.color;
    pillEl.style.background = c.bg;
  }
  updatePillColors(slides[0]);

  let current = 0;
  const total = slides.length;
  // Render initial dots after catIndices is built (see below)

  // Pre-compute category groupings for dot indicators
  const catIndices = {};
  slides.forEach((s, i) => { if (!catIndices[s.section]) catIndices[s.section] = []; catIndices[s.section].push(i); });
  const dotsEl = document.getElementById('header-ticker-dots');

  function renderDots(slide, slideIdx) {
    if (!dotsEl) return;
    const group = catIndices[slide.section] || [];
    const posInGroup = group.indexOf(slideIdx);
    dotsEl.innerHTML = group.map((_, i) =>
      `<span style="width:${i === posInGroup ? '10px' : '3px'};height:3px;border-radius:2px;`
      + `background:${i === posInGroup ? (PILL_COLORS[slide.section] || PILL_COLORS.VISION).color : 'var(--text-muted)'};`
      + `opacity:${i === posInGroup ? '1' : '0.3'};transition:all 0.3s"></span>`
    ).join('');
  }
  renderDots(slides[0], 0);  // initial dots for first slide

  function showSlide(idx) {
    const els = win.querySelectorAll('.header-ticker-slide');
    const prev = current;
    current = ((idx % total) + total) % total;
    els[prev].className    = 'header-ticker-slide above';
    els[current].className = 'header-ticker-slide active';
    els.forEach((el, i) => { if (i !== current && i !== prev) el.className = 'header-ticker-slide below'; });
    if (pillEl)    pillEl.textContent    = slides[current].section;
    if (subPillEl) subPillEl.innerHTML = slides[current].sub;
    updatePillColors(slides[current]);
    renderDots(slides[current], current);
    MC.ticker.current = current;
  }

  function advanceTicker() {
    const sec = MC.ticker.filterSection;
    if (!sec) { showSlide(current + 1); return; }
    // Advance only within filtered section
    let next = (current + 1) % total;
    for (let i = 0; i < total; i++) {
      const idx = (next + i) % total;
      if (slides[idx].section === sec) { showSlide(idx); return; }
    }
    showSlide(current + 1);
  }

  // Expose globals for external click handlers
  MC.ticker.slides         = slides;
  MC.ticker.current        = 0;
  MC.ticker.filterSection  = null;

  MC.ticker.setSection = function(sectionKey) {
    if (MC.ticker.filterSection === sectionKey) {
      // Toggle off — restore to all slides
      MC.ticker.filterSection = null;
    } else {
      MC.ticker.filterSection = sectionKey;
      // Jump to first slide of this section
      const idx = slides.findIndex(s => s.section === sectionKey);
      if (idx !== -1) showSlide(idx);
    }
    // Reset interval so user gets full 4.5s before next advance
    if (MC.ticker.interval) clearInterval(MC.ticker.interval);
    MC.ticker.interval = setInterval(advanceTicker, 4500);
  };

  MC.ticker.jumpToSection = function(sectionKey) {
    if (MC.ticker.setSection) MC.ticker.setSection(sectionKey);
  };

  MC.ticker.interval = setInterval(advanceTicker, 4500);

  // ── Sublabel click → open category items overlay ──
  if (subPillEl) {
    subPillEl.onclick = function(e) {
      e.stopPropagation();
      openTickerCategoryOverlay();
    };
  }
}

// ── Ticker click handlers (called from HTML) ────────────────────────────
function tickerSlideClick() {
  const slides = MC.ticker.slides;
  if (!slides) return;
  const slide = slides[MC.ticker.current || 0];
  if (slide && slide.url) { window.open(slide.url, '_blank'); return; }
  if (slide && slide.page) navigateTo(slide.page);
}

function tickerCategoryClick(e) {
  e.stopPropagation();
  const existing = document.getElementById('ticker-cat-popout');
  if (existing) { existing.remove(); return; }
  const label = document.getElementById('header-ticker-label');
  if (!label) return;
  const rect = label.getBoundingClientRect();
  const cats = [
    { key:'VISION',   label:'Vision',    color:'var(--blue)',   bg:'var(--blue-bg)' },
    { key:'TRACTION', label:'Traction',  color:'var(--amber)',  bg:'var(--amber-bg)' },
    { key:'DATA',     label:'Scorecard', color:'var(--green)',  bg:'var(--green-bg)' },
    { key:'ISSUE',    label:'Issues',    color:'var(--orange)', bg:'var(--orange-bg)' },
    { key:'NEWS',     label:'News',      color:'var(--cyan)',   bg:'var(--cyan-bg)' },
  ];
  const active = MC.ticker.filterSection;
  const pop = document.createElement('div');
  pop.id = 'ticker-cat-popout';
  pop.style.top  = (rect.bottom + 6) + 'px';
  pop.style.left = rect.left + 'px';
  cats.forEach(cat => {
    const isActive = active === cat.key;
    const btn = document.createElement('button');
    btn.style.cssText = `display:flex;align-items:center;gap:7px;width:100%;padding:7px 12px;border:none;
      background:${isActive ? cat.bg : 'none'};cursor:pointer;
      text-align:left;border-radius:6px;font-size:11px;font-weight:700;color:${cat.color};font-family:inherit;
      transition:background 0.1s`;
    btn.innerHTML = `<span style="font-size:8px;opacity:${isActive ? 1 : 0}">●</span>${escHtml(cat.label)}`;
    btn.onmouseover = () => btn.style.background = cat.bg;
    btn.onmouseout  = () => btn.style.background = isActive ? cat.bg : 'none';
    btn.onclick = (ev) => {
      ev.stopPropagation();
      pop.remove();
      if (MC.ticker.setSection) MC.ticker.setSection(cat.key);
    };
    pop.appendChild(btn);
  });
  document.body.appendChild(pop);
  setTimeout(() => {
    document.addEventListener('click', function _closePop() {
      pop.remove();
      document.removeEventListener('click', _closePop);
    }, { once: true });
  }, 0);
}

// ── Category items overlay (click sublabel to scan all items) ──────────
const _TIP_COLORS = {
  VISION:   { color:'var(--blue)',   bg:'var(--blue-bg)' },
  TRACTION: { color:'var(--amber)',  bg:'var(--amber-bg)' },
  DATA:     { color:'var(--green)',  bg:'var(--green-bg)' },
  ISSUE:    { color:'var(--orange)', bg:'var(--orange-bg)' },
  NEWS:     { color:'var(--cyan)',   bg:'var(--cyan-bg)' },
};

function closeTickerItemsOverlay() {
  var p = document.getElementById('ticker-items-popout');
  var b = document.getElementById('ticker-items-backdrop');
  if (p) p.remove();
  if (b) b.remove();
  document.removeEventListener('keydown', _tipEscHandler);
}

function _tipEscHandler(e) {
  if (e.key === 'Escape') closeTickerItemsOverlay();
}

function openTickerCategoryOverlay() {
  // Toggle off if already open
  if (document.getElementById('ticker-items-popout')) { closeTickerItemsOverlay(); return; }

  var slides = MC.ticker.slides;
  if (!slides || !slides.length) return;
  var currentSlide = slides[MC.ticker.current || 0];
  if (!currentSlide) return;
  var section = currentSlide.section;
  var catSlides = slides.filter(function(s) { return s.section === section; });
  if (!catSlides.length) return;

  var theme = _TIP_COLORS[section] || _TIP_COLORS.VISION;

  // Strip HTML tags from sub labels for plain text display
  function stripHtml(html) { var d = document.createElement('div'); d.innerHTML = html; return d.textContent || ''; }

  var rowsHtml = catSlides.map(function(s, i) {
    var arrow = s.url ? '<span class="tip-row-arrow">↗</span>' : '';
    return '<div class="tip-row" data-tip-idx="' + i + '">'
      + '<span class="tip-row-sub">' + escHtml(stripHtml(s.sub)) + '</span>'
      + '<span class="tip-row-text">' + escHtml(s.text) + '</span>'
      + arrow
      + '</div>';
  }).join('');

  var pop = document.createElement('div');
  pop.id = 'ticker-items-popout';
  pop.innerHTML = '<div class="tip-header">'
    + '<span class="tip-cat-pill" style="color:' + theme.color + ';background:' + theme.bg + '">' + escHtml(section) + '</span>'
    + '<span class="tip-count">' + catSlides.length + ' item' + (catSlides.length !== 1 ? 's' : '') + '</span>'
    + '</div>'
    + '<div class="tip-items">' + rowsHtml + '</div>';

  // Position below the sub-label pill, left-aligned to its start
  var subEl = document.getElementById('header-ticker-sublabel');
  var rect = subEl ? subEl.getBoundingClientRect() : { bottom: 50, left: 100 };
  pop.style.top = (rect.bottom + 6) + 'px';
  var left = rect.left;
  if (left + 400 > window.innerWidth - 16) left = window.innerWidth - 416;
  if (left < 16) left = 16;
  pop.style.left = left + 'px';

  // Backdrop
  var bd = document.createElement('div');
  bd.id = 'ticker-items-backdrop';
  bd.onclick = closeTickerItemsOverlay;

  document.body.appendChild(bd);
  document.body.appendChild(pop);
  document.addEventListener('keydown', _tipEscHandler);

  // Row click handlers
  pop.querySelectorAll('.tip-row').forEach(function(row) {
    row.addEventListener('click', function() {
      var idx = parseInt(row.dataset.tipIdx, 10);
      var s = catSlides[idx];
      if (!s) return;
      closeTickerItemsOverlay();
      if (s.url) { window.open(s.url, '_blank'); return; }
      if (s.page) navigateTo(s.page);
    });
  });
}

// initTicker() is called from the startup block after MC.vtoData is declared

