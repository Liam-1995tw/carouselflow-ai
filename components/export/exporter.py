"""
Export utilities — convert rendered carousel to JSON, PDF (future), or image (future).
"""
import json
from typing import Dict


def to_json(carousel: Dict) -> str:
    return json.dumps(carousel, indent=2, ensure_ascii=False)


def to_markdown(carousel: Dict) -> str:
    lines = [f"# Carousel — {carousel.get('slide_count', 0)} slides\n"]
    for slide in carousel.get("slides", []):
        lines.append(f"## Slide {slide['index']}: {slide['title']}")
        lines.append(slide["body"])
        if slide.get("image_prompt"):
            lines.append(f"*Image: {slide['image_prompt']}*")
        lines.append("")
    return "\n".join(lines)
