from typing import Optional, Dict, Any
from agents.orchestrator import AgentOrchestrator

_jobs: Dict[str, Any] = {}


class CarouselService:
    def __init__(self):
        self.orchestrator = AgentOrchestrator()

    async def run_pipeline(self, job_id: str, req) -> None:
        _jobs[job_id] = {"status": "running", "slides": []}
        try:
            slides = await self.orchestrator.run(
                topic=req.topic,
                brand_id=req.brand_id,
                slide_count=req.slide_count,
                style=req.style,
            )
            _jobs[job_id] = {"status": "done", "slides": slides}
        except Exception as e:
            _jobs[job_id] = {"status": "error", "error": str(e)}

    async def get_job(self, job_id: str) -> Optional[Dict]:
        return _jobs.get(job_id)
