"""
Datadog custom metrics via DogStatsD.
"""
from app.core.config import settings

_statsd = None


def _get_statsd():
    global _statsd
    if _statsd is None:
        try:
            from datadog import initialize, statsd
            initialize(api_key=settings.DD_API_KEY, app_key=settings.DD_APP_KEY)
            _statsd = statsd
        except ImportError:
            _statsd = _NoopStatsd()
    return _statsd


class _NoopStatsd:
    def increment(self, *a, **kw): pass
    def histogram(self, *a, **kw): pass
    def gauge(self, *a, **kw): pass


def record_generation(slide_count: int, duration_ms: int, success: bool) -> None:
    s = _get_statsd()
    tags = [f"env:{settings.DD_ENV}", f"success:{str(success).lower()}"]
    s.increment("carouselflow.generation.count", tags=tags)
    s.histogram("carouselflow.generation.duration_ms", duration_ms, tags=tags)
    s.histogram("carouselflow.generation.slide_count", slide_count, tags=tags)


def record_agent_run(agent_name: str, duration_ms: int, tokens: int) -> None:
    s = _get_statsd()
    tags = [f"agent:{agent_name}", f"env:{settings.DD_ENV}"]
    s.histogram("carouselflow.agent.duration_ms", duration_ms, tags=tags)
    s.histogram("carouselflow.agent.tokens", tokens, tags=tags)
    s.increment("carouselflow.agent.run_count", tags=tags)
