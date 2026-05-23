from agents.shared.base_agent import BaseAgent
from agents.shared.llm import chat
from agents.research_agent.prompts import SYSTEM_PROMPT


class ResearchAgent(BaseAgent):
    name = "research"

    async def run(self, topic: str) -> dict:
        raw = await chat(
            system=SYSTEM_PROMPT,
            user=f"Research this topic for a carousel post: {topic}",
        )
        return {"topic": topic, "research": raw}
