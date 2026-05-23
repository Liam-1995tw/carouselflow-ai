import * as research from './researchAgent.js'
import * as style    from './styleReferenceAgent.js'
import * as design   from './designAgent.js'
import * as brand    from './brandAgent.js'
import * as copy     from './copywritingAgent.js'
import * as engine   from './carouselEngine.js'
import * as imageGen from './imageGenAgent.js'
import { recordGenerationJob } from '../sponsor/datadog.js'
import { upsertProject }       from '../sponsor/clickhouse.js'

/**
 * Runs the full 7-agent pipeline streaming SSE events via `send`.
 *
 * Pipeline:
 *   Research → Style Reference → Design (Claude) → Brand
 *   → Copywriting → Carousel Engine → Image Gen
 */
export async function run({ projectId, topic, brandId, styleHint, slideCount = 6, referenceImage, contentNotes = '' }, send) {
  const pipelineStart = Date.now()

  await upsertProject(projectId, topic, 'running', styleHint || '', slideCount)

  try {
    // 1 ── Research Agent
    const researchData = await research.run({ topic, projectId, contentNotes }, send)

    // 2 ── Style Reference Agent
    const styleData = await style.run({ topic, research: researchData, styleHint, referenceImage, projectId }, send)

    // 3 ── Design Agent (Claude vision / layout design)
    const designSpec = await design.run({ projectId, referenceImage, topic, style: styleData }, send)

    // 4 ── Brand Agent
    const brandData = await brand.run({ brandId, topic, research: researchData, projectId }, send)

    // 5 ── Copywriting Agent
    const copyData = await copy.run({
      topic,
      research:     researchData,
      style:        styleData,
      brand:        brandData,
      slideCount,
      projectId,
      contentNotes,
    }, send)

    // 6 ── Carousel Engine
    const slides = await engine.run({
      projectId,
      slides: copyData.slides,
      style:  styleData,
      brand:  brandData,
    }, send)

    // 7 ── Image Gen Agent  (uses Claude design spec for prompt guidance)
    const slidesWithImages = await imageGen.run({ projectId, slides, style: styleData, designSpec, topic }, send)

    const totalDuration = Date.now() - pipelineStart
    await upsertProject(projectId, topic, 'done', styleHint || '', slideCount)
    recordGenerationJob(projectId, 'success', totalDuration, slidesWithImages.length)

    send({ type: 'carousel_ready', projectId, slides: slidesWithImages, designSpec, duration_ms: totalDuration })
    send({ type: 'done' })
    return slidesWithImages
  } catch (err) {
    await upsertProject(projectId, topic, 'error', styleHint || '', slideCount)
    recordGenerationJob(projectId, 'error', Date.now() - pipelineStart, 0)
    send({ type: 'error', message: err.message })
    throw err
  }
}
