// Mission Control — Config & Agent definitions
// =============================================
// CONFIG & AGENT DEFINITIONS
// =============================================
const SUPABASE_URL = '';  // e.g. 'https://your-project.supabase.co'
const SUPABASE_KEY = '';  // Your Supabase anon/public key
// Service key — bypasses RLS for tables that require it (rocks, milestones, annual_goals)
const SUPABASE_SVC = '';  // Your Supabase service_role key

// Cache-bust avatars on every page load — change when an avatar file is updated
const AVATAR_BUST = Date.now();

// Human in the loop — always first in panel
const HUMAN = {
  id: 'utkarsh', name: 'Utkarsh', role: 'Visionary', tier: 'HUMAN',
  emoji: '<i class="ph-thin ph-user"></i>', avatar: '/assets/avatars/Utkarsh.webp',
  bio: 'Visionary. Sets direction, picks the niche, makes the calls.'
};

const AGENTS = [
  { id: 'jarvis', name: 'Jarvis', role: 'Integrator',                tier: 'LEAD', emoji: '<i class="ph-thin ph-brain"></i>', avatar: '/assets/avatars/Jarvis.webp',  bio: 'Integrator. Orchestration, client delivery oversight, P&L. Keeps the agency machine running.' },
  { id: 'echo',   name: 'Echo',   role: 'Outreach Copy & Content',   tier: 'SPC',  emoji: '<i class="ph-thin ph-pencil-simple"></i>', avatar: '/assets/avatars/Echo.webp',    bio: 'Cold email sequences, case studies, website copy, pitch decks. Words that book meetings and close deals.' },
  { id: 'luna',   name: 'Luna',   role: 'Brand & Design',            tier: 'SPC',  emoji: '<i class="ph-thin ph-palette"></i>', avatar: '/assets/avatars/Luna.webp',    bio: 'Agency branding, case study visuals, pitch deck design, client deliverable polish.' },
  { id: 'sola',   name: 'Sola',   role: 'Market Research & ICP',     tier: 'SPC',  emoji: '<i class="ph-thin ph-chart-bar"></i>', avatar: '/assets/avatars/Sola.webp',    bio: 'Ideal customer profiling, competitor analysis, market sizing, prospect list building.' },
  { id: 'dash',   name: 'Dash',   role: 'Analytics & Reporting',     tier: 'SPC',  emoji: '<i class="ph-thin ph-rocket"></i>', avatar: '/assets/avatars/Dash.webp',    bio: 'Client dashboards, campaign performance, KPI tracking. Keeps the weekly numbers honest.' },
  { id: 'iris',   name: 'Iris',   role: 'Client Success & QA',       tier: 'LEAD', emoji: '<i class="ph-thin ph-magnifying-glass"></i>', avatar: '/assets/avatars/Iris.webp',    bio: 'Client onboarding, delivery QA, satisfaction tracking, retention. Owns the client experience.' },
  { id: 'kai',    name: 'Kai',    role: 'AI Agent Engineer',          tier: 'SPC',  emoji: '<i class="ph-thin ph-gear-six"></i>', avatar: '/assets/avatars/Kai.webp',    bio: 'Builds AI agent systems for clients. Integrations, automations, deployment, monitoring.' },
  { id: 'quinn',  name: 'Quinn',  role: 'Project & Delivery Mgr',    tier: 'LEAD', emoji: '<i class="ph-thin ph-list-bullets"></i>', avatar: '/assets/avatars/Quinn.webp',  bio: 'Client engagement timelines, delivery milestones, handoffs, resource allocation.' },
  { id: 'archie', name: 'Archie', role: 'Systems Architect',         tier: 'SPC',  emoji: '<i class="ph-thin ph-flask"></i>', avatar: '/assets/avatars/Archie.webp', bio: 'Agent architecture design, integration patterns, client system blueprints, technical scoping.' },
  { id: 'penny',  name: 'Penny',  role: 'Sales & Pipeline',          tier: 'SPC',  emoji: '<i class="ph-thin ph-currency-dollar"></i>', avatar: '/assets/avatars/Penny.webp',  bio: 'Cold outreach, deal closing, pipeline management, revenue tracking. Owns the sales engine.' },
];

const AGENT_COLORS = {
  jarvis: '#7468B5', echo: '#5ea8b8', luna: '#b07095', sola: '#5ba88a',
  dash:   '#c26b6b', iris: '#c49052', kai:  '#6b8cce', quinn: '#9080C0',
  archie: '#5ba88a', penny: '#5ea8b8', utkarsh: '#7468B5', unknown: '#6b6e8a'
};

// Maps Telegram handles / raw sender values → display names
// Add your Telegram username here so the feed shows "Utkarsh" not "@ukaus7"
const SENDER_DISPLAY = {
  // Telegram handles → display name (all lowercase keys)
  'ukaus7': 'Utkarsh', 'ukaus': 'Utkarsh', '@ukaus7': 'Utkarsh', '@ukaus': 'Utkarsh',
  'utkarshfk': 'Utkarsh', '@utkarshfk': 'Utkarsh',
  '7928172945': 'Utkarsh',  // Telegram numeric chat ID
  '-1002243176440': 'Kaush Squad',  // Telegram group chat ID
  // Agent aliases (in case DB uses different casing)
  'jarvis': 'Jarvis', 'echo': 'Echo', 'luna': 'Luna', 'sola': 'Sola',
  'dash': 'Dash', 'iris': 'Iris', 'kai': 'Kai', 'quinn': 'Quinn', 'archie': 'Archie',
  'penny': 'Penny', 'utkarsh': 'Utkarsh',
};

// Resolve a raw sender string to a clean display name
function resolveSenderName(raw) {
  if (!raw) return 'Unknown';
  const key = raw.toLowerCase().replace(/^@/, '');
  // Check display map first (covers Telegram handles)
  if (SENDER_DISPLAY[key]) return SENDER_DISPLAY[key];
  // Check display map with @ prefix
  if (SENDER_DISPLAY['@' + key]) return SENDER_DISPLAY['@' + key];
  // Fallback: capitalize as-is
  return capitalize(raw);
}

// Given a display name, find which agent id it maps to (for avatar/color lookups)
function resolveAgentIdFromDisplay(displayName) {
  const n = (displayName||'').toLowerCase();
  if (n === 'utkarsh') return 'utkarsh';
  const a = AGENTS.find(a => a.name.toLowerCase() === n || a.id === n);
  return a ? a.id : n;
}

function agentColor(name) { return AGENT_COLORS[(name||'').toLowerCase()] || 'var(--gray)'; }
function agentEmoji(name) {
  const n = (name||'').toLowerCase();
  if (n === 'utkarsh') return HUMAN.emoji;
  const a = AGENTS.find(a => a.id === n);
  return a ? a.emoji : '<i class="ph-thin ph-robot"></i>';
}
function agentAvatar(name) {
  const n = (name||'').toLowerCase();
  if (n === 'utkarsh') return HUMAN.avatar;
  const a = AGENTS.find(a => a.id === n);
  return a ? a.avatar : null;
}
// Avatar fallback: hide broken img, show sibling emoji span
function _avErr(el) { el.style.display='none'; var s=el.nextElementSibling; if(s)s.style.display='flex'; }
// Returns either an <img> or the emoji span for an avatar container
function avatarInner(name, size = 'md') {
  const av = agentAvatar(name);
  if (av) {
    const emoji = agentEmoji(name);
    // onerror: hide img, show sibling emoji span
    return `<img src="${av}?v=${AVATAR_BUST}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;position:absolute;inset:0" onerror="this.style.display='none';var s=this.nextElementSibling;if(s)s.style.display='flex'">` +
           `<span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:inherit;position:absolute;inset:0">${emoji}</span>`;
  }
  return `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;font-size:inherit">${agentEmoji(name)}</span>`;
}



// ── Agent lookup helper ──
// Returns { emoji, name } for a given agent id/name string
function agentInfo(id) {
  if (!id) return null;
  const key = (id || '').toLowerCase();
  // Check human first (Utkarsh)
  if (key === 'utkarsh' || key === 'ukaus7' || key === 'ukaus' || key === 'utkarshfk') return HUMAN;
  return AGENTS.find(a => a.id.toLowerCase() === key || a.name.toLowerCase() === key) || null;
}
