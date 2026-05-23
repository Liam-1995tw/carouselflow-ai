import { chat } from '../sponsor/gemini.js'
import { analyzeReferenceImage } from '../sponsor/imageGen.js'
import { insertAgentEvent, query, insert } from '../sponsor/clickhouse.js'
import { recordAgentRun, recordError } from '../sponsor/datadog.js'

const SYSTEM = `You are a visual & tone style director for social media carousels.
Return ONLY valid JSON: {
  palette: { bg: string, accent: string, text: string, muted: string },
  typography: string,
  layout: string,
  tone: string,
  visuals: string
}`

export const SPONSORS = ['deepmind', 'clickhouse']

export async function run({ topic, research, styleHint, referenceImage, projectId }, send) {
  const start = Date.now()
  send({ type: 'agent_start', agent: 'style_reference', sponsors: SPONSORS })

  let parsed = {
    palette: { bg: '#0D0D0D', accent: '#4F6EF7', text: '#FFFFFF', muted: '#9CA3AF' },
    typography: 'Inter',
    layout: 'story-driven',
    tone: 'inspirational and direct',
    visuals: 'Clean dark slides with bold typography',
  }

  try {
    // If a reference image was uploaded, analyze it with GPT-4o vision
    if (referenceImage) {
      send({ type: 'thinking', agent: 'style_reference', content: 'Analyzing reference image…' })
      const visionStyle = await analyzeReferenceImage(referenceImage)
      if (visionStyle) {
        parsed = { ...parsed, ...visionStyle }
        send({ type: 'thinking', agent: 'style_reference', content: 'Reference image style extracted ✓' })
      }
    }

    // Pull existing style profiles from ClickHouse for context
    let existingProfiles = []
    try {
      existingProfiles = await query('SELECT name, tone, typography FROM style_profiles LIMIT 5')
    } catch (_) {}

    send({ type: 'thinking', agent: 'style_reference', content: 'Determining visual direction...' })

    const prompt = [
      `Topic: ${topic}`,
      styleHint ? `Preferred style: ${styleHint}` : '',
      research?.narrative ? `Narrative: ${research.narrative}` : '',
    ].filter(Boolean).join('\n')

    const raw = await chat(
      [{ role: 'user', content: prompt }],
      { system: SYSTEM }
    )

    const match = raw.match(/\{[\s\S]*\}/)
    if (match) parsed = JSON.parse(match[0])

    // Store to ClickHouse style_profiles
    try {
      await insert('style_profiles', [{
        name: `${topic.slice(0, 40)} style`,
        palette: JSON.stringify(parsed.palette),
        typography: parsed.typography,
        tone: parsed.tone,
      }])
    } catch (_) {}

    const duration = Date.now() - start
    await insertAgentEvent(projectId, 'style_reference', 'done', parsed, 'deepmind', duration)
    recordAgentRun('style_reference', duration)

    send({ type: 'agent_done', agent: 'style_reference', data: parsed, duration_ms: duration })
    return parsed
  } catch (err) {
    recordError('style_reference', err.constructor.name)
    await insertAgentEvent(projectId, 'style_reference', 'error', err.message, 'deepmind', Date.now() - start)
    send({ type: 'agent_error', agent: 'style_reference', error: err.message })
    return parsed
  }
}
