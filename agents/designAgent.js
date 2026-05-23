import { analyzeDesign } from '../sponsor/claude.js'
import { insertAgentEvent } from '../sponsor/clickhouse.js'
import { recordAgentRun } from '../sponsor/datadog.js'

export const SPONSORS = ['anthropic']

/**
 * Design Agent — uses Claude vision to analyse a reference image and produce
 * a layout/colour/typography specification used by the Image Gen agent.
 * Always runs: uses vision when referenceImage is present, text-only otherwise.
 */
export async function run({ projectId, referenceImage, topic, style }, send) {
  const start = Date.now()
  send({ type: 'agent_start', agent: 'design', sponsors: SPONSORS })

  const thinking = referenceImage
    ? 'Analysing reference image with Claude…'
    : 'Designing carousel layout with Claude…'
  send({ type: 'thinking', agent: 'design', content: thinking })

  const designSpec = await analyzeDesign(referenceImage, topic, style)

  const duration = Date.now() - start
  await insertAgentEvent(projectId, 'design', 'done', designSpec, 'anthropic', duration)
  recordAgentRun('design', duration)

  const summary = `${designSpec.layout} · ${designSpec.mood}`
  send({ type: 'thinking', agent: 'design', content: summary })
  send({ type: 'agent_done', agent: 'design', data: designSpec, duration_ms: duration })

  return designSpec
}
