// Mission Control — Header chip dropdowns
// =============================================
// DROPDOWN TOGGLE LOGIC
// =============================================
(function () {
  function closeAllDropdowns() {
    document.querySelectorAll('.hdr-dropdown.open').forEach(d => d.classList.remove('open'));
  }

  // Click chip → toggle its dropdown
  document.querySelectorAll('.hdr-chip-btn').forEach(chip => {
    chip.addEventListener('click', e => {
      e.stopPropagation();
      const ddId = chip.dataset.dropdown;
      const dd = document.getElementById(ddId);
      if (!dd) return;
      const wasOpen = dd.classList.contains('open');
      closeAllDropdowns();
      if (!wasOpen) {
        populateDropdown(ddId);
        dd.classList.add('open');
      }
    });
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('.hdr-dropdown')) closeAllDropdowns();
  });

  // Stop clicks inside dropdown from closing it
  document.querySelectorAll('.hdr-dropdown').forEach(dd => {
    dd.addEventListener('click', e => e.stopPropagation());
  });

  // =============================================
  // POPULATE DROPDOWNS
  // =============================================
  function populateDropdown(id) {
    if (id === 'dd-agents') populateAgents();
    else if (id === 'dd-tasks') populateTasks();
    else if (id === 'dd-weather') populateWeather();
  }

  // — Agents dropdown —
  function populateAgents() {
    const dd = document.getElementById('dd-agents');
    const withStatus = [HUMAN, ...AGENTS].map(a => {
      const { si, status, hb } = getAgentLiveStatus(a.id);
      return { a, si, status, hbTime: hb ? hb.getTime() : Infinity };
    });
    // Online first (oldest-online-first), Utkarsh always pinned top
    withStatus.sort((x, y) => {
      if (x.a.id === 'utkarsh') return -1;
      if (y.a.id === 'utkarsh') return 1;
      const xOn = x.status !== 'offline' ? 0 : 1;
      const yOn = y.status !== 'offline' ? 0 : 1;
      if (xOn !== yOn) return xOn - yOn;
      if (xOn === 0) return x.hbTime - y.hbTime;
      return 0;
    });
    const rows = withStatus.map(({ a, si }) => `<div class="hdr-dd-row">
        <span class="hdr-dd-dot" style="background:${si.dot}${si.pulse ? ';box-shadow:0 0 4px ' + si.dot : ''}"></span>
        <span class="hdr-dd-row-label">${a.name}</span>
        <span class="hdr-dd-row-value" style="color:${si.textColor};font-size:10px;font-weight:600">${si.label}</span>
      </div>`).join('');
    dd.innerHTML = `<div class="hdr-dd-title">Squad Status</div>${rows}`;
  }

  // — Tasks dropdown —
  // Persisted pill selection — defaults to 'in_progress'
  let _taskPillKey = (typeof S !== 'undefined' && S.taskPillKey) ? S.taskPillKey : 'in_progress';

  const TASK_COLS = [
    { key: 'in_progress', label: 'In Progress', dot: 'var(--blue)' },
    { key: 'review',      label: 'Review',      dot: 'var(--amber)' },
    { key: 'todo',        label: 'This Week',   dot: 'var(--gray)' },
    { key: 'blocked',     label: 'Blocked',     dot: 'var(--red)' },
    { key: 'done',        label: 'Done',        dot: 'var(--green)' },
    { key: 'backlog',     label: 'Backlog',     dot: 'var(--purple)' },
  ];

  function getTaskCounts() {
    const tasks = MC.allTasks || [];
    const counts = { in_progress: 0, review: 0, todo: 0, blocked: 0, done: 0, backlog: 0 };
    tasks.forEach(t => {
      const s = typeof effectiveStatus === 'function' ? effectiveStatus(t) : (t.status || 'todo');
      if (counts[s] !== undefined) counts[s]++;
      else counts.todo++;
    });
    return counts;
  }

  // Update the header pill to show the selected status count + label
  function updateTaskPill() {
    const counts = getTaskCounts();
    const col = TASK_COLS.find(c => c.key === _taskPillKey) || TASK_COLS[0];
    document.getElementById('hdr-tasks').textContent = counts[col.key];
    document.getElementById('hdr-tasks-label').textContent = col.label.toLowerCase();
  }
  // Expose for polling to refresh after data loads
  window.updateTaskPill = updateTaskPill;

  function populateTasks() {
    const dd = document.getElementById('dd-tasks');
    const counts = getTaskCounts();

    const rows = TASK_COLS.map(c => {
      const active = c.key === _taskPillKey ? ' hdr-dd-row-active' : '';
      return `<div class="hdr-dd-row hdr-dd-row-selectable${active}" data-task-key="${c.key}">
      <span class="hdr-dd-dot" style="background:${c.dot}"></span>
      <span class="hdr-dd-row-label">${c.label}</span>
      <span class="hdr-dd-row-value">${counts[c.key]}</span>
    </div>`;
    }).join('');

    dd.innerHTML = `<div class="hdr-dd-title">Tasks Breakdown</div>${rows}`;

    // Click row → select that value for the pill
    dd.querySelectorAll('.hdr-dd-row-selectable').forEach(row => {
      row.addEventListener('click', () => {
        _taskPillKey = row.dataset.taskKey;
        if (typeof S !== 'undefined') { S.taskPillKey = _taskPillKey; if (typeof saveSettings === 'function') saveSettings(); }
        updateTaskPill();
        populateTasks(); // refresh active highlight
      });
    });
  }

  // — Weather dropdown —
  function populateWeather() {
    const dd = document.getElementById('dd-weather');
    const w = (typeof _lastWeatherData !== 'undefined') ? _lastWeatherData : null;
    const loc = S.weatherLocation || 'harlow';
    const locData = (typeof WEATHER_LOCATIONS !== 'undefined') ? WEATHER_LOCATIONS[loc] : null;
    const label = locData ? locData.label : 'Harlow, UK';
    const tempStr = w ? w.temp + '°C' : '—°C';
    const icon = w ? w.emoji : '<i class="ph-thin ph-thermometer"></i>';

    dd.innerHTML = `
      <div class="hdr-dd-title">Weather</div>
      <div style="padding:6px 12px;display:flex;align-items:center;gap:10px">
        <span style="font-size:22px">${icon}</span>
        <div>
          <div style="font-size:18px;font-weight:700;color:var(--text-primary)">${tempStr}</div>
          <div style="font-size:11px;color:var(--text-muted)">${label}</div>
        </div>
      </div>
      <div class="hdr-dd-sep"></div>
      <div class="hdr-dd-toggle">
        <button class="hdr-dd-toggle-btn${loc === 'harlow' ? ' active' : ''}" data-loc="harlow">Harlow</button>
        <button class="hdr-dd-toggle-btn${loc === 'barcelona' ? ' active' : ''}" data-loc="barcelona">Barcelona</button>
      </div>`;

    // Toggle location
    dd.querySelectorAll('.hdr-dd-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        S.weatherLocation = btn.dataset.loc;
        saveSettings(); applySettings();
        fetchWeather().then(() => populateWeather());
      });
    });
  }
})();
