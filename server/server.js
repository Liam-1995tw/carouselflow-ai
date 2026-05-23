import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

import { query, insert, insertAnalyticsEvent, getClient, checkAvailability, exec } from '../sponsor/clickhouse.js'
import { streamChat, suggestTopics } from '../sponsor/gemini.js'
import { recordApiRequest } from '../sponsor/datadog.js'
import { run as runPipeline } from '../agents/orchestrator.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.static(path.join(__dirname, '../website')))

// ── SSE helper ────────────────────────────────────────────────────

function sseSetup(res) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  if (res.socket) res.socket.setNoDelay(true)
  res.flushHeaders()
  return (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
    if (typeof res.flush === 'function') res.flush()
  }
}

// ── Request timing middleware ─────────────────────────────────────

app.use((req, _res, next) => {
  req._startTime = Date.now()
  next()
})

// ── Health ────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'carouselflow-ai', demo: process.env.DEMO_MODE === 'true' })
})

// ── /api/query — raw ClickHouse SQL (mirrors demonstrator) ────────

app.post('/api/query', async (req, res) => {
  const { sql } = req.body
  if (!sql) return res.status(400).json({ error: 'sql is required' })
  try {
    const rows = await query(sql)
    res.json({ rows, count: rows.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── /api/chat — SSE chat with ClickHouse tool (mirrors demonstrator) ──

app.post('/api/chat', async (req, res) => {
  const { message, history = [] } = req.body
  if (!message) return res.status(400).json({ error: 'message is required' })

  const send = sseSetup(res)

  const SYSTEM = `You are an AI analytics assistant for CarouselFlow AI.
You help users understand their carousel generation data stored in ClickHouse.
Available tables: carousel_projects, generated_slides, agent_events, analytics_events, style_profiles.
When asked about data, write and execute ClickHouse SQL queries.
Always explain your findings in plain language.`

  const tools = [{
    type: 'function',
    function: {
      name: 'query_clickhouse',
      description: 'Execute a ClickHouse SQL query against the CarouselFlow database',
      parameters: {
        type: 'object',
        properties: { sql: { type: 'string', description: 'ClickHouse SQL to execute' } },
        required: ['sql'],
      },
    },
  }]

  const messages = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ]

  try {
    let fullText = ''

    // Agentic loop (up to 6 rounds like the demonstrator)
    for (let i = 0; i < 6; i++) {
      let responseText = ''
      let toolCalls = []

      // Stream LLM response
      for await (const chunk of streamChat(messages, { system: SYSTEM })) {
        responseText += chunk
        send({ type: 'text', content: chunk })
      }

      // Simple tool call detection from streamed text
      const sqlMatch = responseText.match(/```sql\n([\s\S]*?)```/)
      if (sqlMatch) {
        const sql = sqlMatch[1].trim()
        send({ type: 'query_start', sql })
        try {
          const rows = await query(sql)
          send({ type: 'query_done', rows: rows.slice(0, 50), count: rows.length })
          messages.push({ role: 'assistant', content: responseText })
          messages.push({
            role: 'user',
            content: `Query returned ${rows.length} rows: ${JSON.stringify(rows.slice(0, 10))}. Continue your analysis.`,
          })
          continue
        } catch (qErr) {
          send({ type: 'query_done', error: qErr.message, rows: [] })
        }
      }

      fullText += responseText
      break
    }

    send({ type: 'done' })
    res.end()
  } catch (err) {
    send({ type: 'error', message: err.message })
    res.end()
  }
})

// ── /api/projects — create a project ─────────────────────────────

app.post('/api/projects', async (req, res) => {
  const { topic, brand_id, style, slide_count = 6 } = req.body
  if (!topic) return res.status(400).json({ error: 'topic is required' })

  const id = `proj_${uuidv4().replace(/-/g, '').slice(0, 12)}`
  try {
    await insert('carousel_projects', [{
      id, topic, status: 'pending',
      brand_id: brand_id || '',
      style: style || '',
      slide_count,
    }])
    await insertAnalyticsEvent('project_created', id, { topic })
    res.json({ id, topic, status: 'pending' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── /api/generate-carousel — SSE pipeline ─────────────────────────

app.post('/api/generate-carousel', async (req, res) => {
  const { topic, project_id, brand_id, style, slide_count = 6, reference_image, content_notes } = req.body
  if (!topic) return res.status(400).json({ error: 'topic is required' })

  const projectId = project_id || `proj_${uuidv4().replace(/-/g, '').slice(0, 12)}`
  const send = sseSetup(res)

  send({ type: 'pipeline_start', projectId, topic, agents: 7 })

  try {
    await runPipeline({
      projectId,
      topic,
      brandId: brand_id,
      styleHint: style,
      slideCount: slide_count,
      referenceImage: reference_image || null,
      contentNotes: content_notes || '',
    }, send)
  } catch (err) {
    send({ type: 'error', message: err.message })
  }

  res.end()
  recordApiRequest('/api/generate-carousel', 200, Date.now() - req._startTime)
})

// ── /api/regenerate-image ─────────────────────────────────────────

app.post('/api/regenerate-image', async (req, res) => {
  const { prompt, slide_index = 1, topic = '', lock } = req.body
  if (!prompt) return res.status(400).json({ error: 'prompt is required' })
  try {
    const { generateImage } = await import('../sponsor/imageGen.js')
    const lockVal = lock ?? Math.floor(Math.random() * 9000) + 1000
    const result = await generateImage(prompt, { slideIndex: slide_index, topic, lock: lockVal })
    res.json({ url: result.url, demo: result.demo })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── /api/upload-style-reference ───────────────────────────────────

app.post('/api/upload-style-reference', async (req, res) => {
  const { name, palette, typography, tone } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  try {
    await insert('style_profiles', [{
      name,
      palette: typeof palette === 'string' ? palette : JSON.stringify(palette || {}),
      typography: typography || 'Inter',
      tone: tone || '',
    }])
    res.json({ ok: true, name })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── /api/suggest-topics ───────────────────────────────────────────

app.post('/api/suggest-topics', async (req, res) => {
  const { content_notes } = req.body
  if (!content_notes || content_notes.trim().length < 20) {
    return res.status(400).json({ error: 'content_notes too short' })
  }
  try {
    const suggestions = await suggestTopics(content_notes)
    res.json({ suggestions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── /api/analytics/event ──────────────────────────────────────────

app.post('/api/analytics/event', async (req, res) => {
  const { event_name, project_id, properties } = req.body
  if (!event_name) return res.status(400).json({ error: 'event_name is required' })
  try {
    await insertAnalyticsEvent(event_name, project_id || '', properties || {})
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── /api/projects/:id ─────────────────────────────────────────────

app.get('/api/projects/:id', async (req, res) => {
  try {
    const [project] = await query(
      `SELECT * FROM carousel_projects WHERE id = '${req.params.id}' LIMIT 1`
    )
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const slides = await query(
      `SELECT * FROM generated_slides WHERE project_id = '${req.params.id}' ORDER BY slide_index`
    )
    res.json({ ...project, slides })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── /api/projects/:id/events ──────────────────────────────────────

app.get('/api/projects/:id/events', async (req, res) => {
  try {
    const events = await query(`
      SELECT agent_name, event_type, content, sponsor, duration_ms, created_at
      FROM agent_events
      WHERE project_id = '${req.params.id}'
      ORDER BY created_at ASC
    `)
    res.json({ events })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── /api/projects — list all ──────────────────────────────────────

app.get('/api/projects', async (_req, res) => {
  try {
    const projects = await query(`
      SELECT id, topic, status, slide_count, created_at
      FROM carousel_projects
      ORDER BY created_at DESC
      LIMIT 20
    `)
    res.json({ projects })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── /api/analytics/summary ────────────────────────────────────────

app.get('/api/analytics/summary', async (_req, res) => {
  try {
    const [totals] = await query(`
      SELECT
        countIf(status = 'done')    AS completed,
        countIf(status = 'running') AS running,
        countIf(status = 'error')   AS errors,
        count()                     AS total
      FROM carousel_projects
    `).catch(() => [{ completed: 0, running: 0, errors: 0, total: 0 }])

    const agentStats = await query(`
      SELECT agent_name, avg(duration_ms) AS avg_ms, count() AS runs
      FROM agent_events WHERE event_type = 'done'
      GROUP BY agent_name ORDER BY agent_name
    `).catch(() => [])

    res.json({ totals, agentStats })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── /api/init-db — create tables + seed demo data ────────────────

app.post('/api/init-db', async (_req, res) => {
  try {
    await initDbTables()
    res.json({ ok: true, message: 'Database initialized with demo data' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

async function seedDemoProject() {
  const DEMO_ID = 'proj_demo_001'

  // Check if already seeded
  const existing = await query(
    `SELECT id FROM carousel_projects WHERE id = '${DEMO_ID}' LIMIT 1`
  ).catch(() => [])
  if (existing.length) return

  await insert('carousel_projects', [{
    id: DEMO_ID,
    topic: 'Founder lessons from NYC networking',
    status: 'done',
    brand_id: '',
    style: 'dark',
    slide_count: 6,
  }])

  const slides = [
    { title: "You don't need to be an engineer to build anymore.", body: 'AI tools have made it possible for anyone to create products, workflows, and businesses without writing a single line of code.', image_prompt: 'Person confidently building at laptop, neon blue glow, dark aesthetic' },
    { title: 'AI tools are lowering the barrier.', body: 'No-code, AI-assisted workflows are replacing the 6-month MVP timeline. What took a team now takes an afternoon.', image_prompt: 'Speed lines, floating digital tools, dark background, modern' },
    { title: 'The real edge is showing up consistently.', body: 'I watched underdogs outpace funded teams — just by shipping daily and iterating in public.', image_prompt: 'Clock with forward motion, upward trajectory, minimal' },
    { title: "I saw artists, lawyers, creators, and founders building together.", body: "NYC networking wasn't just tech bros. It was a convergence of disciplines using the same AI tools.", image_prompt: 'Diverse group collaborating, city skyline at night' },
    { title: 'Start with one small workflow.', body: 'One automated task becomes a product. A product becomes a business. Start with what you do manually today.', image_prompt: 'Single domino falling, chain reaction, dark minimalist' },
    { title: 'Comment BUILD if you want the workflow.', body: 'Follow for weekly AI tools breakdowns for non-technical builders. New post every Tuesday.', image_prompt: 'Bold CTA slide, arrow pointing forward, brand blue accent' },
  ]

  for (let i = 0; i < slides.length; i++) {
    await insert('generated_slides', [{
      project_id: DEMO_ID,
      slide_index: i + 1,
      ...slides[i],
      bg_color: '#0D0D0D',
      accent: '#4F6EF7',
      text_color: '#FFFFFF',
      font: 'Inter',
    }])
  }

  // Seed agent events for the demo project
  const agentNames = ['research', 'style_reference', 'brand', 'copywriting', 'carousel_engine']
  const sponsors = ['deepmind', 'deepmind', 'deepmind', 'deepmind', 'clickhouse']
  for (let i = 0; i < agentNames.length; i++) {
    await insert('agent_events', [{
      project_id: DEMO_ID,
      agent_name: agentNames[i],
      event_type: 'done',
      content: 'Completed successfully',
      sponsor: sponsors[i],
      duration_ms: 800 + i * 200,
      tokens_used: 400 + i * 100,
    }])
  }
}

// ── DB init (called directly on startup, no self-HTTP) ───────────

async function initDbTables() {
  const ddl = [
    `CREATE TABLE IF NOT EXISTS carousel_projects (
      id String, topic String, status LowCardinality(String),
      brand_id String DEFAULT '', style String DEFAULT '',
      slide_count UInt8 DEFAULT 6,
      created_at DateTime DEFAULT now(),
      completed_at Nullable(DateTime)
    ) ENGINE = ReplacingMergeTree() ORDER BY (created_at, id)`,

    `CREATE TABLE IF NOT EXISTS agent_events (
      project_id String, agent_name LowCardinality(String),
      event_type LowCardinality(String), content String,
      sponsor LowCardinality(String) DEFAULT '',
      duration_ms UInt32 DEFAULT 0, tokens_used UInt32 DEFAULT 0,
      created_at DateTime DEFAULT now()
    ) ENGINE = MergeTree() ORDER BY (created_at, project_id, agent_name)`,

    `CREATE TABLE IF NOT EXISTS generated_slides (
      project_id String, slide_index UInt8,
      title String, body String, image_prompt String DEFAULT '',
      bg_color String DEFAULT '#0D0D0D', accent String DEFAULT '#4F6EF7',
      text_color String DEFAULT '#FFFFFF', font String DEFAULT 'Inter',
      created_at DateTime DEFAULT now()
    ) ENGINE = MergeTree() ORDER BY (project_id, slide_index)`,

    `CREATE TABLE IF NOT EXISTS style_profiles (
      name String, palette String, typography String, tone String,
      created_at DateTime DEFAULT now()
    ) ENGINE = MergeTree() ORDER BY created_at`,

    `CREATE TABLE IF NOT EXISTS analytics_events (
      event_name LowCardinality(String), project_id String DEFAULT '',
      properties String DEFAULT '{}',
      created_at DateTime DEFAULT now()
    ) ENGINE = MergeTree() ORDER BY created_at`,
  ]
  for (const sql of ddl) await exec(sql)
  await seedDemoProject()
}

// ── Start ─────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001

app.listen(PORT, async () => {
  console.log(`\nCarouselFlow AI  →  http://localhost:${PORT}`)
  console.log(`Demo mode : ${process.env.DEMO_MODE === 'true' ? 'ON  (no API key needed)' : 'OFF'}`)

  const chUp = await checkAvailability()
  if (chUp) {
    console.log('ClickHouse: connected')
    try {
      await initDbTables()
      console.log('ClickHouse: tables ready, demo data seeded')
    } catch (e) {
      console.log('ClickHouse: init failed —', e.message?.split('\n')[0])
    }
  } else {
    console.log('ClickHouse: offline — no-DB mode, pipeline + UI fully work')
  }
})
