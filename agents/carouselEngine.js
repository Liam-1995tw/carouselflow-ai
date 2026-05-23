import { insertSlide, insertAgentEvent } from '../sponsor/clickhouse.js'
import { recordAgentRun } from '../sponsor/datadog.js'

export const SPONSORS = ['clickhouse']

export async function run({ projectId, slides, style, brand }, send) {
  const start = Date.now()
  send({ type: 'agent_start', agent: 'carousel_engine', sponsors: SPONSORS })

  const stripMd = t => (t || '').replace(/^#{1,6}\s+/gm,'').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/\*([^*]+)\*/g,'$1').replace(/^[-*+]\s+/gm,'').replace(/^>\s+/gm,'').replace(/`([^`]+)`/g,'$1').trim()

  const assembled = slides.map((s, i) => ({
    slide_index: s.index || i + 1,
    title: stripMd(s.title || ''),
    title_options: (s.title_options || [s.title || '']).map(stripMd),
    body: stripMd(s.body || ''),
    image_prompt: s.image_prompt || '',
    bg_color: style?.palette?.bg || '#0D0D0D',
    accent: style?.palette?.accent || '#4F6EF7',
    text_color: style?.palette?.text || '#FFFFFF',
    font: style?.typography || 'Inter',
  }))

  // Persist each slide to ClickHouse
  for (const slide of assembled) {
    await insertSlide(projectId, slide)
  }

  const duration = Date.now() - start
  await insertAgentEvent(projectId, 'carousel_engine', 'done', { slide_count: assembled.length }, 'clickhouse', duration)
  recordAgentRun('carousel_engine', duration)

  send({ type: 'agent_done', agent: 'carousel_engine', data: { slides: assembled }, duration_ms: duration })
  return assembled
}
