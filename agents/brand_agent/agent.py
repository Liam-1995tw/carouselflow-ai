from typing import Optional
from agents.shared.base_agent import BaseAgent
from agents.shared.llm import chat
from agents.brand_agent.prompts import SYSTEM_PROMPT


class BrandAgent(BaseAgent):
    name = "brand"

    async def run(self, brand_id: Optional[str] = None) -> dict:
        if not brand_id:
            return {"voice": "professional", "colors": [], "guidelines": "none"}

        raw = await chat(
            system=SYSTEM_PROMPT,
            user=f"Retrieve brand guidelines for brand_id: {brand_id}",
        )
        return {"brand_id": brand_id, "guidelines": raw}
