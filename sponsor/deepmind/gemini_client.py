"""
DeepMind / Google Gemini integration.
Used for multimodal understanding and image-prompt enrichment.
"""
import google.generativeai as genai
from app.core.config import settings

_model = None


def _get_model(model_name: str = "gemini-1.5-pro"):
    global _model
    if _model is None:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _model = genai.GenerativeModel(model_name)
    return _model


async def enrich_image_prompt(slide_title: str, slide_body: str) -> str:
    model = _get_model()
    prompt = (
        f"Create a detailed, photorealistic image generation prompt for a carousel slide.\n"
        f"Title: {slide_title}\nBody: {slide_body}\n"
        f"Return only the image prompt, no explanation."
    )
    response = model.generate_content(prompt)
    return response.text.strip()


async def analyze_style_reference(image_bytes: bytes) -> dict:
    model = _get_model("gemini-1.5-pro-vision")
    response = model.generate_content([
        "Analyze this image and extract: dominant colors, typography style, layout type, mood. Return JSON.",
        {"mime_type": "image/jpeg", "data": image_bytes},
    ])
    import json
    try:
        return json.loads(response.text)
    except Exception:
        return {"raw": response.text}
