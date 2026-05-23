from typing import Optional
from agents.shared.base_agent import BaseAgent
from agents.shared.llm import chat
from agents.style_reference_agent.prompts import SYSTEM_PROMPT


class StyleReferenceAgent(BaseAgent):
    name = "style_reference"

    async def run(self, topic: str, style_hint: Optional[str] = None) -> dict:
        user_msg = f"Topic: {topic}"
        if style_hint:
            user_msg += f"\nPreferred style: {style_hint}"

        raw = await chat(system=SYSTEM_PROMPT, user=user_msg)
        return {"style_guide": raw}
