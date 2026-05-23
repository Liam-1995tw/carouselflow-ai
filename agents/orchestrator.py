from typing import List, Dict, Any, Optional

from agents.research_agent.agent import ResearchAgent
from agents.style_reference_agent.agent import StyleReferenceAgent
from agents.copywriting_agent.agent import CopywritingAgent
from agents.brand_agent.agent import BrandAgent


class AgentOrchestrator:
    """
    Runs the four agents in sequence:
    1. Research   → gather facts & context
    2. Style Ref  → determine visual & tone direction
    3. Brand      → apply brand voice/colours
    4. Copywriting → produce final slide copy
    """

    def __init__(self):
        self.research = ResearchAgent()
        self.style = StyleReferenceAgent()
        self.brand = BrandAgent()
        self.copy = CopywritingAgent()

    async def run(
        self,
        topic: str,
        slide_count: int = 6,
        brand_id: Optional[str] = None,
        style: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        research_output = await self.research.run(topic)
        style_output = await self.style.run(topic, style_hint=style)
        brand_output = await self.brand.run(brand_id=brand_id)
        slides = await self.copy.run(
            research=research_output,
            style=style_output,
            brand=brand_output,
            slide_count=slide_count,
        )
        return slides
