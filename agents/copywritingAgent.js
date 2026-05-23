import { chat } from '../sponsor/gemini.js'
import { insertAgentEvent } from '../sponsor/clickhouse.js'
import { recordAgentRun, recordError } from '../sponsor/datadog.js'

const SYSTEM = `You are an expert social media copywriter for carousel posts.
Rules:
- Slide 1: Hook headline (stop-scroll worthy, max 12 words)
- Slides 2 to N-1: One insight per slide, punchy body (max 35 words)
- Last slide: Clear CTA
- No markdown symbols (no #, **, -, *, >, backticks) in any text
- For each slide provide 3 title variants: statement, curiosity question, personal hook

Return ONLY a valid JSON array:
[{ "index": number, "title": string, "title_options": [string, string, string], "body": string, "image_prompt": string }]`

export const SPONSORS = ['deepmind', 'clickhouse']

export async function run({ topic, research, style, brand, slideCount = 6, projectId, contentNotes = '' }, send) {
  const start = Date.now()
  send({ type: 'agent_start', agent: 'copywriting', sponsors: SPONSORS })

  let slides = []

  try {
    send({ type: 'thinking', agent: 'copywriting', content: `Writing ${slideCount} slides...` })

    const context = [
      `Topic: ${topic}`,
      contentNotes ? `Reference content from the author:\n${contentNotes}` : '',
      research?.narrative ? `Narrative: ${research.narrative}` : '',
      research?.hooks?.length ? `Hook angles: ${research.hooks.join(', ')}` : '',
      style?.tone ? `Tone: ${style.tone}` : '',
      brand?.voice ? `Brand voice: ${brand.voice}` : '',
      `Slide count: ${slideCount}`,
    ].filter(Boolean).join('\n')

    const raw = await chat(
      [{ role: 'user', content: context }],
      { system: SYSTEM }
    )

    const match = raw.match(/\[[\s\S]*\]/)
    if (match) slides = JSON.parse(match[0])

    const duration = Date.now() - start
    await insertAgentEvent(projectId, 'copywriting', 'done', { slide_count: slides.length }, 'deepmind', duration)
    recordAgentRun('copywriting', duration)

    send({ type: 'agent_done', agent: 'copywriting', data: { slides }, duration_ms: duration })
    return { slides }
  } catch (err) {
    recordError('copywriting', err.constructor.name)
    await insertAgentEvent(projectId, 'copywriting', 'error', err.message, 'deepmind', Date.now() - start)
    send({ type: 'agent_error', agent: 'copywriting', error: err.message })
    return { slides }
  }
}
