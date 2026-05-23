import json
from typing import List, Dict, Any
from agents.shared.base_agent import BaseAgent
from agents.shared.llm import chat
from agents.copywriting_agent.prompts import SYSTEM_PROMPT


class CopywritingAgent(BaseAgent):
    name = "copywriting"

    async def run(
        self,
        research: dict,
        style: dict,
        brand: dict,
        slide_count: int = 6,
    ) -> List[Dict[str, Any]]:
        user_msg = f"""
Research context:
{json.dumps(research, indent=2)}

Style guide:
{json.dumps(style, indent=2)}

Brand context:
{json.dumps(brand, indent=2)}

Generate {slide_count} carousel slides.
"""
        raw = await chat(system=SYSTEM_PROMPT, user=user_msg, max_tokens=4096)
        try:
            slides = json.loads(raw)
        except json.JSONDecodeError:
            slides = [{"index": i + 1, "title": f"Slide {i + 1}", "body": "", "image_prompt": ""} for i in range(slide_count)]
        return slides
