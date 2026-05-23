import { generateImage } from '../sponsor/imageGen.js'
import { insertAgentEvent } from '../sponsor/clickhouse.js'
import { recordAgentRun } from '../sponsor/datadog.js'

export const SPONSORS = ['openai']

// FNV-1a 32-bit hash → maps slide content to a stable loremflickr lock (1000–9999)
function contentHash(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return (h % 9000) + 1000
}

/**
 * Image Gen Agent — generates one image per slide, sequentially.
 * Emits image_progress events so the UI can show per-slide progress.
 * Uses designSpec.image_style (from Claude Design Agent) to guide prompts.
 */
export async function run({ projectId, slides, style, designSpec, topic = '' }, send) {
  const start = Date.now()
  send({ type: 'agent_start', agent: 'image_gen', sponsors: SPONSORS })
  send({ type: 'thinking', agent: 'image_gen', content: `Generating ${slides.length} images…` })

  // Effective palette — prefer design spec colours over style palette
  const palette = designSpec?.color_scheme
    ? {
        bg:     designSpec.color_scheme.bg,
        accent: designSpec.color_scheme.primary,
        text:   designSpec.color_scheme.text,
        muted:  designSpec.color_scheme.muted,
      }
    : style?.palette

  const result = []

  for (let i = 0; i < slides.length; i++) {
    const slide    = slides[i]
    const slideNum = slide.slide_index || i + 1

    // Notify UI that this slide is being generated
    send({ type: 'image_progress', slide: slideNum, total: slides.length, status: 'generating' })
    send({ type: 'thinking', agent: 'image_gen', content: `Image ${slideNum}/${slides.length}…` })

    // Enhance the prompt with Claude's image style guidance
    const styleGuide = designSpec?.image_style ? ` ${designSpec.image_style}` : ''
    const prompt     = `${slide.image_prompt || slide.title}.${styleGuide}`

    // Deterministic lock from slide content — same content → same photo, different content → different photo
    const lock = contentHash(`${topic}|${slide.title}|${slide.image_prompt || ''}`)
    const { url } = await generateImage(prompt, { style: { palette }, slideIndex: slideNum, topic, lock })
    const slideWithImage = { ...slide, image_url: url }
    result.push(slideWithImage)

    // Notify UI that this slide's image is ready
    send({ type: 'image_progress', slide: slideNum, total: slides.length, status: 'done', slide_data: slideWithImage })
  }

  const duration = Date.now() - start
  await insertAgentEvent(projectId, 'image_gen', 'done', { count: result.length }, 'openai', duration)
  recordAgentRun('image_gen', duration)

  send({ type: 'agent_done', agent: 'image_gen', data: { images: result.length }, duration_ms: duration })
  return result
}
