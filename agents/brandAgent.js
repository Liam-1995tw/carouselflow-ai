import { chat } from '../sponsor/gemini.js'
import { insertAgentEvent } from '../sponsor/clickhouse.js'
import { recordAgentRun, recordError } from '../sponsor/datadog.js'

const SYSTEM = `You are a brand guardian for social media content.
Return ONLY valid JSON: {
  voice: string,
  colors: string[],
  guidelines: string,
  dos: string[],
  donts: string[]
}`

export const SPONSORS = ['deepmind']

export async function run({ brandId, topic, research, projectId }, send) {
  const start = Date.now()
  send({ type: 'agent_start', agent: 'brand', sponsors: SPONSORS })

  const defaultBrand = {
    voice: 'Professional, direct, and inspirational',
    colors: ['#4F6EF7', '#0D0D0D', '#FFFFFF'],
    guidelines: 'Lead with value. Short sentences. Strong CTA.',
    dos: ['Use data-backed claims', 'Keep it scannable', 'End with action'],
    donts: ['Avoid passive voice', 'No jargon', 'Never skip the hook'],
  }

  if (!brandId) {
    const duration = Date.now() - start
    send({ type: 'agent_done', agent: 'brand', data: defaultBrand, duration_ms: duration })
    await insertAgentEvent(projectId, 'brand', 'done', defaultBrand, 'deepmind', duration)
    recordAgentRun('brand', duration)
    return defaultBrand
  }

  try {
    send({ type: 'thinking', agent: 'brand', content: `Loading brand guidelines for: ${brandId}` })

    const raw = await chat(
      [{ role: 'user', content: `Define brand guidelines for a creator/founder brand called "${brandId}" focused on "${topic}".` }],
      { system: SYSTEM }
    )

    const match = raw.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : defaultBrand

    const duration = Date.now() - start
    await insertAgentEvent(projectId, 'brand', 'done', parsed, 'deepmind', duration)
    recordAgentRun('brand', duration)

    send({ type: 'agent_done', agent: 'brand', data: parsed, duration_ms: duration })
    return parsed
  } catch (err) {
    recordError('brand', err.constructor.name)
    send({ type: 'agent_error', agent: 'brand', error: err.message })
    return defaultBrand
  }
}
