import OpenAI from 'openai'
import https from 'https'
import http from 'http'
import 'dotenv/config'

// OpenAI image generation sponsor integration.
// DEMO_MODE: fetches real photos from loremflickr (keyword-relevant) or picsum.
// Set OPENAI_API_KEY + DEMO_MODE=false for real AI-generated images.

const DEMO = () => process.env.DEMO_MODE === 'true' || !process.env.OPENAI_API_KEY
const MODEL = () => process.env.IMAGE_MODEL || 'gpt-image-1'

let _client = null
function getClient() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _client
}

// ── Keyword extraction ─────────────────────────────────────────────
// Derives search-friendly keywords from topic + image prompt for photo fetching.

const STOP = new Set([
  'dark','light','with','that','from','into','over','high','style','blue','black',
  'white','grey','neon','minimal','modern','abstract','cinematic','aesthetic',
  'photography','background','creative','artistic','bold','glow','atmosphere',
  'professional','digital','design','color','visual','minimal','clean','bright',
  'shot','image','photo','render','gradient','texture','pattern','flat','icon',
])

function extractKeywords(imagePrompt = '', topic = '') {
  const raw = `${topic} ${imagePrompt}`
  const words = raw
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP.has(w))
  const unique = [...new Set(words)].slice(0, 4)
  return unique.length ? unique.join(',') : 'professional,business,people'
}

// ── Free photo fetch ───────────────────────────────────────────────
// Follows redirects using Node built-in https/http.

function fetchDataUri(url, maxRedirects = 6) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'))
    const mod = url.startsWith('https:') ? https : http
    const req = mod.get(url, { timeout: 8000 }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        return fetchDataUri(res.headers.location, maxRedirects - 1).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
      const chunks = []
      res.on('data',  c => chunks.push(c))
      res.on('end',   () => {
        const mime = (res.headers['content-type'] || 'image/jpeg').split(';')[0]
        resolve(`data:${mime};base64,${Buffer.concat(chunks).toString('base64')}`)
      })
      res.on('error', reject)
    })
    req.on('error',   reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

// ── SVG atmospheric fallback (offline only) ────────────────────────

function makePlaceholderSvg(slideIndex, palette = {}) {
  const bg     = palette.bg     || '#0D0D0D'
  const accent = palette.accent || '#4F6EF7'
  const COMPS  = [
    { x1:22, y1:15, r1:68, x2:78, y2:85, r2:55 },
    { x1:80, y1:12, r1:60, x2:18, y2:82, r2:58 },
    { x1:15, y1:55, r1:62, x2:82, y2:28, r2:50 },
    { x1:60, y1:18, r1:65, x2:28, y2:78, r2:52 },
    { x1:38, y1:8,  r1:58, x2:68, y2:88, r2:60 },
    { x1:88, y1:45, r1:55, x2:10, y2:58, r2:58 },
  ]
  const c = COMPS[(slideIndex - 1) % COMPS.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
<defs>
  <linearGradient id="base" x1="0" y1="0" x2="0.15" y2="1">
    <stop offset="0%" stop-color="${bg}"/><stop offset="100%" stop-color="${bg}dd"/>
  </linearGradient>
  <radialGradient id="lk1" cx="${c.x1}%" cy="${c.y1}%" r="${c.r1}%">
    <stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/>
    <stop offset="45%" stop-color="${accent}" stop-opacity="0.09"/>
    <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="lk2" cx="${c.x2}%" cy="${c.y2}%" r="${c.r2}%">
    <stop offset="0%" stop-color="${accent}" stop-opacity="0.18"/>
    <stop offset="55%" stop-color="${accent}" stop-opacity="0.05"/>
    <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="vig" cx="50%" cy="45%" r="72%">
    <stop offset="30%" stop-color="black" stop-opacity="0"/>
    <stop offset="100%" stop-color="black" stop-opacity="0.82"/>
  </radialGradient>
</defs>
<rect width="1080" height="1350" fill="url(#base)"/>
<rect width="1080" height="1350" fill="url(#lk1)"/>
<rect width="1080" height="1350" fill="url(#lk2)"/>
<rect width="1080" height="1350" fill="url(#vig)"/>
</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

// ── Image generation ───────────────────────────────────────────────

export async function generateImage(imagePrompt, { style, slideIndex = 1, topic = '', lock = null } = {}) {
  if (DEMO()) {
    const keywords = extractKeywords(imagePrompt, topic)
    const lockVal  = lock ?? slideIndex

    // loremflickr: keyword-relevant photos with stable lock per slot
    // picsum: reliable fallback with deterministic seed
    const sources = [
      `https://loremflickr.com/720/900/${keywords}?lock=${lockVal}`,
      `https://picsum.photos/seed/${lockVal * 37}/720/900`,
    ]

    for (const src of sources) {
      try {
        console.log(`[ImageGen] fetching: ${src.slice(0, 72)}…`)
        const dataUri = await fetchDataUri(src)
        console.log(`[ImageGen] ready: slide ${slideIndex}`)
        return { url: dataUri, demo: true }
      } catch (e) {
        console.warn(`[ImageGen] failed (${src.slice(0, 50)}): ${e.message}`)
      }
    }

    // Offline fallback
    console.warn(`[ImageGen] offline fallback for slide ${slideIndex}`)
    return { url: makePlaceholderSvg(slideIndex, style?.palette), demo: true }
  }

  // ── Real OpenAI generation ─────────────────────────────────────────
  const prompt = `${imagePrompt}. Cinematic, professional, photorealistic, no text, no watermarks.`
  try {
    const model = MODEL()
    if (model === 'gpt-image-1') {
      const response = await getClient().images.generate({
        model: 'gpt-image-1', prompt, n: 1, size: '1024x1024', output_format: 'jpeg',
      })
      return { url: `data:image/jpeg;base64,${response.data[0].b64_json}`, demo: false }
    }
    const response = await getClient().images.generate({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024' })
    return { url: response.data[0].url, demo: false }
  } catch (err) {
    console.warn('[ImageGen] generation failed:', err.message?.slice(0, 80))
    return { url: makePlaceholderSvg(slideIndex, style?.palette), demo: true, error: err.message }
  }
}

// ── Vision — analyze a reference image (GPT-4o) ────────────────────

export async function analyzeReferenceImage(dataUri) {
  if (!process.env.OPENAI_API_KEY) return null
  try {
    const res = await getClient().chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUri } },
          { type: 'text', text: 'Analyze this image as a visual style reference for social media carousel slides. Return ONLY valid JSON: { "palette": { "bg": "#hex", "accent": "#hex", "text": "#hex", "muted": "#hex" }, "typography": "font name", "tone": "brief tone", "visuals": "brief description" }' },
        ],
      }],
      max_tokens: 300,
    })
    const match = res.choices[0].message.content.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
  } catch (err) {
    console.warn('[Vision] reference analysis failed:', err.message?.slice(0, 80))
  }
  return null
}
