from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.routes import carousel, agents, health
from sponsor.datadog.tracing import init_tracing

init_tracing()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"CarouselFlow AI backend starting — env: {settings.ENV}")
    yield
    print("Shutting down.")


app = FastAPI(
    title="CarouselFlow AI",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(carousel.router, prefix="/api/carousel", tags=["carousel"])
app.include_router(agents.router, prefix="/api/agents", tags=["agents"])
