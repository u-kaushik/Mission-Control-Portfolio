// Mission Control — Centralized shared state
// All cross-file mutable state lives here. Config constants stay in config.js.
// File-private state stays in individual files.
const MC = {
  // ═══ Live Data (from Supabase) ═══
  allTasks: [],
  allMessages: [],
  allIssues: [],
  allRocks: [],
  allProjects: null,
  allNotifs: [],
  prospectLists: [],   // prospect_lists from Supabase
  projectAccentMap: {},
  dbAgents: {},          // was dbAgentsMap — { uuid: { name, emoji, ... } }
  rockAccent: {},        // was ROCK_ACCENT — { rockId: accentColor }
  vtoData: {},           // was _vtoData
  scorecardRows: [],     // was _scorecardAllRows

  // ═══ Cross-Page Data Channels (replaces window._* hacks) ═══
  ppData: null,          // projects/goals/tasks bundle — was window._ppData
  rocksMap: {},          // rockId → rock object — was window._rocksMap
  planGoals: null,       // raw annual goals from DB — was window._planGoals
  displayGoals: null,    // merged annual goals for display — was window._displayGoals
  agentModalData: null,  // cached data for open agent modal — was window._agentModalData
  pendingTaskId: null,   // deferred task open after page nav — was window._pendingTaskId
  pendingIssueId: null,  // deferred issue highlight — was window._pendingIssueId

  // ═══ UI / Routing State ═══
  currentPage: 'dashboard',
  feedFilter: 'all',
  agentFeedFilter: 'all',
  todoSelectMode: false,
  selectedTodos: new Set(),
  agentModalOpen: false,
  currentAgentId: null,
  currentAgentTab: 'tasks',
  notifOpen: false,
  rocksFilter: '1',
  modalZTop: 700,

  // ═══ Polling ═══
  pollTimer: null,
  pollCount: 0,

  // ═══ Ticker ═══
  ticker: {
    interval: null,
    slides: [],
    current: 0,
    filterSection: null,
    setSection: null,
    jumpToSection: null,
  },
};
