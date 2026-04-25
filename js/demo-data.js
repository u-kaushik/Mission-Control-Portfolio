// Mission Control — Demo / Showcase Data
// =============================================
// Loaded ONLY on the demo branch. Provides realistic dummy data
// across all pages so the app looks fully active for presentations.
// =============================================

const DEMO_MODE = true;

// ── Helper: date strings relative to "today" ──
const _d = (daysAgo, h = 10, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const _future = (daysAhead) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(23, 59, 0, 0);
  return d.toISOString().slice(0, 10);
};
const _past = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};
const _today = () => new Date().toISOString().slice(0, 10);

// ── DEMO TASKS (agency_todos) ────────────────────────────────────────────
const DEMO_TASKS = [
  // ── DOING (in_progress) ──
  { id: '__dt01__', title: 'Write cold email sequence for AI consultancies', description: 'Create 5-step cold email sequence targeting UK AI consultancies. Include personalized openers, case study hooks, and soft CTA for discovery call.', status: 'in_progress', priority: 9, assigned_to: ['echo'], rock_id: '__r2__', due_date: _future(2), created_at: _d(3), updated_at: _d(0, 14, 30) },
  { id: '__dt02__', title: 'Build prospect scoring model', description: 'Develop a scoring algorithm based on company size, tech stack, funding stage, and engagement signals to rank outreach priority.', status: 'in_progress', priority: 8, assigned_to: ['sola'], rock_id: null, due_date: _future(3), created_at: _d(5), updated_at: _d(0, 11, 0) },
  { id: '__dt03__', title: 'Design agency landing page v2', description: 'Redesign hero section with new value props, add social proof strip, improve mobile CTA placement. Figma first, then handoff.', status: 'in_progress', priority: 7, assigned_to: ['luna'], rock_id: '__r1__', due_date: _future(4), created_at: _d(4), updated_at: _d(0, 9, 45) },
  { id: '__dt04__', title: 'Ship client reporting dashboard MVP', description: 'Embed Chart.js widgets for campaign metrics: outreach sent, reply rate, meetings booked, pipeline value. Auto-refreshing from Supabase.', status: 'in_progress', priority: 9, assigned_to: ['kai'], rock_id: null, due_date: _future(1), created_at: _d(7), updated_at: _d(0, 15, 20) },
  { id: '__dt05__', title: 'Prepare case study: TechNova AI deployment', description: 'Draft 800-word case study showing how we helped TechNova reduce manual ops by 60% using AI agents. Include metrics, timeline, and testimonials.', status: 'in_progress', priority: 8, assigned_to: ['echo'], rock_id: '__r4__', due_date: _future(5), created_at: _d(6), updated_at: _d(1, 16, 0) },

  // ── THIS WEEK (todo) ──
  { id: '__dt06__', title: 'Set up Instantly.ai for NW estate agent campaign', description: 'Configure domains, warm-up schedule, and import verified prospect list for Manchester/Liverpool estate agents.', status: 'todo', priority: 8, assigned_to: ['penny'], rock_id: '__r2__', due_date: _future(3), created_at: _d(2), updated_at: _d(1) },
  { id: '__dt07__', title: 'Create LinkedIn content calendar (March)', description: 'Plan 12 posts: 4 thought leadership, 4 case study snippets, 2 team spotlights, 2 behind-the-scenes. Include copy + visual briefs.', status: 'todo', priority: 6, assigned_to: ['echo', 'luna'], rock_id: null, due_date: _future(5), created_at: _d(3), updated_at: _d(2) },
  { id: '__dt08__', title: 'Client onboarding doc template', description: 'Standardize the onboarding process: welcome email, access setup, kickoff agenda, first-week milestones, Slack channel creation.', status: 'todo', priority: 7, assigned_to: ['iris'], rock_id: '__r3__', due_date: _future(4), created_at: _d(4), updated_at: _d(2) },
  { id: '__dt09__', title: 'Competitor analysis: top 5 UK AI agencies', description: 'Analyze pricing, positioning, service offerings, case studies, and team size of top competitors. Build comparison matrix.', status: 'todo', priority: 5, assigned_to: ['sola'], rock_id: '__r1__', due_date: _future(6), created_at: _d(5), updated_at: _d(3) },
  { id: '__dt10__', title: 'Sprint retrospective + Q1 progress review', description: 'Facilitate team retro: what worked, what didnt, what to improve. Update Q1 rock progress and flag any at-risk items.', status: 'todo', priority: 8, assigned_to: ['quinn'], rock_id: null, due_date: _future(1), created_at: _d(1), updated_at: _d(0, 8, 0) },
  { id: '__dt11__', title: 'Draft SOW for BrightPath Homes retainer', description: 'Scope of work for AI chatbot + lead qualification system. Monthly retainer £2,500. Include deliverables, timeline, success metrics.', status: 'todo', priority: 9, assigned_to: ['penny'], rock_id: '__r3__', due_date: _future(2), created_at: _d(2), updated_at: _d(1) },
  { id: '__dt12__', title: 'Build estate agent lead list — 50 independent agents', description: 'Research and compile list of 50 independent estate agents in Greater Manchester with verified emails and decision-maker names.', status: 'todo', priority: 7, assigned_to: ['sola'], rock_id: '__r2__', due_date: _future(3), created_at: _d(3), updated_at: _d(1) },
  { id: '__dt13__', title: 'Write 3-email cold sequence for estate agents', description: 'Speed-focused email drip. Pain point: time spent on manual valuations. CTA: 15-min demo of AI valuation tool.', status: 'todo', priority: 7, assigned_to: ['echo'], rock_id: '__r2__', due_date: _future(4), created_at: _d(3), updated_at: _d(1) },
  { id: '__dt14__', title: 'Define QA preflight rules for outbound comms', description: 'Create checklist: spam score check, link validation, personalization token verification, mobile rendering test.', status: 'todo', priority: 6, assigned_to: ['iris'], rock_id: null, due_date: _future(4), created_at: _d(4), updated_at: _d(2) },
  { id: '__dt15__', title: 'Build gym lead list — 30 independent gyms/fitness studios', description: 'Target Manchester & Liverpool independent gyms. Collect owner name, email, Instagram handle, member count estimate.', status: 'todo', priority: 6, assigned_to: ['sola'], rock_id: '__r2__', due_date: _future(5), created_at: _d(4), updated_at: _d(2) },
  { id: '__dt16__', title: 'Write 3-email cold sequence for gyms — unanswered enquiries', description: 'Angle: "Your gym is losing £X/month from unanswered DMs and enquiries." CTA: free audit of their response time.', status: 'todo', priority: 6, assigned_to: ['echo'], rock_id: '__r2__', due_date: _future(5), created_at: _d(4), updated_at: _d(2) },
  { id: '__dt17__', title: 'Design playbook schema and template format', description: 'Create JSON schema for reusable outreach playbooks. Fields: niche, pain points, email templates, follow-up cadence, objection handling.', status: 'todo', priority: 5, assigned_to: ['archie'], rock_id: null, due_date: _future(5), created_at: _d(5), updated_at: _d(3) },
  { id: '__dt18__', title: 'Audit current notification sources and classify by severity', description: 'Map all notification triggers (task blocked, issue raised, deal stage change, etc.) and assign severity levels for smart routing.', status: 'todo', priority: 5, assigned_to: ['dash'], rock_id: null, due_date: _future(6), created_at: _d(5), updated_at: _d(3) },

  // ── REVIEW ──
  { id: '__dt19__', title: 'Review outreach copy: SaaS founder sequence', description: 'QA the 5-email sequence for SaaS founders. Check personalization tokens, CTA clarity, spam word triggers, and mobile rendering.', status: 'review', priority: 7, assigned_to: ['iris'], rock_id: '__r2__', due_date: _today(), created_at: _d(4), updated_at: _d(0, 10, 15) },
  { id: '__dt20__', title: 'Approve brand guidelines v2.1', description: 'Final review of updated color palette, typography scale, logo usage rules, and social media templates before team rollout.', status: 'review', priority: 6, assigned_to: ['luna'], rock_id: null, due_date: _today(), created_at: _d(6), updated_at: _d(0, 9, 30) },

  // ── DONE ──
  { id: '__dt21__', title: 'Deploy Mission Control v2 to production', description: 'Pushed latest dashboard build to Netlify. Includes new ticker, scorecard auto-populate, mobile nav overhaul, and agent status fix.', status: 'done', priority: 10, assigned_to: ['kai', 'archie'], rock_id: null, due_date: _past(2), created_at: _d(10), updated_at: _d(2) },
  { id: '__dt22__', title: 'Send 250 cold emails: AI consultancy niche', description: 'First batch sent via Instantly. 47% open rate, 4.8% reply rate. 3 positive replies, 1 meeting booked.', status: 'done', priority: 9, assigned_to: ['penny'], rock_id: '__r2__', due_date: _past(3), created_at: _d(12), updated_at: _d(3) },
  { id: '__dt23__', title: 'Complete ICP research for NW estate agents', description: 'Built target list of 87 estate agents across Manchester, Liverpool, and surrounding towns. Verified emails and LinkedIn profiles.', status: 'done', priority: 8, assigned_to: ['sola'], rock_id: '__r2__', due_date: _past(5), created_at: _d(14), updated_at: _d(5) },
  { id: '__dt24__', title: 'Set up weekly L10 meeting template', description: 'Created recurring agenda: segue, scorecard review, rock updates, to-do review, IDS. Added to Mission Control L10 page.', status: 'done', priority: 6, assigned_to: ['quinn'], rock_id: null, due_date: _past(7), created_at: _d(15), updated_at: _d(7) },
  { id: '__dt25__', title: 'Build agent architecture blueprint for Kai', description: 'Designed modular agent system: task router, memory layer, tool registry, output validator. Ready for implementation sprint.', status: 'done', priority: 9, assigned_to: ['archie'], rock_id: null, due_date: _past(4), created_at: _d(11), updated_at: _d(4) },
  { id: '__dt26__', title: 'Negotiate retainer terms with MediFlow', description: 'Agreed £3,000/month for AI chatbot + analytics dashboard. 6-month initial term. SOW signed. Onboarding starts next week.', status: 'done', priority: 10, assigned_to: ['penny'], rock_id: '__r3__', due_date: _past(1), created_at: _d(8), updated_at: _d(1) },
  { id: '__dt27__', title: 'Create Loom walkthrough: Mission Control overview', description: 'Recorded 8-minute product demo for client onboarding. Covers dashboard, to-dos, rocks, scorecard. Uploaded to shared drive.', status: 'done', priority: 5, assigned_to: ['dash'], rock_id: null, due_date: _past(6), created_at: _d(13), updated_at: _d(6) },

  // ── BACKLOG ──
  { id: '__dt28__', title: 'Build automated proposal generator', description: 'Template engine that auto-fills client name, scope, pricing, and timeline into branded PDF proposals.', status: 'backlog', priority: 4, assigned_to: ['kai'], rock_id: null, due_date: null, created_at: _d(20), updated_at: _d(10) },
  { id: '__dt29__', title: 'Explore partnership with UK SaaS accelerator', description: 'Research Y Combinator UK equivalents, Seedcamp, Techstars London. Potential referral channel for AI agent services.', status: 'backlog', priority: 3, assigned_to: ['sola'], rock_id: null, due_date: null, created_at: _d(18), updated_at: _d(12) },
  { id: '__dt30__', title: 'Create video testimonial process', description: 'Define workflow: request template, recording tips doc, editing checklist. Aim for 2 client testimonials per quarter.', status: 'backlog', priority: 3, assigned_to: ['echo', 'luna'], rock_id: null, due_date: null, created_at: _d(16), updated_at: _d(14) },

  // ── BLOCKED ──
  { id: '__dt31__', title: 'Integrate Stripe billing for retainer clients', description: 'Recurring subscription setup blocked — waiting on business bank account verification. ETA: 5 working days.', status: 'blocked', priority: 8, assigned_to: ['kai'], rock_id: null, due_date: _future(7), created_at: _d(9), updated_at: _d(0, 12, 0), linked_issue_id: '__i1__' },
];

// ── DEMO ISSUES (IDS workflow) ───────────────────────────────────────────
const DEMO_ISSUES = [
  { id: '__i1__', title: 'Stripe integration blocked by bank verification', description: 'Business bank account verification pending with Stripe. Cannot set up recurring billing until approved. Submitted 5 days ago — follow up required.', priority: 'high', status: 'ids', raised_by: 'kai', rock_id: null, created_at: _d(5), updated_at: _d(0, 12) },
  { id: '__i2__', title: 'Cold email deliverability dropping below 90%', description: 'Instantly.ai showing 87% deliverability on secondary domain. May need to rotate sending domain or reduce daily volume from 50 to 30.', priority: 'high', status: 'open', raised_by: 'penny', rock_id: '__r2__', created_at: _d(2), updated_at: _d(1) },
  { id: '__i3__', title: 'Client reporting dashboard slow on mobile', description: 'Chart.js renders are lagging on mobile Safari. Need to investigate lazy loading or switch to lighter chart library for mobile viewport.', priority: 'medium', status: 'open', raised_by: 'dash', rock_id: null, created_at: _d(3), updated_at: _d(2) },
  { id: '__i4__', title: 'LinkedIn outreach getting restricted', description: 'Account hitting 100 connection request limit per week. Need to implement warm-up strategy or consider Sales Navigator upgrade.', priority: 'medium', status: 'open', raised_by: 'echo', rock_id: null, created_at: _d(4), updated_at: _d(3) },
  { id: '__i5__', title: 'Onboarding NPS below target (current: 7.2, target: 8.5)', description: 'New client feedback shows friction in first-week handoff. Quinn to review onboarding checklist and add proactive check-in at day 3.', priority: 'medium', status: 'ids', raised_by: 'iris', rock_id: '__r3__', created_at: _d(6), updated_at: _d(1) },
  { id: '__i6__', title: 'Need clearer pricing tiers for website', description: 'Prospects asking for pricing before discovery call. Decide: show pricing publicly, gate behind form, or keep current "book a call" approach.', priority: 'low', status: 'open', raised_by: 'penny', rock_id: '__r1__', created_at: _d(8), updated_at: _d(4) },
  // Solved (for history)
  { id: '__i7__', title: 'Mission Control polling causing API rate limits', description: 'Supabase REST API returning 429s during peak polling. Fixed by reducing quick refresh from 15s to 30s and adding request deduplication.', priority: 'high', status: 'solved', raised_by: 'archie', rock_id: null, created_at: _d(14), updated_at: _d(7) },
  { id: '__i8__', title: 'Avatar images not loading on Netlify deploy', description: 'Cache-busting query string was being stripped by Netlify CDN. Added explicit cache headers in netlify.toml. Fixed.', priority: 'low', status: 'solved', raised_by: 'kai', rock_id: null, created_at: _d(12), updated_at: _d(9) },
];

// ── DEMO ROCKS (90-day priorities) ───────────────────────────────────────
const DEMO_ROCKS = [
  { id: '__r1__', title: '30-Day Offer Validation Sprint', description: 'Test 3 niches (AI consultancy, SaaS founders, estate agents) with cold outreach. Goal: identify the niche with highest reply rate and meeting conversion.', status: 'on_track', progress: 72, owner_id: 'jarvis', quarter: 1, year: 2026, due_date: '2026-03-31', created_at: _d(35), updated_at: _d(1) },
  { id: '__r2__', title: 'Launch cold outreach — 1,000 emails/week', description: 'Set up Instantly.ai, warm domains, build verified prospect lists, deploy email sequences. Target: 1,000 personalized emails per week by end of March.', status: 'on_track', progress: 58, owner_id: 'penny', quarter: 1, year: 2026, due_date: '2026-03-31', created_at: _d(35), updated_at: _d(0, 14) },
  { id: '__r3__', title: 'Sign first 3 retainer clients at 2k+/mo', description: 'Close 3 monthly retainer deals (£2K+ each). Pipeline must have 10+ qualified prospects by mid-March to hit this target.', status: 'on_track', progress: 45, owner_id: 'penny', quarter: 1, year: 2026, due_date: '2026-03-31', created_at: _d(35), updated_at: _d(2) },
  { id: '__r4__', title: 'Mission Control Hardening & Ops Foundation', description: 'Stabilise Mission Control for daily use: fix scorecard auto-populate, add mobile nav, build notification pipeline, and ensure reliable polling.', status: 'on_track', progress: 65, owner_id: 'kai', quarter: 1, year: 2026, due_date: '2026-03-31', created_at: _d(35), updated_at: _d(1) },
];

// ── DEMO MILESTONES (for rocks) ──────────────────────────────────────────
const DEMO_MILESTONES = [
  // R1 milestones
  { id: '__ms01__', rock_id: '__r1__', title: 'Identify 3 test niches', due_date: '2026-02-28', status: 'completed' },
  { id: '__ms02__', rock_id: '__r1__', title: 'Send 250 emails per niche', due_date: '2026-03-14', status: 'completed' },
  { id: '__ms03__', rock_id: '__r1__', title: 'Analyze response data & pick winner', due_date: '2026-03-25', status: 'pending' },
  { id: '__ms04__', rock_id: '__r1__', title: 'Document validated offer + ICP', due_date: '2026-03-31', status: 'pending' },
  // R2 milestones
  { id: '__ms05__', rock_id: '__r2__', title: 'Set up 3 warm sending domains', due_date: '2026-02-20', status: 'completed' },
  { id: '__ms06__', rock_id: '__r2__', title: 'Build 500+ verified prospect list', due_date: '2026-03-01', status: 'completed' },
  { id: '__ms07__', rock_id: '__r2__', title: 'Hit 500 emails/week sustained', due_date: '2026-03-15', status: 'completed' },
  { id: '__ms08__', rock_id: '__r2__', title: 'Scale to 1,000 emails/week', due_date: '2026-03-31', status: 'pending' },
  // R3 milestones
  { id: '__ms09__', rock_id: '__r3__', title: 'Pipeline: 10 qualified prospects', due_date: '2026-03-10', status: 'completed' },
  { id: '__ms10__', rock_id: '__r3__', title: 'Close client #1 (MediFlow)', due_date: '2026-03-07', status: 'completed' },
  { id: '__ms11__', rock_id: '__r3__', title: 'Close client #2', due_date: '2026-03-21', status: 'pending' },
  { id: '__ms12__', rock_id: '__r3__', title: 'Close client #3', due_date: '2026-03-31', status: 'pending' },
  // R4 milestones
  { id: '__ms13__', rock_id: '__r4__', title: 'Fix scorecard auto-populate', due_date: '2026-02-28', status: 'completed' },
  { id: '__ms14__', rock_id: '__r4__', title: 'Ship mobile navigation overhaul', due_date: '2026-03-07', status: 'completed' },
  { id: '__ms15__', rock_id: '__r4__', title: 'Build notification pipeline', due_date: '2026-03-21', status: 'pending' },
  { id: '__ms16__', rock_id: '__r4__', title: 'Reliable polling + error recovery', due_date: '2026-03-31', status: 'pending' },
];

// ── DEMO MESSAGES (feed / Telegram-style) ────────────────────────────────
const DEMO_MESSAGES = [
  { id: '__dm01__', created_at: _d(0, 14, 32), sender: 'jarvis', content: 'Weekly sync complete. All rocks on track except R4 (case study) — Echo needs client sign-off on quotes. Flagged as at-risk.', channel: 'general' },
  { id: '__dm02__', created_at: _d(0, 14, 15), sender: 'penny', content: 'Just booked a discovery call with BrightPath Homes for Thursday. They saw our LinkedIn post about AI for estate agents and reached out.', channel: 'sales' },
  { id: '__dm03__', created_at: _d(0, 13, 48), sender: 'echo', content: 'Cold email sequence for AI consultancies is drafted. 5 emails over 14 days. Personalized opener using company tech stack. Sending to Iris for QA review.', channel: 'marketing' },
  { id: '__dm04__', created_at: _d(0, 12, 30), sender: 'kai', content: 'Client reporting dashboard MVP is live on staging. Chart.js widgets showing outreach metrics, pipeline value, and weekly trends. Ready for internal review.', channel: 'engineering' },
  { id: '__dm05__', created_at: _d(0, 11, 15), sender: 'sola', content: 'Prospect scoring model v1 complete. Scoring on: company size (1-5), funding stage (1-3), tech stack match (1-5), engagement signals (1-3). Top 20 prospects identified.', channel: 'marketing' },
  { id: '__dm06__', created_at: _d(0, 10, 45), sender: 'utkarsh', content: 'Great momentum this week team. Two things: 1) Penny, aim for 3 discovery calls next week. 2) Echo, case study is priority — block Friday for it.', channel: 'general' },
  { id: '__dm07__', created_at: _d(1, 16, 20), sender: 'iris', content: 'MediFlow onboarding complete. Client has access to dashboard, Slack channel is set up, and first weekly sync is scheduled for Monday. NPS: 9/10 at kickoff.', channel: 'delivery' },
  { id: '__dm08__', created_at: _d(1, 14, 50), sender: 'luna', content: 'Landing page v2 designs are in Figma. New hero section with motion graphics, social proof strip with client logos, and mobile-first CTA.', channel: 'design' },
  { id: '__dm09__', created_at: _d(1, 11, 30), sender: 'archie', content: 'Agent architecture blueprint finalized. Modular design: task router, memory layer, tool registry, output validator. Each component independently deployable.', channel: 'engineering' },
  { id: '__dm10__', created_at: _d(1, 9, 15), sender: 'quinn', content: 'Sprint retro notes: Biggest win — MediFlow signed. Biggest risk — case study timeline. Action: Echo blocks 2 half-days, Penny updates CRM daily.', channel: 'general' },
  { id: '__dm11__', created_at: _d(2, 15, 40), sender: 'dash', content: 'Weekly KPI report: Outreach sent: 487, Open rate: 47%, Reply rate: 4.8%, Meetings booked: 2, Pipeline value: £18,500. On track for scorecard targets.', channel: 'analytics' },
  { id: '__dm12__', created_at: _d(2, 13, 20), sender: 'penny', content: 'DataStream AI just moved to proposal stage. They want a custom AI chatbot for their customer support. Estimated deal value: £4,200/month. SOW tomorrow.', channel: 'sales' },
  { id: '__dm13__', created_at: _d(3, 11, 0), sender: 'sola', content: 'NW estate agent research complete. 87 verified contacts across Manchester, Liverpool, and surrounding areas. Data quality: 94% email deliverable.', channel: 'marketing' },
  { id: '__dm14__', created_at: _d(3, 16, 30), sender: 'jarvis', content: 'Q1 shaping up well. Revenue target £5K MRR — at £3K with MediFlow signed. Two more retainers in pipeline. Biggest gap: case study not published yet.', channel: 'general' },
  { id: '__dm15__', created_at: _d(4, 10, 0), sender: 'kai', content: 'Shipped Mission Control v2 update. New features: ticker headlines, scorecard auto-populate, mobile navigation overhaul, agent heartbeat status. Deploy: 47s.', channel: 'engineering' },
];

// ── DEMO SCORECARD METRICS ───────────────────────────────────────────────
const _thisMonday = (() => {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
})();
const _lastMonday = (() => {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7);
  return d.toISOString().slice(0, 10);
})();
const _twoWeeksAgo = (() => {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 14);
  return d.toISOString().slice(0, 10);
})();
const _threeWeeksAgo = (() => {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 21);
  return d.toISOString().slice(0, 10);
})();

const DEMO_SCORECARD = [
  // This week
  { id: '__sc01__', week_of: _thisMonday, metric_name: 'Outreach Sent',    owner_id: 'penny',  target_value: 1000, actual_value: 487, source: 'auto' },
  { id: '__sc02__', week_of: _thisMonday, metric_name: 'Meetings Booked',  owner_id: 'penny',  target_value: 10,   actual_value: 4,   source: 'auto' },
  { id: '__sc03__', week_of: _thisMonday, metric_name: 'Closes',           owner_id: 'penny',  target_value: 3,    actual_value: 1,   source: 'auto' },
  { id: '__sc04__', week_of: _thisMonday, metric_name: 'Active Clients',   owner_id: 'jarvis', target_value: 3,    actual_value: 2,   source: 'auto' },
  { id: '__sc05__', week_of: _thisMonday, metric_name: 'MRR',              owner_id: 'jarvis', target_value: 5000, actual_value: 5800, source: 'auto' },
  // Last week
  { id: '__sc06__', week_of: _lastMonday, metric_name: 'Outreach Sent',    owner_id: 'penny',  target_value: 1000, actual_value: 412, source: 'auto' },
  { id: '__sc07__', week_of: _lastMonday, metric_name: 'Meetings Booked',  owner_id: 'penny',  target_value: 10,   actual_value: 3,   source: 'auto' },
  { id: '__sc08__', week_of: _lastMonday, metric_name: 'Closes',           owner_id: 'penny',  target_value: 3,    actual_value: 1,   source: 'auto' },
  { id: '__sc09__', week_of: _lastMonday, metric_name: 'Active Clients',   owner_id: 'jarvis', target_value: 3,    actual_value: 1,   source: 'auto' },
  { id: '__sc10__', week_of: _lastMonday, metric_name: 'MRR',              owner_id: 'jarvis', target_value: 5000, actual_value: 3000, source: 'auto' },
  // Two weeks ago
  { id: '__sc11__', week_of: _twoWeeksAgo, metric_name: 'Outreach Sent',   owner_id: 'penny',  target_value: 1000, actual_value: 250, source: 'auto' },
  { id: '__sc12__', week_of: _twoWeeksAgo, metric_name: 'Meetings Booked', owner_id: 'penny',  target_value: 10,   actual_value: 2,   source: 'auto' },
  { id: '__sc13__', week_of: _twoWeeksAgo, metric_name: 'Closes',          owner_id: 'penny',  target_value: 3,    actual_value: 0,   source: 'auto' },
  { id: '__sc14__', week_of: _twoWeeksAgo, metric_name: 'Active Clients',  owner_id: 'jarvis', target_value: 3,    actual_value: 0,   source: 'auto' },
  { id: '__sc15__', week_of: _twoWeeksAgo, metric_name: 'MRR',             owner_id: 'jarvis', target_value: 5000, actual_value: 0,   source: 'auto' },
  // Three weeks ago
  { id: '__sc16__', week_of: _threeWeeksAgo, metric_name: 'Outreach Sent',   owner_id: 'penny',  target_value: 1000, actual_value: 120, source: 'auto' },
  { id: '__sc17__', week_of: _threeWeeksAgo, metric_name: 'Meetings Booked', owner_id: 'penny',  target_value: 10,   actual_value: 1,   source: 'auto' },
  { id: '__sc18__', week_of: _threeWeeksAgo, metric_name: 'Closes',          owner_id: 'penny',  target_value: 3,    actual_value: 0,   source: 'auto' },
  { id: '__sc19__', week_of: _threeWeeksAgo, metric_name: 'Active Clients',  owner_id: 'jarvis', target_value: 3,    actual_value: 0,   source: 'auto' },
  { id: '__sc20__', week_of: _threeWeeksAgo, metric_name: 'MRR',             owner_id: 'jarvis', target_value: 5000, actual_value: 0,   source: 'auto' },
];

// ── DEMO ANNUAL GOALS ───────────────────────────────────────────────────
const DEMO_ANNUAL_GOALS = [
  { id: '__ag1__', title: 'Build AI agent delivery system that runs 80% autonomously', status: 'active', progress: 25, priority: 1, assigned_to: ['kai'], metadata: { scope: '1_year_plan' } },
  { id: '__ag2__', title: '15 active retainer clients at £2K+ average', status: 'active', progress: 7, priority: 2, assigned_to: ['penny'], metadata: { scope: '1_year_plan' } },
  { id: '__ag3__', title: 'Outreach pipeline: 100 qualified prospects/month', status: 'active', progress: 35, priority: 3, assigned_to: ['sola'], metadata: { scope: '1_year_plan' } },
  { id: '__ag4__', title: '£30K/month agency revenue', status: 'active', progress: 10, priority: 4, assigned_to: ['jarvis'], metadata: { scope: '1_year_plan' } },
  { id: '__ag5__', title: '70%+ gross margins on all retainers', status: 'active', progress: 50, priority: 5, assigned_to: ['jarvis'], metadata: { scope: '1_year_plan' } },
  { id: '__ag6__', title: '5+ published case studies with measurable results', status: 'active', progress: 10, priority: 6, assigned_to: ['echo'], metadata: { scope: '1_year_plan' } },
];

// ── DEMO PROSPECTS (pipeline) ────────────────────────────────────────────
const DEMO_PROSPECTS_DATA = [
  { id: '__pr01__', company_name: 'MediFlow Health', contact_name: 'Dr. Sarah Chen', email: 'sarah@mediflow.co.uk', status: 'Active Client', estimated_deal_value: 3000, industry: 'HealthTech', notes: 'First retainer client. AI chatbot + analytics dashboard.', created_at: _d(30), updated_at: _d(1) },
  { id: '__pr02__', company_name: 'TechNova AI', contact_name: 'Olivia Brown', email: 'olivia@technova.ai', status: 'Active Client', estimated_deal_value: 2800, industry: 'AI/ML', notes: 'Beta client. Case study subject. Reduced manual ops by 60%.', created_at: _d(45), updated_at: _d(3) },
  { id: '__pr03__', company_name: 'DataStream AI', contact_name: 'James Patel', email: 'james@datastream.ai', status: 'Proposal', estimated_deal_value: 4200, industry: 'AI/ML', notes: 'SOW sent. Custom AI chatbot for customer support.', created_at: _d(14), updated_at: _d(1) },
  { id: '__pr04__', company_name: 'BrightPath Homes', contact_name: 'Tom Richards', email: 'tom@brightpathhomes.co.uk', status: 'Meeting Booked', estimated_deal_value: 2500, industry: 'Real Estate', notes: 'Inbound from LinkedIn. AI lead qualification.', created_at: _d(3), updated_at: _d(0) },
  { id: '__pr05__', company_name: 'NexaTech Solutions', contact_name: 'Priya Sharma', email: 'priya@nexatech.io', status: 'Qualified', estimated_deal_value: 3500, industry: 'SaaS', notes: 'Replied to cold email. Needs AI agent for internal ops.', created_at: _d(10), updated_at: _d(2) },
  { id: '__pr06__', company_name: 'FinEdge Capital', contact_name: 'Alex Morgan', email: 'alex@finedge.com', status: 'Proposal', estimated_deal_value: 6000, industry: 'FinTech', notes: 'High-value. AI compliance monitoring. CTO is champion.', created_at: _d(12), updated_at: _d(1) },
  { id: '__pr07__', company_name: 'CloudPeak Analytics', contact_name: 'Emma Watson', email: 'emma@cloudpeak.ai', status: 'Qualified', estimated_deal_value: 5000, industry: 'Analytics', notes: 'Enterprise. Multiple departments interested.', created_at: _d(8), updated_at: _d(2) },
  { id: '__pr08__', company_name: 'UrbanNest Properties', contact_name: 'Mike Johnson', email: 'mike@urbannest.co.uk', status: 'Contacted', estimated_deal_value: 2000, industry: 'Real Estate', notes: 'Manchester-based. 45 agents, 5 offices.', created_at: _d(5), updated_at: _d(3) },
  { id: '__pr09__', company_name: 'Greenfield Estates', contact_name: 'David Liu', email: 'david@greenfieldestates.co.uk', status: 'Contacted', estimated_deal_value: 2200, industry: 'Real Estate', notes: 'Liverpool agency. Follow-up call Friday.', created_at: _d(6), updated_at: _d(2) },
  { id: '__pr10__', company_name: 'SwiftLogistics', contact_name: 'Chris Taylor', email: 'chris@swiftlogistics.co.uk', status: 'Lost', estimated_deal_value: 3000, industry: 'Logistics', notes: 'Went with in-house solution. Re-engage in 6mo.', created_at: _d(25), updated_at: _d(10) },
];

// ── DEMO CAMPAIGNS ───────────────────────────────────────────────────────
const DEMO_CAMPAIGNS = [
  { id: '__camp01__', name: 'AI Consultancy Cold Outreach', niche: 'AI Consultancy', status: 'Active', outreach_sent: 487, opens: 229, positive_replies: 23, meetings_booked: 4, shows: 3, closes: 1, pipeline_value: 8500, created_at: _d(21), updated_at: _d(0) },
  { id: '__camp02__', name: 'NW Estate Agents — Manchester', niche: 'Real Estate', status: 'Active', outreach_sent: 156, opens: 72, positive_replies: 8, meetings_booked: 2, shows: 1, closes: 0, pipeline_value: 4500, created_at: _d(14), updated_at: _d(1) },
  { id: '__camp03__', name: 'SaaS Founders — UK', niche: 'SaaS', status: 'Draft', outreach_sent: 0, opens: 0, positive_replies: 0, meetings_booked: 0, shows: 0, closes: 0, pipeline_value: 0, created_at: _d(3), updated_at: _d(1) },
  { id: '__camp04__', name: 'NW Estate Agents — Liverpool', niche: 'Real Estate', status: 'Warmup', outreach_sent: 0, opens: 0, positive_replies: 0, meetings_booked: 0, shows: 0, closes: 0, pipeline_value: 0, created_at: _d(7), updated_at: _d(2) },
];

// ── DEMO CLIENTS ─────────────────────────────────────────────────────────
const DEMO_CLIENTS = [
  { id: '__cl01__', name: 'MediFlow Health', status: 'Active', monthly_value: 3000, industry: 'HealthTech', contact_name: 'Dr. Sarah Chen', contact_email: 'sarah@mediflow.co.uk', started_at: _d(14), notes: 'AI chatbot + analytics. Weekly sync Mondays. NPS: 9/10.' },
  { id: '__cl02__', name: 'TechNova AI', status: 'Active', monthly_value: 2800, industry: 'AI/ML', contact_name: 'Olivia Brown', contact_email: 'olivia@technova.ai', started_at: _d(45), notes: 'Beta client. Ops automation. Case study in progress.' },
];

// ── DEMO AGENT STATUS (simulated heartbeats) ─────────────────────────────
const _nowH = new Date().getHours();
const _nowM = new Date().getMinutes();
const DEMO_AGENT_STATUS = [
  { id: 'jarvis-uuid', name: 'Jarvis', status: 'online', current_task_id: null,       last_heartbeat: _d(0, _nowH, Math.max(0, _nowM - 2)), metadata: {} },
  { id: 'echo-uuid',   name: 'Echo',   status: 'online', current_task_id: '__dt01__', last_heartbeat: _d(0, _nowH, Math.max(0, _nowM - 5)), metadata: {} },
  { id: 'luna-uuid',   name: 'Luna',   status: 'online', current_task_id: '__dt03__', last_heartbeat: _d(0, _nowH, Math.max(0, _nowM - 8)), metadata: {} },
  { id: 'sola-uuid',   name: 'Sola',   status: 'online', current_task_id: '__dt02__', last_heartbeat: _d(0, _nowH, Math.max(0, _nowM - 3)), metadata: {} },
  { id: 'dash-uuid',   name: 'Dash',   status: 'online', current_task_id: null,       last_heartbeat: _d(0, Math.max(0, _nowH - 1), 30),    metadata: {} },
  { id: 'iris-uuid',   name: 'Iris',   status: 'online', current_task_id: '__dt19__', last_heartbeat: _d(0, _nowH, Math.max(0, _nowM - 12)), metadata: {} },
  { id: 'kai-uuid',    name: 'Kai',    status: 'online', current_task_id: '__dt04__', last_heartbeat: _d(0, _nowH, Math.max(0, _nowM - 1)), metadata: {} },
  { id: 'quinn-uuid',  name: 'Quinn',  status: 'online', current_task_id: null,       last_heartbeat: _d(0, _nowH, Math.max(0, _nowM - 15)), metadata: {} },
  { id: 'archie-uuid', name: 'Archie', status: 'online', current_task_id: null,       last_heartbeat: _d(0, Math.max(0, _nowH - 2), 0),     metadata: {} },
  { id: 'penny-uuid',  name: 'Penny',  status: 'online', current_task_id: '__dt06__', last_heartbeat: _d(0, _nowH, Math.max(0, _nowM - 6)), metadata: {} },
];

// ── DEMO NOTIFICATIONS ───────────────────────────────────────────────────
const DEMO_NOTIFICATIONS = [
  { id: '__n01__', type: 'deal',    title: 'MediFlow retainer signed',           body: 'Penny closed the first retainer — £3,000/month.', read: false, created_at: _d(1, 16, 0) },
  { id: '__n02__', type: 'task',    title: 'Case study deadline approaching',    body: 'R4 milestone "Draft case study copy" due in 5 days.', read: false, created_at: _d(0, 10, 0) },
  { id: '__n03__', type: 'issue',   title: 'Email deliverability below 90%',     body: 'Penny flagged: Instantly showing 87% on secondary domain.', read: false, created_at: _d(0, 11, 30) },
  { id: '__n04__', type: 'meeting', title: 'Discovery call: BrightPath Homes',   body: 'Thursday 2pm. Tom Richards, MD. AI lead qualification.', read: true, created_at: _d(0, 14, 20) },
  { id: '__n05__', type: 'system',  title: 'Mission Control v2 deployed',        body: 'Kai shipped ticker, scorecard, mobile nav. Build: 47s.', read: true, created_at: _d(2, 15, 0) },
];


// ── DEMO CONTENT TRACKER (content planner board) ────────────────────────
const DEMO_CONTENT_TRACKER = [
  { id: '__ct01__', title: 'POV: You hired 9 AI agents to run your business', stage: 'Idea', assigned_to: 'echo', description: 'Camera on laptop, reveal agent dashboard. Trending audio.', content_type: 'Short-form video', due_date: _future(8), views: 0, likes: 0, comments: 0, shares: 0, created_at: _d(2), deleted_at: null },
  { id: '__ct02__', title: '3 tools that replaced my entire marketing team', stage: 'Research', assigned_to: 'sola', description: 'Research competitor shorts for hook pacing and CTA placement.', content_type: 'Short-form video', due_date: _future(6), views: 0, likes: 0, comments: 0, shares: 0, created_at: _d(4), deleted_at: null },
  { id: '__ct03__', title: 'Day in my life running a £50k/m agency', stage: 'Drafting', assigned_to: 'luna', description: 'B-roll of desk setup, Mission Control dashboard, morning routine. 45s cut.', content_type: 'Short-form video', due_date: _future(4), views: 0, likes: 0, comments: 0, shares: 0, created_at: _d(5), deleted_at: null },
  { id: '__ct04__', title: 'Why your AI agents keep hallucinating (and how to fix it)', stage: 'Review', assigned_to: 'iris', description: 'Quick-cut explainer with on-screen text. Iris QA pass on captions.', content_type: 'Short-form video', due_date: _future(2), views: 0, likes: 0, comments: 0, shares: 0, created_at: _d(6), deleted_at: null },
  { id: '__ct05__', title: 'The 5am routine that built a 6-figure agency', stage: 'Scheduled', assigned_to: 'quinn', description: 'Scheduled Thu 7am all platforms. Quinn approved caption variants.', content_type: 'Short-form video', due_date: _future(1), views: 0, likes: 0, comments: 0, shares: 0, created_at: _d(7), deleted_at: null },
  { id: '__ct06__', title: 'I automated my entire business with AI — here\'s what happened', stage: 'Published', assigned_to: 'echo', description: 'Top performer this month. Strong saves and shares across TT and IG.', content_type: 'Short-form video', due_date: _past(5), delivered_date: _past(5), views: 284000, likes: 18400, comments: 1260, shares: 3100, created_at: _d(14), deleted_at: null },
  { id: '__ct07__', title: 'Stop doing this if you want to scale past £10k/m', stage: 'Published', assigned_to: 'echo', description: 'Contrarian hook. High comment rate drove algorithm push on Reels.', content_type: 'Short-form video', due_date: _past(8), delivered_date: _past(8), views: 147000, likes: 9200, comments: 890, shares: 1450, created_at: _d(16), deleted_at: null },
  { id: '__ct08__', title: 'How I run 9 AI agents from my phone', stage: 'Published', assigned_to: 'luna', description: 'Screen-record walkthrough of Telegram + Mission Control mobile.', content_type: 'Short-form video', due_date: _past(12), delivered_date: _past(12), views: 92000, likes: 5800, comments: 420, shares: 710, created_at: _d(18), deleted_at: null },
];

// ── DEMO CAMPAIGN STEPS (email sequences) ───────────────────────────────
const DEMO_CAMPAIGN_STEPS = [
  // AI Consultancy campaign steps
  { id: '__cs01__', campaign_id: '__camp01__', step_number: 1, subject: 'Quick question about {{company}}\'s AI ops', body: 'Hi {{firstName}},\n\nI noticed {{company}} is doing interesting work in AI. We help consultancies like yours automate 60% of manual ops with AI agents.\n\nWould a 15-min call this week make sense?\n\nBest,\nPenny', delay_days: 0, sent: 487, opens: 229, replies: 23, created_at: _d(21) },
  { id: '__cs02__', campaign_id: '__camp01__', step_number: 2, subject: 'Re: Quick question about {{company}}\'s AI ops', body: 'Hi {{firstName}},\n\nJust following up — wanted to share a quick case study. We helped TechNova reduce manual ops by 60% in 3 months.\n\nHappy to walk you through how — takes 15 minutes.\n\nBest,\nPenny', delay_days: 3, sent: 412, opens: 178, replies: 11, created_at: _d(21) },
  { id: '__cs03__', campaign_id: '__camp01__', step_number: 3, subject: 'One last thing, {{firstName}}', body: 'Hi {{firstName}},\n\nNot trying to fill your inbox — just genuinely think this would be valuable for {{company}}.\n\nHere\'s the case study link if you want to take a look async: [link]\n\nEither way, no hard feelings. 🤙\n\nPenny', delay_days: 5, sent: 380, opens: 142, replies: 8, created_at: _d(21) },
  // NW Estate Agents campaign steps
  { id: '__cs04__', campaign_id: '__camp02__', step_number: 1, subject: '{{company}} — saving 10 hours/week on valuations?', body: 'Hi {{firstName}},\n\nI work with independent estate agents across Manchester who are using AI to cut valuation prep time by 70%.\n\nWould it be worth a quick 15-min demo?\n\nBest,\nPenny', delay_days: 0, sent: 156, opens: 72, replies: 8, created_at: _d(14) },
  { id: '__cs05__', campaign_id: '__camp02__', step_number: 2, subject: 'Re: {{company}} — saving 10 hours/week on valuations?', body: 'Hi {{firstName}},\n\nQuick follow-up — one of our agents in Liverpool started using this last month and closed 3 extra deals from time saved.\n\nHappy to show you how it works.\n\nPenny', delay_days: 4, sent: 98, opens: 41, replies: 3, created_at: _d(14) },
];

// ── DEMO LOGS (agent activity logs) ─────────────────────────────────────
const DEMO_LOGS = [
  { id: '__log01__', created_at: _d(0, 14, 30), agent_id: 'echo', level: 'info', event: 'task_update', message: 'Updated cold email sequence draft — added personalised openers using tech stack data', metadata: {} },
  { id: '__log02__', created_at: _d(0, 13, 15), agent_id: 'kai', level: 'info', event: 'deploy', message: 'Client reporting dashboard MVP deployed to staging — Chart.js widgets active', metadata: {} },
  { id: '__log03__', created_at: _d(0, 12, 0), agent_id: 'sola', level: 'info', event: 'research', message: 'Prospect scoring model v1 complete — top 20 prospects ranked by composite score', metadata: {} },
  { id: '__log04__', created_at: _d(0, 11, 30), agent_id: 'penny', level: 'warn', event: 'deliverability', message: 'Instantly.ai deliverability dropped to 87% on secondary domain — flagged for review', metadata: {} },
  { id: '__log05__', created_at: _d(0, 10, 0), agent_id: 'iris', level: 'info', event: 'qa_review', message: 'QA review started on SaaS founder email sequence — checking spam triggers and personalization', metadata: {} },
  { id: '__log06__', created_at: _d(1, 16, 20), agent_id: 'iris', level: 'info', event: 'onboarding', message: 'MediFlow onboarding complete — dashboard access, Slack channel, weekly sync all configured', metadata: {} },
  { id: '__log07__', created_at: _d(1, 14, 50), agent_id: 'luna', level: 'info', event: 'design', message: 'Landing page v2 designs uploaded to Figma — hero section, social proof strip, mobile CTA', metadata: {} },
  { id: '__log08__', created_at: _d(1, 11, 30), agent_id: 'archie', level: 'info', event: 'architecture', message: 'Agent architecture blueprint finalized — modular: task router, memory layer, tool registry', metadata: {} },
  { id: '__log09__', created_at: _d(2, 15, 40), agent_id: 'dash', level: 'info', event: 'report', message: 'Weekly KPI report generated — 487 sent, 47% opens, 4.8% replies, 2 meetings, £18.5K pipeline', metadata: {} },
  { id: '__log10__', created_at: _d(2, 10, 0), agent_id: 'jarvis', level: 'info', event: 'coordination', message: 'Assigned BrightPath Homes discovery call prep to Penny — Thursday 2pm', metadata: {} },
  { id: '__log11__', created_at: _d(3, 9, 0), agent_id: 'quinn', level: 'info', event: 'meeting', message: 'Sprint retro facilitated — wins: MediFlow signed; risks: case study timeline; actions assigned', metadata: {} },
  { id: '__log12__', created_at: _d(4, 10, 0), agent_id: 'kai', level: 'info', event: 'deploy', message: 'Mission Control v2 shipped — ticker, scorecard auto-populate, mobile nav, agent heartbeat', metadata: {} },
];

// ── DEMO HANDOFFS (agent-to-agent) ──────────────────────────────────────
const DEMO_HANDOFFS = [
  { id: '__hf01__', created_at: _d(0, 14, 30), from_agent: 'echo', to_agent: 'iris', status: 'pending', summary: 'Cold email sequence for AI consultancies ready for QA review — 5 emails, personalized openers' },
  { id: '__hf02__', created_at: _d(0, 12, 0), from_agent: 'sola', to_agent: 'penny', status: 'accepted', summary: 'Top 20 scored prospects delivered — ready for outreach sequencing in Instantly' },
  { id: '__hf03__', created_at: _d(1, 16, 0), from_agent: 'iris', to_agent: 'penny', status: 'completed', summary: 'MediFlow onboarding complete — client handoff to Penny for ongoing relationship management' },
  { id: '__hf04__', created_at: _d(1, 14, 50), from_agent: 'luna', to_agent: 'kai', status: 'pending', summary: 'Landing page v2 designs in Figma — ready for frontend implementation handoff' },
  { id: '__hf05__', created_at: _d(2, 10, 0), from_agent: 'jarvis', to_agent: 'penny', status: 'completed', summary: 'BrightPath Homes inbound lead assigned — prepare discovery call deck and research company' },
  { id: '__hf06__', created_at: _d(3, 11, 0), from_agent: 'sola', to_agent: 'echo', status: 'completed', summary: 'NW estate agent research complete — 87 verified contacts ready for email sequence creation' },
];

// ── DEMO OUTREACH (calendar events for outreach) ────────────────────────
const DEMO_OUTREACH = [
  { id: '__or01__', company: 'NexaTech Solutions', contact: 'Priya Sharma', channel: 'email', send_date: _future(1), follow_up: _future(5), subject: 'AI agent for internal ops — quick demo?' },
  { id: '__or02__', company: 'FinEdge Capital', contact: 'Alex Morgan', channel: 'email', send_date: _past(2), follow_up: _future(2), subject: 'AI compliance monitoring — case study' },
  { id: '__or03__', company: 'CloudPeak Analytics', contact: 'Emma Watson', channel: 'linkedin', send_date: _past(1), follow_up: _future(3), subject: 'Multi-department AI rollout' },
  { id: '__or04__', company: 'UrbanNest Properties', contact: 'Mike Johnson', channel: 'email', send_date: _future(2), follow_up: _future(6), subject: 'AI valuations — 70% time saved' },
  { id: '__or05__', company: 'Greenfield Estates', contact: 'David Liu', channel: 'phone', send_date: _future(3), follow_up: null, subject: 'Follow-up call — Friday slot' },
];

// ── DEMO PIPELINE (calendar deal events) ────────────────────────────────
const DEMO_PIPELINE = [
  { id: '__pip01__', company: 'DataStream AI', contact: 'James Patel', stage: 'Proposal', value: 4200, next_date: _future(2), next_action: 'Review SOW and schedule sign-off call' },
  { id: '__pip02__', company: 'BrightPath Homes', contact: 'Tom Richards', stage: 'Discovery', value: 2500, next_date: _future(4), next_action: 'Discovery call — Thursday 2pm' },
  { id: '__pip03__', company: 'FinEdge Capital', contact: 'Alex Morgan', stage: 'Proposal', value: 6000, next_date: _future(3), next_action: 'Send revised proposal with compliance module' },
  { id: '__pip04__', company: 'CloudPeak Analytics', contact: 'Emma Watson', stage: 'Qualified', value: 5000, next_date: _future(5), next_action: 'Technical deep-dive with their CTO' },
];

// ── sbQuery INTERCEPTOR ──────────────────────────────────────────────────
// In demo mode, intercept all Supabase queries and return demo data.
const _originalSbQuery = typeof sbQuery === 'function' ? sbQuery : null;

if (DEMO_MODE) {
  sbQuery = async function(table, params = {}, svcOverride = false) {
    switch (table) {
      case 'agency_todos':      return DEMO_TASKS;
      case 'issues':            return DEMO_ISSUES;
      case 'agency_rocks':      return DEMO_ROCKS;
      case 'agency_milestones': return DEMO_MILESTONES;
      case 'agents':            return DEMO_AGENT_STATUS;
      case 'messages':          return DEMO_MESSAGES;
      case 'prospects':         return DEMO_PROSPECTS_DATA;
      case 'outreach_campaigns':return DEMO_CAMPAIGNS;
      case 'agency_clients':    return DEMO_CLIENTS;
      case 'prospect_lists':    return [];
      case 'prospect_list_members': return [];
      case 'agency_scorecard_metrics': return DEMO_SCORECARD;
      case 'agency_goals':      return DEMO_ANNUAL_GOALS;
      case 'notifications':     return DEMO_NOTIFICATIONS;
      case 'memory':            return [];
      case 'goals':             return DEMO_ANNUAL_GOALS;
      case 'content_tracker':   return DEMO_CONTENT_TRACKER;
      case 'agency_campaign_steps': return DEMO_CAMPAIGN_STEPS;
      case 'logs':              return DEMO_LOGS;
      case 'handoffs':          return DEMO_HANDOFFS;
      case 'outreach':          return DEMO_OUTREACH;
      case 'pipeline':          return DEMO_PIPELINE;
      case 'rocks':             return DEMO_ROCKS;
      default:
        console.log('[DEMO] Unhandled sbQuery table:', table, params);
        return [];
    }
  };

  // No-op writes in demo mode
  sbInsert = async function(table, data) {
    console.log('[DEMO] sbInsert blocked (read-only):', table);
    return Array.isArray(data) ? data : [data];
  };
  sbUpdate = async function(table, id, data) {
    console.log('[DEMO] sbUpdate blocked (read-only):', table, id);
    return [data];
  };
  sbDelete = async function(table, id) {
    console.log('[DEMO] sbDelete blocked (read-only):', table, id);
  };

  // ── Global fetch interceptor for direct Supabase REST calls ──
  // Many pages call fetch(SUPABASE_URL + ...) directly instead of sbQuery.
  const _originalFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : '');
    if (!urlStr.includes(SUPABASE_URL)) {
      return _originalFetch.call(window, url, options);
    }

    const match = urlStr.match(/\/rest\/v1\/([a-z_]+)/);
    const table = match ? match[1] : null;
    const method = (options.method || 'GET').toUpperCase();

    // Write operations → no-op
    if (method !== 'GET') {
      console.log(`[DEMO] fetch ${method} blocked (read-only):`, table || urlStr);
      return Promise.resolve(new Response(JSON.stringify([]), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Read operations → return demo data
    const DEMO_TABLE_MAP = {
      agency_todos:      DEMO_TASKS,
      issues:            DEMO_ISSUES,
      agency_rocks:      DEMO_ROCKS,
      agency_milestones: DEMO_MILESTONES,
      agents:            DEMO_AGENT_STATUS,
      messages:          DEMO_MESSAGES,
      prospects:         DEMO_PROSPECTS_DATA,
      outreach_campaigns:DEMO_CAMPAIGNS,
      agency_clients:    DEMO_CLIENTS,
      agency_scorecard_metrics: DEMO_SCORECARD,
      agency_goals:      DEMO_ANNUAL_GOALS,
      goals:             DEMO_ANNUAL_GOALS,
      notifications:     DEMO_NOTIFICATIONS,
      memory:            [],
      prospect_lists:    [],
      prospect_list_members: [],
      calendar_events:   [],
      content_tracker:   DEMO_CONTENT_TRACKER,
      agency_campaign_steps: DEMO_CAMPAIGN_STEPS,
      logs:              DEMO_LOGS,
      handoffs:          DEMO_HANDOFFS,
      outreach:          DEMO_OUTREACH,
      pipeline:          DEMO_PIPELINE,
      rocks:             DEMO_ROCKS,
    };

    if (table && table in DEMO_TABLE_MAP) {
      return Promise.resolve(new Response(JSON.stringify(DEMO_TABLE_MAP[table]), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      }));
    }

    console.log('[DEMO] fetch GET unknown table:', table || urlStr);
    return Promise.resolve(new Response(JSON.stringify([]), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    }));
  };
}
