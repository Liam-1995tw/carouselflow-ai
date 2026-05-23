import OpenAI from 'openai'
import 'dotenv/config'

// DeepMind / Gemini sponsor integration.
// Uses Google Gemini via OpenAI-compatible endpoint.
// Set DEMO_MODE=true to run without an API key (returns realistic mock data).

let _client = null

function getClient() {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY || 'demo',
      baseURL: process.env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/',
    })
  }
  return _client
}

const MODEL = () => process.env.LLM_MODEL || 'gemini-2.0-flash'
const DEMO  = () => process.env.DEMO_MODE === 'true' || !process.env.GEMINI_API_KEY

// ── Streaming chat ─────────────────────────────────────────────────

export async function* streamChat(messages, { system } = {}) {
  if (DEMO()) {
    // Route by system prompt — each agent has a distinct one
    const combined = (system || '') + ' ' + (messages[messages.length - 1]?.content || '')
    yield* fakeDemoStream(combined)
    return
  }

  const fullMessages = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages

  const stream = await getClient().chat.completions.create({
    model: MODEL(),
    messages: fullMessages,
    stream: true,
    max_tokens: 2048,
  })

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || ''
    if (text) yield text
  }
}

export async function chat(messages, { system } = {}) {
  let full = ''
  for await (const chunk of streamChat(messages, { system })) {
    full += chunk
  }
  return full
}

// ── Demo mode — realistic per-agent mock responses ─────────────────
// Routing uses the system prompt which is unique per agent:
//   research   → "research specialist"
//   style      → "style director"
//   copywriter → "copywriter"
//   brand      → "brand guardian"
//   chat/other → analytical response

// ── Demo response generators (topic + content-aware) ──────────────

function parsePrompt(combined) {
  const topicMatch = combined.match(/Topic:\s*"?([^\n"]+)"?/)
  const topic = topicMatch ? topicMatch[1].trim() : 'this topic'
  const notesMatch = combined.match(/Reference content from the author:\n([\s\S]*?)(?:\nNarrative:|$)/)
  const notes = notesMatch ? notesMatch[1].trim().slice(0, 800) : ''
  return { topic, notes }
}

// Strip common markdown symbols from text
function stripMd(text) {
  return (text || '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
}

function notesSentences(notes) {
  return notes
    ? notes.split(/(?<=[.!?])\s+|[\n]/).map(s => stripMd(s).trim()).filter(s => s.length > 15)
    : []
}

function clean(arr, i, fallback) {
  return stripMd(arr[i] || fallback).replace(/"/g, "'").slice(0, 100)
}

// Generate 3 title variants: statement / curiosity question / personal hook
function titleOptions(base, topic, idx) {
  const t  = stripMd(base).replace(/"/g, "'").slice(0, 100)
  const t2 = idx === 0
    ? `What everyone gets wrong about ${topic.slice(0, 35)}.`
    : `Why does this matter more than you think?`
  const t3 = idx === 0
    ? `I changed my mind about this. Here's why.`
    : `I learned this the hard way — so you don't have to.`
  return [t, t2, t3]
}

function demoResearch(topic, notes) {
  const lines = notesSentences(notes)
  return JSON.stringify({
    facts: [
      lines[0] || `${topic} is reshaping how professionals think about their field`,
      lines[1] || `The conventional approach to ${topic} leaves significant value on the table`,
      lines[2] || `Early adopters of these insights are pulling ahead quickly`,
      lines[3] || `Consistency and community beat credentials in this space`,
    ],
    audience: `Professionals, founders, and creators exploring ${topic}`,
    hooks: [
      `What I learned about ${topic} that changed everything`,
      `The ${topic} playbook nobody talks about`,
      `Stop approaching ${topic} the old way`,
    ],
    narrative: notes
      ? stripMd(notes).slice(0, 250)
      : `A contrarian take on ${topic} — what lived experience and data both reveal`,
  })
}

function demoCopy(topic, notes) {
  const lines = notesSentences(notes)
  const slides = [
    { base: clean(lines, 0, `${topic} is not what most people think.`),
      body: `This single insight took time to learn — and it changes everything about how you approach it.`,
      image_prompt: `Dramatic opening visual for ${topic}, dark cinematic background, bold typography, high contrast` },
    { base: clean(lines, 1, `The old playbook for ${topic} is broken.`),
      body: `What worked before no longer applies. Here's what's actually driving results now.`,
      image_prompt: `Transformation and momentum for ${topic}, dynamic composition, modern professional aesthetic` },
    { base: clean(lines, 2, `Most people are asking the wrong question about ${topic}.`),
      body: `Shift the frame and the answer becomes obvious. The insight was hiding in plain sight.`,
      image_prompt: `Clarity and insight visual for ${topic}, clean minimal aesthetic, strong focal point` },
    { base: clean(lines, 3, `The gap between knowing and doing is where ${topic} gets won.`),
      body: `Theory is everywhere. Consistent execution is rare. That's the real edge.`,
      image_prompt: `Action and forward motion for ${topic}, professional setting, cinematic quality` },
    { base: clean(lines, 4, `Start with one thing. Build from there.`),
      body: `The biggest mistake is trying to do everything. Pick the highest-leverage action first.`,
      image_prompt: `Focus and clarity image for ${topic}, single strong element, dark minimal background` },
    { base: `Want the full breakdown on ${topic.slice(0, 40)}?`,
      body: `Follow for deeper insights every week. Drop a comment with your biggest challenge.`,
      image_prompt: `Bold call-to-action slide, forward momentum, strong contrast, brand accent colour` },
  ]
  return JSON.stringify(slides.map((sl, i) => ({
    index: i + 1,
    title: sl.base,
    title_options: titleOptions(sl.base, topic, i),
    body: sl.body,
    image_prompt: sl.image_prompt,
  })))
}

function demoStyle(topic) {
  return JSON.stringify({
    palette: { bg:'#0D0D0D', accent:'#4F6EF7', text:'#FFFFFF', muted:'#9CA3AF' },
    typography: 'Inter',
    layout: 'story-driven',
    tone: 'direct and insightful',
    visuals: `Bold dark slides for ${topic}, high-contrast typography, cinematic imagery`,
  })
}

function demoBrand(topic) {
  return JSON.stringify({
    voice: `Authoritative yet accessible — built for ${topic}`,
    colors: ['#4F6EF7', '#0D0D0D', '#FFFFFF'],
    guidelines: `Lead with personal insight. Short punchy sentences. End with clear CTA for ${topic}.`,
    dos: ['Use first-person authority', 'Keep sentences short and punchy', 'Ground claims in lived experience'],
    donts: ['Avoid vague generalities', 'No passive voice', 'Never skip the hook'],
  })
}

const DEMO_CHAT = `I can see your CarouselFlow AI data. Here's a quick summary:\n\n\`\`\`sql\nSELECT id, topic, status, slide_count FROM carousel_projects ORDER BY created_at DESC LIMIT 5\n\`\`\`\n\nYour pipeline has processed carousel projects using 5 AI agents. The Research and Copywriting agents typically take the longest (900-1200ms each).`

// ── Topic suggestion (exported) ────────────────────────────────────

function demoTopicSuggestions(notes) {
  const sentences = notes
    .split(/(?<=[.!?])\s+|[\n]+/)
    .map(s => stripMd(s).trim())
    .filter(s => s.length > 20)

  const first = (sentences[0] || notes.slice(0, 80)).replace(/[.!?,;]$/, '').trim()
  const kw    = first.split(' ').slice(0, 5).join(' ').toLowerCase().slice(0, 38)

  return [
    { topic: first.slice(0, 72), angle: 'Direct' },
    { topic: `What nobody tells you about ${kw}`, angle: 'Curiosity' },
    { topic: `${Math.min(sentences.length + 2, 7)} lessons from ${kw.slice(0, 28)}`, angle: 'Lessons' },
    { topic: `How to approach ${kw} differently`, angle: 'How-to' },
  ]
}

export async function suggestTopics(contentNotes) {
  if (DEMO()) {
    await new Promise(r => setTimeout(r, 180))
    return demoTopicSuggestions(contentNotes)
  }
  const SYSTEM = `Given content notes, extract 4 distinct optimized topic angles for a social media carousel. Return ONLY valid JSON array: [{"topic": string, "angle": string}] — topic is 6-12 words, angle is 2-3 words describing the framing. No markdown.`
  const raw = await chat(
    [{ role: 'user', content: `Extract carousel topic angles:\n\n${contentNotes}` }],
    { system: SYSTEM }
  )
  const match = raw.match(/\[[\s\S]*\]/)
  if (match) { try { return JSON.parse(match[0]) } catch {} }
  return demoTopicSuggestions(contentNotes)
}

async function* fakeDemoStream(combined) {
  const lower = combined.toLowerCase()
  const { topic, notes } = parsePrompt(combined)

  let text
  if      (lower.includes('research specialist')) text = demoResearch(topic, notes)
  else if (lower.includes('style director'))       text = demoStyle(topic)
  else if (lower.includes('copywriter'))           text = demoCopy(topic, notes)
  else if (lower.includes('brand guardian'))       text = demoBrand(topic)
  else                                             text = DEMO_CHAT

  const CHUNK = 20
  for (let i = 0; i < text.length; i += CHUNK) {
    yield text.slice(i, i + CHUNK)
    await new Promise(r => setTimeout(r, 8))
  }
}
