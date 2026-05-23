"""
Datadog APM tracing — instruments FastAPI and agent pipelines.
"""
from app.core.config import settings


def init_tracing() -> None:
    try:
        from ddtrace import patch_all, tracer
        patch_all()
        tracer.configure(
            hostname="localhost",
            port=8126,
        )
        print(f"[Datadog] APM tracing enabled — service: {settings.DD_SERVICE}, env: {settings.DD_ENV}")
    except ImportError:
        print("[Datadog] ddtrace not installed — tracing disabled")


def trace_agent(agent_name: str):
    """Decorator to wrap any agent.run() with a Datadog span."""
    def decorator(fn):
        async def wrapper(*args, **kwargs):
            try:
                from ddtrace import tracer
                with tracer.trace(f"agent.{agent_name}", service=settings.DD_SERVICE, resource=agent_name):
                    return await fn(*args, **kwargs)
            except ImportError:
                return await fn(*args, **kwargs)
        return wrapper
    return decorator
