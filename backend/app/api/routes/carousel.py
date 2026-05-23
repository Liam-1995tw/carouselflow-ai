from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid

from app.services.carousel_service import CarouselService

router = APIRouter()
service = CarouselService()


class GenerateRequest(BaseModel):
    topic: str
    brand_id: Optional[str] = None
    slide_count: int = 6
    style: Optional[str] = None


class GenerateResponse(BaseModel):
    job_id: str
    status: str


@router.post("/generate", response_model=GenerateResponse)
async def generate_carousel(req: GenerateRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    background_tasks.add_task(service.run_pipeline, job_id, req)
    return GenerateResponse(job_id=job_id, status="queued")


@router.get("/status/{job_id}")
async def get_status(job_id: str):
    result = await service.get_job(job_id)
    if not result:
        raise HTTPException(status_code=404, detail="Job not found")
    return result
