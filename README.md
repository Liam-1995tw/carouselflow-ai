# CarouselFlow AI

> A multi-agent AI pipeline that turns a topic + your notes into a fully designed LinkedIn carousel — in seconds.

![Demo Mode](https://img.shields.io/badge/demo%20mode-no%20API%20keys%20needed-4F6EF7?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)

---

## What it does

Paste a topic (or let AI suggest one from your notes), click **Generate**, and watch 7 AI agents collaborate in real time to produce a complete carousel:

| # | Agent | Role | Powered by |
|---|-------|------|-----------|
| 1 | **Research** | Extracts facts, hooks, and narrative angle | Gemini / DeepMind |
| 2 | **Style Reference** | Analyses reference image, picks visual mood | Claude (Anthropic) |
| 3 | **Design** | Translates mood into palette, typography, layout | Claude (Anthropic) |
| 4 | **Brand** | Sets voice, tone, and copywriting rules | Gemini / DeepMind |
| 5 | **Copywriting** | Writes all slide copy + 3 title variants per slide | Gemini / DeepMind |
| 6 | **Carousel Engine** | Assembles slides, stores to ClickHouse | ClickHouse |
| 7 | **Image Gen** | Fetches thematic images, renders 1080×1350 PNGs | loremflickr |

All agent progress streams live via **Server-Sent Events** — you see each stage fire in real time.

---

## Quick start (zero API keys)

```bash
git clone https://github.com/Liam-1995tw/carouselflow-ai.git
cd carouselflow-ai
npm install
npm run dev
# → open http://localhost:3001
```

`DEMO_MODE=true` is the default. The full 7-agent pipeline runs with realistic mock responses — no Gemini key, no Claude key, no ClickHouse required.

---

## Features

- **Topic suggestions** — paste your reference content and get 4 AI-generated topic angles (Direct / Curiosity / Lessons / How-to)
- **Content-aware generation** — your notes actually influence every agent's output
- **3 title options per slide** — statement, curiosity question, personal hook; click to swap
- **Reference image upload** — design agent analyses your image and adapts the visual style
- **Live pipeline logs** — watch every agent fire with timing in the left panel
- **In-browser slide editor** — edit title, body, regenerate image, download PNG
- **Theme switcher** — 10 presets (Dark Luxury, Neon Grid, Warm Paper, etc.)
- **Re-theme** — apply a new theme to all rendered slides instantly
- **Project save / load** — persisted to `localStorage`, reload and re-render at any time
- **Download all** — export all 6 slides as 1080×1350 PNGs

---

## With real API keys

Edit `.env` (copy from `.env.example`):

```env
DEMO_MODE=false

# Gemini (DeepMind sponsor) — free tier available
GEMINI_API_KEY=your_gemini_key

# Claude — for design agent
ANTHROPIC_API_KEY=your_anthropic_key

# ClickHouse (optional — auto-creates tables if connected)
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DB=carouselflow

# Datadog (optional — DogStatsD metrics)
DD_API_KEY=your_datadog_key
DD_SERVICE=carouselflow-ai
```

Start ClickHouse locally (optional):

```bash
docker run -d -p 8123:8123 \
  -e CLICKHOUSE_DB=carouselflow \
  clickhouse/clickhouse-server:24-alpine
```

---

## Architecture

```
Browser
  │
  │  POST /api/generate-carousel  (topic + content_notes + referenceImage)
  │  ← SSE stream (agent_start / thinking / agent_done / image_progress / done)
  ▼
Express Server (server/server.js)
  │
  ├─► Orchestrator
  │     ├─► Research Agent       → Gemini LLM   → ClickHouse agent_events
  │     ├─► Style Reference      → Gemini LLM   → ClickHouse agent_events
  │     ├─► Design Agent         → Claude LLM   → ClickHouse agent_events
  │     ├─► Brand Agent          → Gemini LLM
  │     ├─► Copywriting Agent    → Gemini LLM   → ClickHouse agent_events
  │     ├─► Carousel Engine                     → ClickHouse generated_slides
  │     └─► Image Gen Agent      → loremflickr  → Canvas 1080×1350 PNG
  │
  └─► Datadog DogStatsD  (agent duration, error count, generation metrics)
```

---

## Sponsor integrations

### DeepMind / Gemini
All content agents (Research, Style Reference, Brand, Copywriting) call Google Gemini via its OpenAI-compatible endpoint. Swap to any OpenAI-compatible provider by setting `LLM_BASE_URL` and `LLM_MODEL`.

### ClickHouse
Five tables auto-created on first run:

| Table | Contents |
|-------|----------|
| `carousel_projects` | Project records (topic, theme, status) |
| `generated_slides` | All slide data with layout metadata |
| `agent_events` | Every agent start/done/error with timing |
| `style_profiles` | Design specs per project |
| `analytics_events` | Custom events from the frontend |

### Datadog
DogStatsD metrics (requires `hot-shots` and a local Datadog Agent):

| Metric | Type | Tags |
|--------|------|------|
| `carouselflow.agent.run_count` | counter | `agent:*` |
| `carouselflow.agent.duration_ms` | histogram | `agent:*` |
| `carouselflow.agent.error_count` | counter | `agent:*, error:*` |
| `carouselflow.generation.count` | counter | `status:*` |
| `carouselflow.api.request_duration_ms` | histogram | `endpoint:*, status:*` |

All metrics fall back to `console.log` when Datadog Agent is not available.

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/health` | Health check + demo mode flag |
| `POST` | `/api/generate-carousel` | SSE — runs full 7-agent pipeline |
| `POST` | `/api/suggest-topics` | Returns 4 topic angles from content notes |
| `POST` | `/api/chat` | SSE chat with ClickHouse analytics data |
| `POST` | `/api/query` | Raw ClickHouse SQL passthrough |
| `POST` | `/api/projects` | Create project record |
| `GET`  | `/api/projects` | List all projects |
| `GET`  | `/api/projects/:id` | Project detail + slides |
| `GET`  | `/api/projects/:id/events` | Agent execution log |
| `POST` | `/api/analytics/event` | Record custom analytics event |
| `POST` | `/api/regen-image` | Re-generate image for a single slide |
| `POST` | `/api/init-db` | (Re)create ClickHouse tables + seed data |

### Generate carousel request

```json
POST /api/generate-carousel
{
  "topic": "Why most people fail at building habits",
  "content_notes": "paste your raw notes here...",
  "slide_count": 6,
  "brand_id": null,
  "style_hint": null,
  "reference_image": "data:image/jpeg;base64,..."
}
```

### SSE event types

```
pipeline_start   → { agent_count, sponsors }
agent_start      → { agent, sponsors }
thinking         → { agent, content }
agent_done       → { agent, data, duration_ms }
image_progress   → { slide, total, status, slide_data? }
carousel_ready   → { slides }
done             → { project_id, duration_ms }
error            → { message }
```

---

## File layout

```
carouselflow-ai/
├── server/
│   └── server.js              Express server — all routes + SSE orchestration
├── agents/
│   ├── orchestrator.js        Chains all 7 agents, manages SSE send
│   ├── researchAgent.js       Fact extraction + hook generation
│   ├── styleReferenceAgent.js Visual mood analysis
│   ├── designAgent.js         Palette + typography decisions (Claude)
│   ├── brandAgent.js          Voice + tone rules
│   ├── copywritingAgent.js    Slide copy + 3 title variants
│   ├── carouselEngine.js      Assembles + persists slides
│   └── imageGenAgent.js       Image fetch + 1080×1350 canvas render
├── sponsor/
│   ├── gemini.js              Gemini LLM client + demo mode mock engine
│   ├── claude.js              Claude client + design agent demo specs
│   ├── clickhouse.js          ClickHouse client + all domain helpers
│   ├── datadog.js             DogStatsD metrics (hot-shots)
│   └── imageGen.js            loremflickr fetch + deterministic lock
├── website/
│   └── index.html             Single-file frontend (vanilla JS + Canvas API)
├── database/
│   ├── schema.sql             ClickHouse DDL
│   └── seed.sql               Demo seed data
├── .env.example               All env vars with comments
└── package.json
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Server | Node.js 18+, Express 4, ES Modules |
| Streaming | Server-Sent Events (SSE) |
| LLM — content | Google Gemini 2.0 Flash (OpenAI-compatible) |
| LLM — design | Anthropic Claude 3.5 Sonnet |
| Database | ClickHouse (columnar, OLAP) |
| Metrics | Datadog DogStatsD via hot-shots |
| Images | loremflickr (deterministic lock per slide content) |
| Rendering | HTML5 Canvas API — 1080×1350 PNG |
| Frontend | Vanilla JS, no framework, single HTML file |

---

## Contributing

PRs welcome. Run `npm run dev` for hot-reload during development.

---

## License

MIT
