from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

AGENTS = [
    {"id": "research",        "name": "Research Agent",         "status": "active"},
    {"id": "style_reference", "name": "Style Reference Agent",  "status": "active"},
    {"id": "copywriting",     "name": "Copywriting Agent",      "status": "active"},
    {"id": "brand",           "name": "Brand Agent",            "status": "active"},
]


@router.get("/")
async def list_agents():
    return AGENTS


@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    agent = next((a for a in AGENTS if a["id"] == agent_id), None)
    if not agent:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent
