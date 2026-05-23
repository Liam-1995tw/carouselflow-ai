import Anthropic from '@anthropic-ai/sdk'
import 'dotenv/config'

// Claude / Anthropic sponsor integration.
// Used for visual design analysis — interprets reference images and designs carousel layouts.
// Set DEMO_MODE=true to run without an API key (returns realistic mock design spec).

const DEMO  = () => process.env.DEMO_MODE === 'true' || !process.env.ANTHROPIC_API_KEY
const MODEL = () => process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'

let _client = null
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

// ── Design prompts ─────────────────────────────────────────────────

const DESIGN_SYSTEM = `You are an expert visual designer specialising in social media carousel layouts.
Analyse the provided reference image (if any) and topic, then return a precise design specification.
Return ONLY valid JSON — no prose, no markdown fences.`

const DESIGN_SCHEMA = `{
  "layout": "image-dominant" | "balanced" | "text-dominant" | "minimal",
  "color_scheme": { "bg": "#hex", "primary": "#hex", "accent": "#hex", "text": "#hex", "muted": "#hex" },
  "typography": { "heading_style": "bold/clean/editorial…", "body_style": "readable…", "font": "font name" },
  "composition": "centered" | "left-aligned" | "dynamic",
  "mood": "brief 2–4 word mood description",
  "image_style": "30–50 word prompt suffix for AI image generation matching this style",
  "slide_structure": "image-dominant" | "balanced" | "title-dominant",
  "design_notes": "1-sentence summary of what was extracted from the reference image"
}`

// ── Demo mode mock (realistic) ─────────────────────────────────────

const DEMO_SPECS = [
  {
    layout: 'image-dominant',
    color_scheme: { bg: '#0D0D0D', primary: '#4F6EF7', accent: '#7C3AED', text: '#FFFFFF', muted: '#9CA3AF' },
    typography: { heading_style: 'Bold, short impactful lines', body_style: 'Clean readable sans-serif', font: 'Inter' },
    composition: 'centered',
    mood: 'professional inspiring',
    image_style: 'Dark atmospheric background with blue-purple gradient glow, minimal geometric abstract forms, high contrast, cinematic quality',
    slide_structure: 'image-dominant',
    design_notes: 'Reference: dark tech aesthetic with strong blue accent — extracted dominant color and layout balance',
  },
  {
    layout: 'balanced',
    color_scheme: { bg: '#0A0A14', primary: '#F59E0B', accent: '#EF4444', text: '#F5F5F5', muted: '#6B7280' },
    typography: { heading_style: 'Energetic condensed bold', body_style: 'Light weight, high legibility', font: 'Inter' },
    composition: 'dynamic',
    mood: 'bold energetic',
    image_style: 'Warm amber and red tones on near-black background, dynamic diagonal composition, abstract motion blur, bold contrast',
    slide_structure: 'balanced',
    design_notes: 'Reference: high-energy brand with warm tones — extracted amber primary and dynamic composition style',
  },
]

// ── Main export ────────────────────────────────────────────────────

export async function analyzeDesign(referenceImage, topic, existingStyle = {}) {
  if (DEMO()) {
    await new Promise(r => setTimeout(r, 400 + Math.random() * 200))
    // Use warmer/different spec when a reference image is provided
    const spec = referenceImage ? DEMO_SPECS[1] : DEMO_SPECS[0]
    if (existingStyle?.palette?.accent) {
      return {
        ...spec,
        color_scheme: { ...spec.color_scheme, primary: existingStyle.palette.accent },
        design_notes: referenceImage
          ? `Reference image provided — applied ${spec.mood} style with extracted colour palette`
          : `No reference image — applied default ${spec.mood} layout for topic: ${topic}`,
      }
    }
    return {
      ...spec,
      design_notes: referenceImage
        ? `Reference image analysed — applied ${spec.mood} aesthetic`
        : `No reference image — default layout for: ${topic}`,
    }
  }

  try {
    const contentBlocks = []

    if (referenceImage) {
      const match = referenceImage.match(/^data:([^;]+);base64,(.+)$/)
      if (match) {
        const mediaType = match[1]   // e.g. "image/jpeg"
        const base64Data = match[2]
        const supported = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        contentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: supported.includes(mediaType) ? mediaType : 'image/jpeg',
            data: base64Data,
          },
        })
      }
    }

    const userPrompt = referenceImage
      ? `Analyse this reference image and design a carousel layout for the topic: "${topic}". Extract colours, typography mood, and composition style. Return JSON matching this schema:\n${DESIGN_SCHEMA}`
      : `Design a carousel layout for the topic: "${topic}"${existingStyle?.tone ? `, tone: "${existingStyle.tone}"` : ''}. Return JSON matching this schema:\n${DESIGN_SCHEMA}`

    contentBlocks.push({ type: 'text', text: userPrompt })

    const response = await getClient().messages.create({
      model: MODEL(),
      max_tokens: 600,
      system: DESIGN_SYSTEM,
      messages: [{ role: 'user', content: contentBlocks }],
    })

    const raw = response.content[0].text
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch (err) {
    console.warn('[Claude Design] failed:', err.message?.slice(0, 80))
  }

  // Graceful fallback
  return {
    ...DEMO_SPECS[0],
    design_notes: 'Used fallback design spec (Claude unavailable)',
  }
}
