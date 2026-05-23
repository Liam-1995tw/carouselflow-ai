# DeepMind / Gemini Integration

Powered by **Google DeepMind's Gemini** models for multimodal AI capabilities.

## What it does

| Feature | Model | Usage |
|---|---|---|
| Image prompt enrichment | `gemini-1.5-pro` | Generates detailed visual prompts per slide |
| Style reference analysis | `gemini-1.5-pro-vision` | Reads uploaded images and extracts design tokens |

## Setup

```env
GEMINI_API_KEY=your_key_here
```

## Usage

```python
from sponsor.deepmind.gemini_client import enrich_image_prompt

prompt = await enrich_image_prompt("AI is reshaping design", "5 tools you need to know")
```
