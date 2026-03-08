// Mission Control — Google Calendar-style page & notes helpers
// ── Notes helpers (shared between page and any future use) ──
const NOTE_TYPE_COLOR = {
  'note': 'note-color-yellow', 'idea': 'note-color-purple',
  'reminder': 'note-color-blue', 'fact': 'note-color-green', 'decision': 'note-color-gray',
};
const NOTE_TYPE_ICONS = { note:'<i class="ph-thin ph-note-pencil"></i>', idea:'<i class="ph-thin ph-lightbulb"></i>', reminder:'<i class="ph-thin ph-clock"></i>', fact:'<i class="ph-thin ph-push-pin"></i>', decision:'<i class="ph-thin ph-check-circle"></i>' };

async function fetchNotes() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/memory?order=created_at.desc&limit=200`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) return [];
    const rows = await res.json();
    // Filter: show only user-written notes (source = mission-control or null).
    // Exclude context dumps (source = utkarsh_context) — those show in Personal Ambitions on Dashboard.
    return rows.filter(r => {
      const src = (r.metadata && r.metadata.source) || '';
      return src === 'mission-control' || src === '' || !src;
    });
  } catch { return []; }
}

async function saveNote(content, type, category = 'personal') {
  const svcKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRodGNteGRjY2h4eGJyc2JramFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM0NTkzNSwiZXhwIjoyMDg2OTIxOTM1fQ.qqu06e6TzOE4je51biPDOZs6TrBoxvOgbUKvyHhCb08';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/memory`, {
    method: 'POST',
    headers: { 'apikey': svcKey, 'Authorization': `Bearer ${svcKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify({ content, type, scope: 'personal', created_by: 'utkarsh', metadata: { source: 'mission-control', category } })
  });
  if (!res.ok) { console.error('Failed to save note:', await res.text()); return null; }
  const rows = await res.json(); return rows[0];
}

async function deleteNote(id) {
  const svcKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRodGNteGRjY2h4eGJyc2JramFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM0NTkzNSwiZXhwIjoyMDg2OTIxOTM1fQ.qqu06e6TzOE4je51biPDOZs6TrBoxvOgbUKvyHhCb08';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/memory?id=eq.${id}`, {
    method: 'DELETE', headers: { 'apikey': svcKey, 'Authorization': `Bearer ${svcKey}` }
  });
  if (!res.ok) console.warn('[Calendar] deleteNote failed:', res.status);
}

// ══════════════════════════════════════════════════════════════
// GOOGLE CALENDAR-STYLE PAGE
// ══════════════════════════════════════════════════════════════

const GC_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const GC_DAYS_SHORT = ['S','M','T','W','T','F','S'];
const GC_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const GC_MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const GC_SOURCE_COLORS = {
  google:    { color: 'var(--blue)',    bg: 'var(--blue-bg)',    label: 'Google Calendar' },
  tasks:     { color: 'var(--primary)', bg: 'var(--primary-light)', label: 'Tasks' },
  rocks:     { color: 'var(--amber)',   bg: 'var(--amber-bg)',   label: 'Rocks' },
  outreach:  { color: 'var(--cyan)',    bg: 'var(--cyan-bg)',    label: 'Outreach' },
  content:   { color: 'var(--purple)',  bg: 'var(--purple-bg)',  label: 'Content' },
  pipeline:  { color: 'var(--green)',   bg: 'var(--green-bg)',   label: 'Pipeline' },
  my_events: { color: 'var(--red)',     bg: 'var(--red-bg)',     label: 'My Events' },
};

const GC_EVENT_COLORS = ['var(--red)','var(--amber)','var(--green)','var(--blue)','var(--primary)','var(--purple)','var(--cyan)','var(--rose)'];

const CAL = {
  view: 'week',
  anchor: new Date(),
  events: [],
  sources: { google: true, tasks: true, rocks: true, outreach: true, content: true, pipeline: true, my_events: true },
  dragging: null,
  eventDrag: null,
  editing: null,
  miniMonth: new Date(),
};

// ── Date helpers ──
function gcDateKey(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function gcSameDay(a, b) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function gcStartOfWeek(d) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r; }
function gcAddDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function gcFmtTime(d) { const h = d.getHours(), m = d.getMinutes(); return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`; }

// ── Data fetchers ──
async function gcFetchAllEvents() {
  const results = await Promise.allSettled([
    gcFetchGoogle(), gcFetchTasks(), gcFetchRocks(),
    gcFetchOutreach(), gcFetchContent(), gcFetchPipeline(), gcFetchMyEvents(),
  ]);
  var allEvts = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  // Deduplicate: prefer my_events over google source when same google_event_id
  var myGids = new Set();
  allEvts.forEach(function(ev) { if (ev.source === 'my_events' && ev.googleEventId) myGids.add(ev.googleEventId); });
  CAL.events = allEvts.filter(function(ev) {
    if (ev.source === 'google' && myGids.has(ev.id.substring(2))) return false;
    return true;
  });
}

async function gcFetchGoogle() {
  try {
    const res = await fetch('/api/calendar');
    if (!res.ok) return [];
    const data = await res.json();
    return (data.events || []).map(ev => ({
      id: 'g_' + (ev.id || Math.random().toString(36).slice(2)),
      title: ev.summary || 'Google Event',
      start: new Date(ev.start), end: ev.end ? new Date(ev.end) : new Date(new Date(ev.start).getTime() + 3600000),
      allDay: !!ev.allDay, color: GC_SOURCE_COLORS.google.color, bg: GC_SOURCE_COLORS.google.bg,
      source: 'google', editable: false, description: ev.description || '', location: ev.location || '',
    }));
  } catch { return []; }
}

async function gcFetchTasks() {
  try {
    const rows = await sbQuery('agency_todos', { select: 'id,title,status,due_date,assigned_to', 'due_date': 'not.is.null', 'status': 'neq.done', limit: 200 });
    return (rows || []).filter(t => t.due_date).map(t => {
      const d = new Date(t.due_date);
      return { id: 't_'+t.id, title: t.title || 'Task', start: d, end: new Date(d.getTime()+3600000), allDay: true, color: GC_SOURCE_COLORS.tasks.color, bg: GC_SOURCE_COLORS.tasks.bg, source: 'tasks', editable: false, description: `Status: ${t.status||'—'}\nAssigned: ${t.assigned_to||'—'}` };
    });
  } catch { return []; }
}

async function gcFetchRocks() {
  try {
    const rows = await sbQuery('rocks', { select: 'id,title,status,due_date,owner_id', 'due_date': 'not.is.null', limit: 100 });
    return (rows || []).filter(r => r.due_date).map(r => {
      const d = new Date(r.due_date);
      return { id: 'r_'+r.id, title: (r.title || 'Rock'), start: d, end: new Date(d.getTime()+3600000), allDay: true, color: GC_SOURCE_COLORS.rocks.color, bg: GC_SOURCE_COLORS.rocks.bg, source: 'rocks', editable: false, description: `Status: ${r.status||'—'}\nOwner: ${r.owner_id||'—'}` };
    });
  } catch { return []; }
}

async function gcFetchOutreach() {
  try {
    const rows = await sbQuery('outreach', { select: 'id,company,contact,channel,send_date,follow_up,subject', limit: 200 });
    const evs = [];
    (rows || []).forEach(o => {
      if (o.send_date) { const d = new Date(o.send_date); evs.push({ id: 'o_'+o.id, title: `${o.company||''} — ${o.contact||''}`, start: d, end: new Date(d.getTime()+1800000), allDay: true, color: GC_SOURCE_COLORS.outreach.color, bg: GC_SOURCE_COLORS.outreach.bg, source: 'outreach', editable: false, description: `Channel: ${o.channel||'email'}\nSubject: ${o.subject||'—'}` }); }
      if (o.follow_up) { const d = new Date(o.follow_up); evs.push({ id: 'of_'+o.id, title: `Follow-up: ${o.company||''}`, start: d, end: new Date(d.getTime()+1800000), allDay: true, color: GC_SOURCE_COLORS.outreach.color, bg: GC_SOURCE_COLORS.outreach.bg, source: 'outreach', editable: false, description: `Follow-up with ${o.contact||'—'} at ${o.company||'—'}` }); }
    });
    return evs;
  } catch { return []; }
}

async function gcFetchContent() {
  try {
    const rows = await sbQuery('content_tracker', { select: 'id,title,status,due_date,delivered_date,assigned_to,content_type', 'due_date': 'not.is.null', limit: 200 });
    return (rows || []).filter(c => c.due_date).map(c => {
      const d = new Date(c.due_date);
      return { id: 'c_'+c.id, title: (c.title || 'Content'), start: d, end: new Date(d.getTime()+3600000), allDay: true, color: GC_SOURCE_COLORS.content.color, bg: GC_SOURCE_COLORS.content.bg, source: 'content', editable: false, description: `Type: ${c.content_type||'—'}\nStatus: ${c.status||'—'}\nAssigned: ${c.assigned_to||'—'}` };
    });
  } catch { return []; }
}

async function gcFetchPipeline() {
  try {
    const rows = await sbQuery('pipeline', { select: 'id,company,contact,stage,value,next_date,next_action', 'next_date': 'not.is.null', limit: 200 });
    return (rows || []).filter(p => p.next_date).map(p => {
      const d = new Date(p.next_date);
      return { id: 'p_'+p.id, title: (p.company || 'Deal'), start: d, end: new Date(d.getTime()+3600000), allDay: true, color: GC_SOURCE_COLORS.pipeline.color, bg: GC_SOURCE_COLORS.pipeline.bg, source: 'pipeline', editable: false, description: `Stage: ${p.stage||'—'}\nNext: ${p.next_action||'—'}\nValue: \u{00A3}${p.value||0}` };
    });
  } catch { return []; }
}

async function gcFetchMyEvents() {
  try {
    const rows = await sbQuery('calendar_events', { select: '*', order: 'start_time.asc', limit: 500 });
    return (rows || []).map(e => ({
      id: 'e_'+e.id, rawId: e.id, title: e.title, start: new Date(e.start_time), end: new Date(e.end_time),
      allDay: !!e.all_day, color: e.color || GC_SOURCE_COLORS.my_events.color, bg: GC_SOURCE_COLORS.my_events.bg,
      source: 'my_events', editable: true, description: e.description || '', location: e.location || '',
      googleEventId: e.google_event_id || null,
    }));
  } catch { return []; }
}

// ── Visible events filter ──
function gcVisibleEvents() { return CAL.events.filter(ev => CAL.sources[ev.source]); }

function gcEventsForDay(date, events) {
  const dk = gcDateKey(date);
  return events.filter(ev => {
    const sk = gcDateKey(ev.start);
    const ek = gcDateKey(ev.end.getTime() === ev.start.getTime() ? ev.end : new Date(ev.end.getTime() - 1));
    return dk >= sk && dk <= ek;
  });
}

// ── View date range ──
function gcViewRange() {
  const a = new Date(CAL.anchor); a.setHours(0,0,0,0);
  if (CAL.view === 'day') return { start: new Date(a), end: gcAddDays(a, 1), cols: 1 };
  if (CAL.view === 'week') { const s = gcStartOfWeek(a); return { start: s, end: gcAddDays(s, 7), cols: 7 }; }
  if (CAL.view === '4day') return { start: new Date(a), end: gcAddDays(a, 4), cols: 4 };
  const first = new Date(a.getFullYear(), a.getMonth(), 1);
  const start = gcStartOfWeek(first);
  const last = new Date(a.getFullYear(), a.getMonth()+1, 0);
  const end = gcAddDays(gcStartOfWeek(last), 7);
  return { start, end, cols: 7 };
}

// ── Header renderer ──
function gcRenderHeader() {
  const el = document.getElementById('gc-header'); if (!el) return;
  const range = gcViewRange();
  let label = '';
  if (CAL.view === 'month') {
    label = `${GC_MONTHS[CAL.anchor.getMonth()]} ${CAL.anchor.getFullYear()}`;
  } else if (CAL.view === 'day') {
    label = `${GC_MONTHS[CAL.anchor.getMonth()]} ${CAL.anchor.getDate()}, ${CAL.anchor.getFullYear()}`;
  } else {
    const s = range.start, e = gcAddDays(range.end, -1);
    if (s.getMonth() === e.getMonth()) label = `${GC_MONTHS[s.getMonth()]} ${s.getDate()} \u{2013} ${e.getDate()}, ${s.getFullYear()}`;
    else if (s.getFullYear() === e.getFullYear()) label = `${GC_MONTHS_SHORT[s.getMonth()]} ${s.getDate()} \u{2013} ${GC_MONTHS_SHORT[e.getMonth()]} ${e.getDate()}, ${s.getFullYear()}`;
    else label = `${GC_MONTHS_SHORT[s.getMonth()]} ${s.getDate()}, ${s.getFullYear()} \u{2013} ${GC_MONTHS_SHORT[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
  }
  const views = [['day','Day'],['week','Week'],['4day','4 Day'],['month','Month']];
  el.innerHTML = `
    <button class="gc-today-btn" onclick="gcGoToday()">Today</button>
    <button class="gc-nav-btn" onclick="gcNav(-1)">\u{2039}</button>
    <button class="gc-nav-btn" onclick="gcNav(1)">\u{203A}</button>
    <span class="gc-date-label">${escHtml(label)}</span>
    <div class="gc-view-toggle">${views.map(([v,l]) => `<button class="gc-view-btn${CAL.view===v?' active':''}" onclick="gcSetView('${v}')">${l}</button>`).join('')}</div>
  `;
}

// ── Mini calendar ──
function gcRenderMiniCal() {
  const el = document.getElementById('gc-mini-cal'); if (!el) return;
  const m = CAL.miniMonth;
  const year = m.getFullYear(), month = m.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const today = new Date();
  const visible = gcVisibleEvents();

  let cells = '';
  GC_DAYS_SHORT.forEach(d => { cells += `<div class="gc-mini-dow">${d}</div>`; });
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    cells += `<div class="gc-mini-day other-month" onclick="gcMiniClick(${year},${month-1},${day})">${day}</div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const isToday = gcSameDay(date, today);
    const isSelected = gcSameDay(date, CAL.anchor);
    const hasEv = visible.some(ev => gcSameDay(ev.start, date));
    let cls = 'gc-mini-day';
    if (isToday) cls += ' today';
    else if (isSelected) cls += ' selected';
    if (hasEv && !isToday) cls += ' has-events';
    cells += `<div class="${cls}" onclick="gcMiniClick(${year},${month},${d})">${d}</div>`;
  }
  const totalCells = startDay + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    cells += `<div class="gc-mini-day other-month" onclick="gcMiniClick(${year},${month+1},${d})">${d}</div>`;
  }
  el.innerHTML = `
    <div class="gc-mini-header">
      <span class="gc-mini-title">${GC_MONTHS[month]} ${year}</span>
      <div class="gc-mini-nav"><button onclick="gcMiniNav(-1)">\u{2039}</button><button onclick="gcMiniNav(1)">\u{203A}</button></div>
    </div>
    <div class="gc-mini-grid">${cells}</div>
  `;
}

// ── Source toggles ──
function gcRenderSources() {
  const el = document.getElementById('gc-sources'); if (!el) return;
  let html = '<div class="gc-sources-title">Calendars</div>';
  Object.entries(GC_SOURCE_COLORS).forEach(([key, src]) => {
    const active = CAL.sources[key];
    html += `<div class="gc-source-item${active?'':' disabled'}" onclick="gcToggleSource('${key}')">
      <div class="gc-source-dot" style="background:${src.color}"></div>
      <span class="gc-source-label">${src.label}</span>
    </div>`;
  });
  el.innerHTML = html;
}

// ── Time grid renderer (Day / Week / 4-Day) ──
function gcRenderTimeGrid() {
  const main = document.getElementById('gc-main'); if (!main) return;
  const range = gcViewRange();
  const cols = range.cols;
  const events = gcVisibleEvents();
  const today = new Date();
  const gridTemplateCols = `56px repeat(${cols}, 1fr)`;

  // Column headers
  let colHeaders = `<div class="gc-col-headers" style="display:grid;grid-template-columns:${gridTemplateCols}"><div></div>`;
  for (let i = 0; i < cols; i++) {
    const d = gcAddDays(range.start, i);
    const isToday = gcSameDay(d, today);
    colHeaders += `<div class="gc-col-header${isToday?' today':''}"><span>${GC_DAYS[d.getDay()]}</span><span class="gc-col-date">${d.getDate()}</span></div>`;
  }
  colHeaders += '</div>';

  // All-day row
  let allDayHtml = `<div class="gc-allday-row" style="display:grid;grid-template-columns:${gridTemplateCols}"><div class="gc-allday-label">all-day</div>`;
  for (let i = 0; i < cols; i++) {
    const d = gcAddDays(range.start, i);
    const dayEvs = gcEventsForDay(d, events).filter(ev => ev.allDay);
    allDayHtml += `<div class="gc-allday-cell">${dayEvs.map(ev => `<div class="gc-allday-chip" style="background:${ev.bg};color:${ev.color};border-left:3px solid ${ev.color}" onclick="event.stopPropagation();gcShowPopover('${ev.id}',event)">${escHtml(ev.title)}</div>`).join('')}</div>`;
  }
  allDayHtml += '</div>';

  // Time rows (24h)
  let timeHtml = `<div class="gc-grid-wrap" id="gc-grid-wrap"><div class="gc-time-body" style="display:grid;grid-template-columns:${gridTemplateCols};position:relative" id="gc-time-body">`;
  for (let h = 0; h < 24; h++) {
    const label = h === 0 ? '' : (h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`);
    timeHtml += `<div class="gc-time-gutter" style="grid-column:1;grid-row:${h+1}">${label}</div>`;
    for (let c = 0; c < cols; c++) {
      const d = gcAddDays(range.start, c);
      const dk = gcDateKey(d);
      timeHtml += `<div class="gc-time-cell" style="grid-column:${c+2};grid-row:${h+1}" data-date="${dk}" data-hour="${h}" onmousedown="gcDragStart(event,'${dk}',${h})" onclick="gcCellClick('${dk}',${h})"></div>`;
    }
  }
  timeHtml += '</div>';

  // Drag ghost
  timeHtml += '<div class="gc-drag-ghost" id="gc-drag-ghost" style="display:none"></div>';
  timeHtml += '</div>';

  main.innerHTML = colHeaders + allDayHtml + timeHtml;

  // Position timed events with absolute positioning
  const body = document.getElementById('gc-time-body');
  if (body) {
    for (let c = 0; c < cols; c++) {
      const d = gcAddDays(range.start, c);
      const dayEvs = gcEventsForDay(d, events).filter(ev => !ev.allDay);
      dayEvs.forEach(ev => {
        const startMin = ev.start.getHours() * 60 + ev.start.getMinutes();
        const endMin = ev.end.getHours() * 60 + ev.end.getMinutes();
        const duration = Math.max(endMin - startMin, 30);
        const top = (startMin / 60) * 48;
        const height = Math.max((duration / 60) * 48, 20);

        // Calculate left/width based on column position
        const colEls = body.querySelectorAll(`[data-date="${gcDateKey(d)}"][data-hour="0"]`);
        if (colEls.length > 0) {
          const cell = colEls[0];
          const chip = document.createElement('div');
          chip.className = 'gc-event-chip';
          chip.dataset.eventId = ev.id;
          chip.dataset.rawId = ev.rawId || '';
          chip.dataset.editable = ev.editable ? '1' : '';
          chip.dataset.date = gcDateKey(d);
          chip.dataset.durationMin = String(duration);
          chip.style.cssText = `top:${top}px;height:${height}px;background:${ev.bg};color:${ev.color};border-left-color:${ev.color}`;
          chip.innerHTML = `<div class="gc-ev-title">${escHtml(ev.title)}</div><div class="gc-ev-time">${gcFmtTime(ev.start)} \u{2013} ${gcFmtTime(ev.end)}</div>`;
          chip.onclick = (e) => { if (CAL.eventDrag && !CAL.eventDrag.pending) return; e.stopPropagation(); gcShowPopover(ev.id, e); };
          if (ev.editable) {
            chip.onmousedown = (e) => gcEventDragStart(e, ev);
            const rh = document.createElement('div');
            rh.className = 'gc-resize-handle';
            rh.onmousedown = (e) => { e.stopPropagation(); gcResizeStart(e, ev); };
            chip.appendChild(rh);
          }
          cell.appendChild(chip);
        }
      });
    }
  }

  // Now-line
  if (today >= range.start && today < range.end) {
    const nowMin = today.getHours() * 60 + today.getMinutes();
    const nowTop = (nowMin / 60) * 48;
    if (body) {
      const line = document.createElement('div');
      line.className = 'gc-now-line';
      line.style.top = nowTop + 'px';
      line.style.gridColumn = '2 / -1';
      line.innerHTML = '<div class="gc-now-dot"></div>';
      body.appendChild(line);
    }
  }

  // Scroll to 8am
  const wrap = document.getElementById('gc-grid-wrap');
  if (wrap) setTimeout(() => { wrap.scrollTop = 8 * 48; }, 50);
}

// ── Month view renderer ──
function gcRenderMonthView() {
  const main = document.getElementById('gc-main'); if (!main) return;
  const events = gcVisibleEvents();
  const today = new Date();
  const year = CAL.anchor.getFullYear(), month = CAL.anchor.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();

  let html = '<div class="gc-month-grid">';
  GC_DAYS.forEach(d => { html += `<div class="gc-month-dow">${d}</div>`; });

  const prevDays = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevDays - i);
    const dayEvs = gcEventsForDay(d, events).slice(0, 3);
    html += `<div class="gc-month-cell other-month" onclick="gcMonthCellClick(${d.getFullYear()},${d.getMonth()},${d.getDate()})">
      <div class="gc-month-num">${prevDays - i}</div>
      ${dayEvs.map(ev => `<div class="gc-month-ev" style="background:${ev.bg};color:${ev.color}" onclick="event.stopPropagation();gcShowPopover('${ev.id}',event)">${escHtml(ev.title)}</div>`).join('')}
    </div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const isToday = gcSameDay(date, today);
    const dayEvs = gcEventsForDay(date, events);
    const shown = dayEvs.slice(0, 3);
    const more = dayEvs.length - 3;
    html += `<div class="gc-month-cell${isToday?' today':''}" onclick="gcMonthCellClick(${year},${month},${d})">
      <div class="gc-month-num">${d}</div>
      ${shown.map(ev => `<div class="gc-month-ev" style="background:${ev.bg};color:${ev.color}" onclick="event.stopPropagation();gcShowPopover('${ev.id}',event)">${escHtml(ev.title)}</div>`).join('')}
      ${more > 0 ? `<div class="gc-month-more">+${more} more</div>` : ''}
    </div>`;
  }

  const totalCells = startDay + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month + 1, d);
    const dayEvs = gcEventsForDay(date, events).slice(0, 3);
    html += `<div class="gc-month-cell other-month" onclick="gcMonthCellClick(${date.getFullYear()},${date.getMonth()},${date.getDate()})">
      <div class="gc-month-num">${d}</div>
      ${dayEvs.map(ev => `<div class="gc-month-ev" style="background:${ev.bg};color:${ev.color}" onclick="event.stopPropagation();gcShowPopover('${ev.id}',event)">${escHtml(ev.title)}</div>`).join('')}
    </div>`;
  }
  html += '</div>';
  main.innerHTML = html;
}

// ── Event popover ──
function gcShowPopover(evId, mouseEvent) {
  const ev = CAL.events.find(e => e.id === evId); if (!ev) return;
  const pop = document.getElementById('gc-popover'); if (!pop) return;
  const src = GC_SOURCE_COLORS[ev.source] || {};
  const timeStr = ev.allDay ? 'All day' : `${gcFmtTime(ev.start)} \u{2013} ${gcFmtTime(ev.end)}`;
  const dateStr = `${GC_DAYS[ev.start.getDay()]}, ${GC_MONTHS[ev.start.getMonth()]} ${ev.start.getDate()}`;

  pop.innerHTML = `
    <div class="gc-popover-header">
      <div class="gc-popover-title" style="border-left:4px solid ${ev.color};padding-left:10px">${escHtml(ev.title)}</div>
      <div class="gc-popover-actions">
        ${ev.editable ? `<button class="gc-popover-btn" onclick="gcEditEvent('${ev.id}')" title="Edit"><i class="ph-thin ph-pencil-simple"></i></button>` : ''}
        <button class="gc-popover-btn" onclick="gcClosePopover()" title="Close">\u{2715}</button>
      </div>
    </div>
    <div class="gc-popover-body">
      <div class="gc-popover-row"><span class="gc-popover-icon"><i class="ph-thin ph-clock"></i></span><span>${dateStr}<br>${timeStr}</span></div>
      ${ev.location ? `<div class="gc-popover-row"><span class="gc-popover-icon"><i class="ph-thin ph-map-pin"></i></span><span>${escHtml(ev.location)}</span></div>` : ''}
      ${ev.description ? `<div class="gc-popover-row"><span class="gc-popover-icon"><i class="ph-thin ph-note-pencil"></i></span><span style="white-space:pre-wrap">${escHtml(ev.description)}</span></div>` : ''}
      <div class="gc-popover-row"><span class="gc-popover-icon"><i class="ph-thin ph-calendar-blank"></i></span><span style="font-size:11px;color:var(--text-muted)">${src.label || ev.source}</span></div>
    </div>
    ${ev.editable ? `<div class="gc-popover-footer"><button onclick="gcEditEvent('${ev.id}')">Edit</button><button class="danger" onclick="gcDeleteEvent('${ev.rawId || ev.id}')">Delete</button></div>` : ''}
  `;
  const rect = mouseEvent.target.getBoundingClientRect ? mouseEvent.target.getBoundingClientRect() : { left: mouseEvent.clientX, top: mouseEvent.clientY, width: 0 };
  pop.style.left = Math.min(rect.left + rect.width + 8, window.innerWidth - 340) + 'px';
  pop.style.top = Math.min(rect.top, window.innerHeight - 400) + 'px';
  pop.classList.add('show');
  setTimeout(() => {
    const closer = (e) => { if (!pop.contains(e.target)) { gcClosePopover(); document.removeEventListener('mousedown', closer); } };
    document.addEventListener('mousedown', closer);
  }, 10);
}

function gcClosePopover() { const p = document.getElementById('gc-popover'); if (p) p.classList.remove('show'); }

// ── Create/Edit modal ──
function gcOpenModal(defaults = {}) {
  gcClosePopover();
  const overlay = document.getElementById('gc-modal-overlay');
  const modal = document.getElementById('gc-modal');
  if (!overlay || !modal) return;

  const isEdit = !!defaults.id;
  const now = new Date();
  const defDate = defaults.date || gcDateKey(now);
  const defStartH = defaults.startHour != null ? defaults.startHour : now.getHours();
  const defEndH = defaults.endHour != null ? defaults.endHour : Math.min(defStartH + 1, 23);
  const defStartM = defaults.startMin != null ? defaults.startMin : 0;
  const defEndM = defaults.endMin != null ? defaults.endMin : 0;

  modal.innerHTML = `
    <div class="gc-modal-header"><h3>${isEdit ? 'Edit Event' : 'New Event'}</h3><button class="gc-modal-close" onclick="gcCloseModal()">\u{2715}</button></div>
    <div class="gc-modal-body">
      <div class="gc-form-group">
        <label class="gc-form-label">Title</label>
        <input class="gc-form-input" id="gc-f-title" placeholder="Add title" value="${escHtml(defaults.title||'')}">
      </div>
      <div class="gc-form-row">
        <div class="gc-form-group">
          <label class="gc-form-label">Date</label>
          <input class="gc-form-input" id="gc-f-date" type="date" value="${defaults.date || defDate}">
        </div>
        <div class="gc-form-group">
          <label class="gc-form-label">All Day</label>
          <input type="checkbox" id="gc-f-allday" ${defaults.allDay ? 'checked' : ''} onchange="document.getElementById('gc-f-times').style.display=this.checked?'none':'flex'" style="width:18px;height:18px;margin-top:4px;cursor:pointer">
        </div>
      </div>
      <div class="gc-form-row" id="gc-f-times" style="${defaults.allDay?'display:none':'display:flex'}">
        <div class="gc-form-group">
          <label class="gc-form-label">Start</label>
          <input class="gc-form-input" id="gc-f-start" type="time" value="${String(defStartH).padStart(2,'0')}:${String(defStartM).padStart(2,'0')}">
        </div>
        <div class="gc-form-group">
          <label class="gc-form-label">End</label>
          <input class="gc-form-input" id="gc-f-end" type="time" value="${String(defEndH).padStart(2,'0')}:${String(defEndM).padStart(2,'0')}">
        </div>
      </div>
      <div class="gc-form-group">
        <label class="gc-form-label">Description</label>
        <textarea class="gc-form-input" id="gc-f-desc" rows="3" placeholder="Add description">${escHtml(defaults.description||'')}</textarea>
      </div>
      <div class="gc-form-group">
        <label class="gc-form-label">Location</label>
        <input class="gc-form-input" id="gc-f-location" placeholder="Add location" value="${escHtml(defaults.location||'')}">
      </div>
      <div class="gc-form-group">
        <label class="gc-form-label">Color</label>
        <div class="gc-color-picker">${GC_EVENT_COLORS.map(c => `<div class="gc-color-swatch${(defaults.color||GC_EVENT_COLORS[0])===c?' active':''}" style="background:${c}" data-color="${c}" onclick="document.querySelectorAll('.gc-color-swatch').forEach(s=>s.classList.remove('active'));this.classList.add('active')"></div>`).join('')}</div>
      </div>
    </div>
    <div class="gc-modal-footer">
      <button onclick="gcCloseModal()">Cancel</button>
      <button class="gc-btn-save" onclick="gcSaveEvent(${isEdit ? `'${defaults.rawId}'` : 'null'}, ${defaults.googleEventId ? `'${defaults.googleEventId}'` : 'null'})">${isEdit ? 'Save' : 'Create'}</button>
    </div>
  `;
  overlay.classList.add('show');
  setTimeout(() => document.getElementById('gc-f-title')?.focus(), 100);
}

function gcCloseModal() { const o = document.getElementById('gc-modal-overlay'); if (o) o.classList.remove('show'); }

// ── CRUD operations ──
async function gcSaveEvent(existingId, googleEventId) {
  const title = document.getElementById('gc-f-title')?.value?.trim();
  if (!title) { alert('Please enter a title'); return; }
  const date = document.getElementById('gc-f-date')?.value;
  const allDay = document.getElementById('gc-f-allday')?.checked;
  const startTime = document.getElementById('gc-f-start')?.value || '09:00';
  const endTime = document.getElementById('gc-f-end')?.value || '10:00';
  const description = document.getElementById('gc-f-desc')?.value || '';
  const location = document.getElementById('gc-f-location')?.value || '';
  const color = document.querySelector('.gc-color-swatch.active')?.dataset.color || GC_EVENT_COLORS[0];

  const startDt = allDay ? `${date}T00:00:00` : `${date}T${startTime}:00`;
  const endDt = allDay ? `${date}T23:59:59` : `${date}T${endTime}:00`;
  const sbBody = { title, description: description || null, start_time: startDt, end_time: endDt, all_day: allDay, color, location: location || null, updated_at: new Date().toISOString() };

  try {
    // 1. Push to Google Calendar (best-effort — don't block Supabase save on failure)
    let newGoogleEventId = googleEventId || null;
    try {
      const gcBody = { title, description, location, start: startDt, end: endDt, allDay };
      if (googleEventId) {
        // Update existing Google Calendar event
        gcBody.googleEventId = googleEventId;
        await fetch('/api/calendar/events', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gcBody) });
      } else {
        // Create new Google Calendar event
        const gcRes = await fetch('/api/calendar/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gcBody) });
        const gcData = await gcRes.json();
        if (gcData.googleEventId) newGoogleEventId = gcData.googleEventId;
      }
    } catch (gcErr) { console.warn('Google Calendar sync failed (event saved locally):', gcErr); }

    // 2. Save to Supabase calendar_events
    if (newGoogleEventId) sbBody.google_event_id = newGoogleEventId;
    if (existingId) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/calendar_events?id=eq.${existingId}`, {
        method: 'PATCH', headers: { 'apikey': SUPABASE_SVC, 'Authorization': 'Bearer '+SUPABASE_SVC, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify(sbBody)
      });
      if (!res.ok) throw new Error('Save failed: ' + res.status);
    } else {
      sbBody.created_by = 'utkarsh';
      const res = await fetch(`${SUPABASE_URL}/rest/v1/calendar_events`, {
        method: 'POST', headers: { 'apikey': SUPABASE_SVC, 'Authorization': 'Bearer '+SUPABASE_SVC, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify(sbBody)
      });
      if (!res.ok) throw new Error('Save failed: ' + res.status);
    }
    gcCloseModal();
    renderCalendarPage();
  } catch (e) { showToast('Save failed: ' + e.message); }
}

async function gcDeleteEvent(rawId) {
  if (!rawId || !confirm('Delete this event?')) return;
  try {
    // Find the event to check for Google Calendar link
    const ev = CAL.events.find(e => e.rawId === rawId);
    // Delete from Google Calendar first (best-effort)
    if (ev && ev.googleEventId) {
      try { await fetch('/api/calendar/events', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ googleEventId: ev.googleEventId }) }); }
      catch (gcErr) { console.warn('Google Calendar delete failed:', gcErr); }
    }
    // Delete from Supabase
    const res = await fetch(`${SUPABASE_URL}/rest/v1/calendar_events?id=eq.${rawId}`, {
      method: 'DELETE', headers: { 'apikey': SUPABASE_SVC, 'Authorization': 'Bearer '+SUPABASE_SVC }
    });
    if (!res.ok) throw new Error('Delete failed: ' + res.status);
    gcClosePopover();
    renderCalendarPage();
  } catch (e) { showToast('Delete failed: ' + e.message); }
}

function gcEditEvent(evId) {
  const ev = CAL.events.find(e => e.id === evId); if (!ev) return;
  gcOpenModal({
    id: ev.id, rawId: ev.rawId, title: ev.title, date: gcDateKey(ev.start),
    startHour: ev.start.getHours(), startMin: ev.start.getMinutes(),
    endHour: ev.end.getHours(), endMin: ev.end.getMinutes(),
    allDay: ev.allDay, description: ev.description, location: ev.location, color: ev.color,
    googleEventId: ev.googleEventId || null,
  });
}

// ── Navigation ──
function gcGoToday() { CAL.anchor = new Date(); CAL.miniMonth = new Date(); gcRenderAll(); }
function gcNav(dir) {
  if (CAL.view === 'day') CAL.anchor = gcAddDays(CAL.anchor, dir);
  else if (CAL.view === 'week') CAL.anchor = gcAddDays(CAL.anchor, dir * 7);
  else if (CAL.view === '4day') CAL.anchor = gcAddDays(CAL.anchor, dir * 4);
  else { CAL.anchor = new Date(CAL.anchor.getFullYear(), CAL.anchor.getMonth() + dir, 1); }
  CAL.miniMonth = new Date(CAL.anchor);
  gcRenderAll();
}
function gcSetView(v) { CAL.view = v; gcRenderAll(); }
function gcMiniClick(y, m, d) { CAL.anchor = new Date(y, m, d); CAL.view = 'day'; gcRenderAll(); }
function gcMiniNav(dir) { CAL.miniMonth = new Date(CAL.miniMonth.getFullYear(), CAL.miniMonth.getMonth() + dir, 1); gcRenderMiniCal(); }
function gcToggleSource(key) { CAL.sources[key] = !CAL.sources[key]; gcRenderAll(); }
function gcMonthCellClick(y, m, d) { CAL.anchor = new Date(y, m, d); CAL.view = 'day'; gcRenderAll(); }
function gcCellClick(dateKey, hour) { gcOpenModal({ date: dateKey, startHour: hour, endHour: hour + 1 }); }

// ── Drag-to-create ──


// ── Event drag-to-move ──────────────────────────────────
function gcEventDragStart(e, ev) {
  if (e.button !== 0 || !ev.editable) return;
  e.stopPropagation();
  e.preventDefault();
  const chip = e.currentTarget;
  const chipRect = chip.getBoundingClientRect();
  const startMin = ev.start.getHours() * 60 + ev.start.getMinutes();
  const endMin = ev.end.getHours() * 60 + ev.end.getMinutes();
  const durationMin = Math.max(endMin - startMin, 30);
  CAL.eventDrag = {
    pending: true, eventId: ev.id, rawId: ev.rawId, googleEventId: ev.googleEventId || null,
    startMouseX: e.clientX, startMouseY: e.clientY, chipOffsetY: e.clientY - chipRect.top,
    origDateKey: gcDateKey(ev.start), origStartMin: startMin, durationMin: durationMin,
    origChip: chip, ghostEl: null, currentDateKey: null, currentStartMin: null, ev: ev,
  };
  document.addEventListener('mousemove', gcEventDragMove);
  document.addEventListener('mouseup', gcEventDragEnd);
}

function gcEventDragMove(e) {
  var drag = CAL.eventDrag;
  if (!drag) return;
  if (drag.pending) {
    var dx = e.clientX - drag.startMouseX, dy = e.clientY - drag.startMouseY;
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    drag.pending = false;
    drag.origChip.classList.add('gc-dragging-source');
    document.body.classList.add('gc-event-dragging');
    // Create ghost
    var ghost = document.createElement('div');
    ghost.className = 'gc-event-chip';
    ghost.style.cssText = 'height:' + ((drag.durationMin / 60) * 48) + 'px;background:' + drag.ev.bg + ';color:' + drag.ev.color + ';border-left-color:' + drag.ev.color + ';opacity:0.85;pointer-events:none;z-index:10;box-shadow:var(--shadow-lg);transition:none;';
    ghost.innerHTML = '<div class="gc-ev-title">' + escHtml(drag.ev.title) + '</div>';
    drag.ghostEl = ghost;
  }
  var hit = gcEventDragHitTest(e.clientX, e.clientY);
  if (!hit) return;
  drag.currentDateKey = hit.dateKey;
  drag.currentStartMin = hit.startMin;
  var cell = document.querySelector('.gc-time-cell[data-date="' + hit.dateKey + '"][data-hour="0"]');
  if (cell && drag.ghostEl) {
    if (drag.ghostEl.parentElement !== cell) cell.appendChild(drag.ghostEl);
    drag.ghostEl.style.top = ((hit.startMin / 60) * 48) + 'px';
  }
}

function gcEventDragEnd(e) {
  document.removeEventListener('mousemove', gcEventDragMove);
  document.removeEventListener('mouseup', gcEventDragEnd);
  var drag = CAL.eventDrag;
  if (!drag) return;
  if (drag.ghostEl) drag.ghostEl.remove();
  if (drag.origChip) drag.origChip.classList.remove('gc-dragging-source');
  document.body.classList.remove('gc-event-dragging');
  if (drag.pending) { CAL.eventDrag = null; return; }
  if (!drag.currentDateKey || drag.currentStartMin == null || (drag.currentDateKey === drag.origDateKey && drag.currentStartMin === drag.origStartMin)) {
    CAL.eventDrag = null; return;
  }
  gcMoveEvent(drag.rawId, drag.googleEventId, drag.currentDateKey, drag.currentStartMin, drag.durationMin, drag.ev);
  CAL.eventDrag = null;
}

function gcEventDragHitTest(clientX, clientY) {
  var wrap = document.getElementById('gc-grid-wrap');
  if (!wrap) return null;
  var cells = wrap.querySelectorAll('.gc-time-cell[data-hour="0"]');
  var targetCell = null;
  for (var i = 0; i < cells.length; i++) {
    var rect = cells[i].getBoundingClientRect();
    if (clientX >= rect.left && clientX < rect.right) { targetCell = cells[i]; break; }
  }
  if (!targetCell) return null;
  var dateKey = targetCell.dataset.date;
  var cellRect = targetCell.getBoundingClientRect();
  var relativeY = clientY - cellRect.top + targetCell.scrollTop;
  // The cell starts at hour 0 and is 24*48=1152px tall. But gc-time-cell[data-hour="0"] only covers hour 0.
  // We need the body-level Y to compute total minutes. Use the grid wrap scroll.
  var bodyEl = wrap.querySelector('.gc-time-body') || wrap;
  var bodyRect = bodyEl.getBoundingClientRect();
  var totalY = clientY - bodyRect.top;
  var rawMinutes = (totalY / 48) * 60;
  var snappedMin = Math.round(rawMinutes / 15) * 15;
  var clampedMin = Math.max(0, Math.min(snappedMin, 24 * 60 - 15));
  return { dateKey: dateKey, startMin: clampedMin };
}

async function gcMoveEvent(rawId, googleEventId, newDateKey, newStartMin, durationMin, ev) {
  var startH = Math.floor(newStartMin / 60), startM = newStartMin % 60;
  var endTotal = Math.min(newStartMin + durationMin, 24 * 60);
  var endH = Math.floor(endTotal / 60), endM = endTotal % 60;
  var startDt = newDateKey + 'T' + String(startH).padStart(2,'0') + ':' + String(startM).padStart(2,'0') + ':00';
  var endDt = newDateKey + 'T' + String(endH).padStart(2,'0') + ':' + String(endM).padStart(2,'0') + ':00';
  try {
    ev.start = new Date(startDt); ev.end = new Date(endDt);
    gcRenderAll();
    if (googleEventId) {
      try {
        await fetch('/api/calendar/events', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ googleEventId: googleEventId, title: ev.title, description: ev.description || '', location: ev.location || '', start: startDt, end: endDt, allDay: false })
        });
      } catch (gcErr) { console.warn('Google Calendar move sync failed:', gcErr); }
    }
    if (rawId) {
      var mvRes = await fetch(SUPABASE_URL + '/rest/v1/calendar_events?id=eq.' + rawId, {
        method: 'PATCH', headers: { 'apikey': SUPABASE_SVC, 'Authorization': 'Bearer ' + SUPABASE_SVC, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ start_time: startDt, end_time: endDt, updated_at: new Date().toISOString() })
      });
      if (!mvRes.ok) console.warn('[Calendar] move event save failed:', mvRes.status);
    }
  } catch (err) { console.error('Move event failed:', err); renderCalendarPage(); }
}

// ── Event resize ──────────────────────────────────────
function gcResizeStart(e, ev) {
  if (e.button !== 0 || !ev.editable) return;
  e.preventDefault();
  var chip = e.target.closest('.gc-event-chip');
  if (!chip) return;
  var startMin = ev.start.getHours() * 60 + ev.start.getMinutes();
  var endMin = ev.end.getHours() * 60 + ev.end.getMinutes();
  var origHeight = parseFloat(chip.style.height);
  var startY = e.clientY;
  document.body.classList.add('gc-event-dragging');
  var onMove = function(me) {
    var dy = me.clientY - startY;
    var newHeight = Math.max(12, origHeight + dy); // min 12px (15min)
    var snappedHeight = Math.round(newHeight / 12) * 12; // snap to 15min increments
    chip.style.height = Math.max(12, snappedHeight) + 'px';
  };
  var onUp = function() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.classList.remove('gc-event-dragging');
    var finalHeight = parseFloat(chip.style.height);
    var newDurationMin = Math.round((finalHeight / 48) * 60 / 15) * 15;
    newDurationMin = Math.max(15, newDurationMin);
    if (newDurationMin === (endMin - startMin)) return;
    var dateKey = gcDateKey(ev.start);
    gcMoveEvent(ev.rawId, ev.googleEventId || null, dateKey, startMin, newDurationMin, ev);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function gcDragStart(e, dateKey, hour) {
  if (e.button !== 0) return;
  e.preventDefault();
  CAL.dragging = { dateKey, startHour: hour, startY: e.clientY, currentHour: hour + 1 };
  const ghost = document.getElementById('gc-drag-ghost');
  // Position ghost within the clicked column only
  if (ghost) {
    const cell = e.currentTarget;
    const wrap = document.getElementById('gc-grid-wrap');
    if (cell && wrap) {
      const cellRect = cell.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      ghost.style.left = (cellRect.left - wrapRect.left + wrap.scrollLeft + 2) + 'px';
      ghost.style.width = (cellRect.width - 4) + 'px';
    }
    ghost.style.display = 'block'; ghost.style.top = (hour * 48) + 'px'; ghost.style.height = '48px';
  }

  const onMove = (me) => {
    if (!CAL.dragging) return;
    const dy = me.clientY - CAL.dragging.startY;
    const halfHours = Math.round(dy / 24);
    const endHour = Math.max(CAL.dragging.startHour + 0.5, CAL.dragging.startHour + halfHours * 0.5);
    CAL.dragging.currentHour = endHour;
    if (ghost) {
      const top = Math.min(CAL.dragging.startHour, endHour) * 48;
      const height = Math.abs(endHour - CAL.dragging.startHour) * 48;
      ghost.style.top = top + 'px';
      ghost.style.height = Math.max(height, 24) + 'px';
    }
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    if (ghost) ghost.style.display = 'none';
    if (CAL.dragging) {
      const startH = Math.min(CAL.dragging.startHour, CAL.dragging.currentHour);
      const endH = Math.max(CAL.dragging.startHour + 0.5, CAL.dragging.currentHour);
      const startMin = Math.round((startH % 1) * 60);
      const endMin = Math.round((endH % 1) * 60);
      gcOpenModal({ date: CAL.dragging.dateKey, startHour: Math.floor(startH), startMin, endHour: Math.floor(endH), endMin });
    }
    CAL.dragging = null;
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ── Render all (no data refetch) ──
function gcRenderAll() {
  gcRenderHeader();
  gcRenderMiniCal();
  gcRenderSources();
  if (CAL.view === 'month') gcRenderMonthView();
  else gcRenderTimeGrid();
}

// ── Master render (with data fetch) ──
async function renderCalendarPage() {
  const main = document.getElementById('gc-main');
  if (main) main.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted)">Loading calendar\u{2026}</div>';
  gcRenderHeader();
  gcRenderMiniCal();
  gcRenderSources();
  await gcFetchAllEvents();
  if (CAL.view === 'month') gcRenderMonthView();
  else gcRenderTimeGrid();
}

// ── Keep-style colour palette per type ──
const NOTE_TYPE_BG = {
  note:     'note-yellow',
  idea:     'note-purple',
  reminder: 'note-red',
  fact:     'note-blue',
  decision: 'note-green',
};

