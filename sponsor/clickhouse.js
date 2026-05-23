import { createClient } from '@clickhouse/client'
import 'dotenv/config'

let _client = null
let _available = null   // null = untested, true = up, false = down

export function getClient() {
  if (!_client) {
    _client = createClient({
      url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      database: process.env.CLICKHOUSE_DB || 'carouselflow',
      request_timeout: 3000,   // fail fast — no 60s hangs when CH is offline
    })
  }
  return _client
}

// Called by server startup. Sets the _available flag so agents skip CH when offline.
export async function checkAvailability() {
  try {
    const { success } = await getClient().ping()
    _available = success === true
  } catch {
    _available = false
  }
  return _available
}

export function isAvailable() {
  return _available !== false   // true OR null (optimistic until first failure)
}

function markDown(err) {
  _available = false
  console.warn('[ClickHouse] offline:', err?.code || err?.message?.slice(0, 60))
}

// ── Core helpers ──────────────────────────────────────────────────

export async function query(sql) {
  if (!isAvailable()) return []
  try {
    const result = await getClient().query({ query: sql, format: 'JSONEachRow' })
    _available = true
    return result.json()
  } catch (e) {
    markDown(e)
    return []
  }
}

export async function insert(table, values) {
  if (!isAvailable()) return
  try {
    await getClient().insert({ table, values, format: 'JSONEachRow' })
    _available = true
  } catch (e) {
    markDown(e)
  }
}

export async function exec(sql) {
  if (!isAvailable()) return
  try {
    await getClient().exec({ query: sql })
    _available = true
  } catch (e) {
    markDown(e)
    throw e   // re-throw so init code can catch it
  }
}

// ── Domain helpers (silent-fail when CH is offline) ───────────────

export async function insertAgentEvent(projectId, agentName, eventType, content, sponsor = '', durationMs = 0, tokensUsed = 0) {
  await insert('agent_events', [{
    project_id: projectId,
    agent_name: agentName,
    event_type: eventType,
    content: typeof content === 'string' ? content : JSON.stringify(content),
    sponsor,
    duration_ms: durationMs,
    tokens_used: tokensUsed,
  }])
}

export async function insertSlide(projectId, slide) {
  await insert('generated_slides', [{
    project_id: projectId,
    slide_index: slide.slide_index || slide.index || 0,
    title: slide.title || '',
    body: slide.body || '',
    image_prompt: slide.image_prompt || '',
    bg_color: slide.bg_color || '#0D0D0D',
    accent: slide.accent || '#4F6EF7',
    text_color: slide.text_color || '#FFFFFF',
    font: slide.font || 'Inter',
  }])
}

export async function insertAnalyticsEvent(eventName, projectId = '', properties = {}) {
  await insert('analytics_events', [{
    event_name: eventName,
    project_id: projectId,
    properties: JSON.stringify(properties),
  }])
}

export async function upsertProject(id, topic, status = 'running', style = '', slideCount = 6) {
  await insert('carousel_projects', [{
    id, topic, status,
    brand_id: '',
    style,
    slide_count: slideCount,
  }])
}
