# Mission Control — Agency Operations Dashboard

A full-stack operations dashboard built to run a scaling agency.

**[Live Demo](https://demomissioncontrol.netlify.app/)** · Built with Vanilla JS + Supabase + Chart.js

## The Problem

Agencies juggling growth hit the same wall: ops data lives in six different tools, nobody has a single view of pipeline + delivery + team capacity, and the founder ends up being the only person who knows what's actually happening.

This dashboard is the control surface. It consolidates team management, sales pipeline, client delivery, OKRs, and real-time analytics into a single command center — replacing the usual mess of spreadsheets, Notion pages, and disconnected tools.

## Who It's For

- Agency founders scaling past their first few hires
- Operations leads who need a single pane of glass across sales, delivery, and team
- Anyone building an AI-augmented agency and wants to see how a multi-agent team gets orchestrated

## Key Features

- **Kanban Task Board** — Drag-and-drop task management with agent assignment, priority levels, and automatic issue escalation when tasks get blocked
- **Sales Pipeline** — Full prospect lifecycle from lead capture through deal close, with outreach tracking, contact management, and social profile linking
- **Client Management** — Client directory with delivery milestones, handoff tracking, and satisfaction monitoring
- **OKRs & Rocks** — Quarterly objectives with measurable key results, progress tracking, and alignment to annual goals
- **Weekly Scorecard** — KPI tracking across revenue, profit, conversions, and lead generation with trend visualization
- **L10 Meetings** — Structured meeting framework (Segue, Scorecard, Rocks, To-Do List, IDS, Conclude) for weekly leadership syncs
- **Campaign Tracker** — Marketing campaign management with step-by-step workflow and performance analytics
- **Content Pipeline** — End-to-end content tracking from idea through draft, review, and publication
- **AI Agent Panel** — Monitor and manage a team of 10 specialized AI agents, each with defined roles, task queues, memory, and activity logs
- **Calendar** — Unified calendar pulling from tasks, rocks, outreach, content, pipeline milestones, and Google Calendar
- **Live Feed** — Real-time activity feed with Telegram integration for team communications
- **Chat Widget** — In-app AI assistant powered by Groq/Llama for data-driven operational Q&A
- **Analytics & Insights** — Interactive charts and dashboards for performance analysis across all operational areas
- **V/TO (Vision/Traction Organizer)** — Strategic quarterly planning with vision alignment and traction metrics

## Tech Stack

- **Frontend:** Vanilla JavaScript — no framework, no build step, just fast SPA with client-side routing
- **Styling:** Custom CSS with design tokens, responsive layout (desktop sidebar + mobile bottom nav)
- **Database:** Supabase (PostgreSQL + REST API)
- **Charts:** Chart.js
- **Icons:** Phosphor Icons
- **Fonts:** Inter (Google Fonts)
- **Serverless:** Netlify Functions (chat proxy → Groq API)
- **Deployment:** Netlify + GitHub Actions CI/CD

## Project Structure


## Project Structure

    ├── index.html          # Single-page shell with all markup
    ├── js/
    │   ├── boot.js         # App initialization and data seeding
    │   ├── config.js       # Agent definitions and configuration
    │   ├── state.js        # Centralized state object (MC)
    │   ├── router.js       # Client-side page routing
    │   ├── supabase.js     # Database REST helpers
    │   ├── demo-data.js    # Sample data for demo mode
    │   └── *.js            # Feature modules (one per page/feature)
    ├── css/
    │   └── app.css         # All styles, design tokens, responsive breakpoints
    └── netlify/
        └── functions/      # Serverless chat proxy


## Getting Started

```bash
git clone https://github.com/u-kaushik/Mission-Control-Portfolio.git
cd Mission-Control-Portfolio
npx serve .
```

The app ships with built-in demo data, so it works immediately without a database connection.

To connect your own Supabase instance, add your credentials in js/config.js:

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-anon-key';

Screenshots
Screenshots coming soon. Visit the live demo to see it in action.

Live Demo
demomissioncontrol.netlify.app

The demo runs on synthetic data — no real personal information or API keys are used.

License
AGPL-3.0 — see LICENSE for details.
