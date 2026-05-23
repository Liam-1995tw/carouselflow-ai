import { chat } from '../sponsor/gemini.js'
import { insertAgentEvent } from '../sponsor/clickhouse.js'
import { recordAgentRun, recordError } from '../sponsor/datadog.js'

const SYSTEM = `You are a social media research specialist.
Given a topic, extract key facts, target audience signals, hook angles, and narrative arc.
Return ONLY valid JSON: { facts: string[], audience: string, hooks: string[], narrative: string }`

export const SPONSORS = ['deepmind', 'clickhouse']

export async function run({ topic, projectId, contentNotes = '' }, send) {
  const start = Date.now()
  send({ type: 'agent_start', agent: 'research', sponsors: SPONSORS })

  let parsed = { facts: [], audience: '', hooks: [], narrative: '' }

  try {
    send({ type: 'thinking', agent: 'research', content: `Researching: "${topic}"` })

    const userPrompt = contentNotes
      ? `Research this topic for a LinkedIn carousel: "${topic}"\n\nReference content from the author:\n${contentNotes}`
      : `Research this topic for a LinkedIn carousel: "${topic}"`

    const raw = await chat(
      [{ role: 'user', content: userPrompt }],
      { system: SYSTEM }
    )

    const match = raw.match(/\{[\s\S]*\}/)
    if (match) parsed = JSON.parse(match[0])

    const duration = Date.now() - start
    await insertAgentEvent(projectId, 'research', 'done', parsed, 'deepmind', duration)
    recordAgentRun('research', duration)

    send({ type: 'agent_done', agent: 'research', data: parsed, duration_ms: duration })
    return parsed
  } catch (err) {
    recordError('research', err.constructor.name)
    await insertAgentEvent(projectId, 'research', 'error', err.message, 'deepmind', Date.now() - start)
    send({ type: 'agent_error', agent: 'research', error: err.message })
    return parsed
  }
}
