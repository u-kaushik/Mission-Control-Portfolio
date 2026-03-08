// Mission Control — Settings store & panel
// =============================================
// SETTINGS STORE (persisted to localStorage)
// =============================================
const DEFAULTS = {
  darkMode: false,
  fontSize: 14,
  density: 1,
  quickInterval: 8000,
  autoScroll: false,
  showDone: true,
  weatherLocation: 'harlow',
  pipelineView: 'table',
  contentView: 'table',
};

let S = { ...DEFAULTS };

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('mc_settings') || '{}');
    S = { ...DEFAULTS, ...saved };
  } catch { S = { ...DEFAULTS }; }
}

function saveSettings() {
  localStorage.setItem('mc_settings', JSON.stringify(S));
}

function applySettings() {
  const root = document.documentElement;
  // Theme
  root.setAttribute('data-theme', S.darkMode ? 'dark' : 'light');
  // Font size - cascade all font-size vars from base
  const base = S.fontSize;
  root.style.setProperty('--font-size-base', base + 'px');
  root.style.setProperty('--font-size-sm',   (base - 1) + 'px');
  root.style.setProperty('--font-size-xs',   (base - 2) + 'px');
  root.style.setProperty('--font-size-xxs',  (base - 3) + 'px');
  // Density
  root.style.setProperty('--density-pad', S.density);
  // Sync controls
  document.getElementById('toggle-dark').checked = S.darkMode;
  document.getElementById('slider-font').value = S.fontSize;
  document.getElementById('slider-font-val').textContent = S.fontSize + 'px';
  document.querySelectorAll('#density-group .radio-btn').forEach(b => {
    b.classList.toggle('active', parseFloat(b.dataset.density) === S.density);
  });
  document.querySelectorAll('#quick-interval-group .radio-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.interval) === S.quickInterval);
  });
  document.getElementById('toggle-autoscroll').checked = S.autoScroll;
  document.getElementById('toggle-show-done').checked = S.showDone;
  document.querySelectorAll('#weather-location-group .radio-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.location === S.weatherLocation);
  });
  // Page view defaults
  document.querySelectorAll('#pipeline-view-group .radio-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === S.pipelineView);
  });
  document.querySelectorAll('#content-view-group .radio-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === S.contentView);
  });
  // Update settings btn active state
  document.getElementById('settings-btn').classList.toggle('active',
    document.getElementById('settings-overlay').classList.contains('open'));
}

// =============================================
// SETTINGS PANEL OPEN/CLOSE
// =============================================
function openSettings() {
  document.getElementById('settings-overlay').classList.add('open');
  document.getElementById('settings-btn').classList.add('active');
  applySettings();
}
function closeSettings() {
  document.getElementById('settings-overlay').classList.remove('open');
  document.getElementById('settings-btn').classList.remove('active');
}

document.getElementById('settings-btn').addEventListener('click', () => {
  if (document.getElementById('settings-overlay').classList.contains('open')) closeSettings();
  else openSettings();
});
document.getElementById('settings-close').addEventListener('click', closeSettings);
document.getElementById('settings-backdrop').addEventListener('click', closeSettings);

// Dark mode toggle
document.getElementById('toggle-dark').addEventListener('change', e => {
  S.darkMode = e.target.checked;
  saveSettings(); applySettings();
});

// Font size slider
document.getElementById('slider-font').addEventListener('input', e => {
  S.fontSize = parseInt(e.target.value);
  document.getElementById('slider-font-val').textContent = S.fontSize + 'px';
  saveSettings(); applySettings();
});

// Density buttons
document.getElementById('density-group').addEventListener('click', e => {
  const btn = e.target.closest('.radio-btn');
  if (!btn) return;
  S.density = parseFloat(btn.dataset.density);
  saveSettings(); applySettings();
});

// Quick interval buttons
document.getElementById('quick-interval-group').addEventListener('click', e => {
  const btn = e.target.closest('.radio-btn');
  if (!btn) return;
  S.quickInterval = parseInt(btn.dataset.interval);
  saveSettings(); applySettings();
  restartPolling();
});

// Auto-scroll toggle
document.getElementById('toggle-autoscroll').addEventListener('change', e => {
  S.autoScroll = e.target.checked;
  saveSettings();
});

// Show done toggle
document.getElementById('toggle-show-done').addEventListener('change', e => {
  S.showDone = e.target.checked;
  saveSettings();
  renderKanban(MC.allTasks);
});

// Weather location buttons
document.getElementById('weather-location-group').addEventListener('click', e => {
  const btn = e.target.closest('.radio-btn');
  if (!btn) return;
  S.weatherLocation = btn.dataset.location;
  saveSettings(); applySettings();
  fetchWeather();
});

// Pipeline default view
document.getElementById('pipeline-view-group').addEventListener('click', e => {
  const btn = e.target.closest('.radio-btn');
  if (!btn) return;
  S.pipelineView = btn.dataset.view;
  saveSettings(); applySettings();
});

// Content default view
document.getElementById('content-view-group').addEventListener('click', e => {
  const btn = e.target.closest('.radio-btn');
  if (!btn) return;
  S.contentView = btn.dataset.view;
  saveSettings(); applySettings();
});

// Reset button
document.getElementById('btn-reset-settings').addEventListener('click', () => {
  S = { ...DEFAULTS };
  saveSettings(); applySettings();
  restartPolling();
});

