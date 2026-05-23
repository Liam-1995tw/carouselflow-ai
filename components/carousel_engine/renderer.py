"""
Carousel rendering engine — assembles slide data into export-ready structures.
"""
from typing import List, Dict, Any


def render_carousel(slides: List[Dict[str, Any]], style: Dict) -> Dict:
    return {
        "slide_count": len(slides),
        "style": style,
        "slides": [_render_slide(s, style) for s in slides],
    }


def _render_slide(slide: Dict, style: Dict) -> Dict:
    return {
        "index":       slide.get("index"),
        "title":       slide.get("title", ""),
        "body":        slide.get("body", ""),
        "image_prompt": slide.get("image_prompt", ""),
        "bg_color":    style.get("palette", {}).get("bg", "#FFFFFF"),
        "accent":      style.get("palette", {}).get("accent", "#000000"),
        "font":        style.get("typography", "Inter"),
    }
