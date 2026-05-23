"""
ClickHouse integration for high-performance analytics.
Stores carousel generation events, slide performance, and agent traces.
"""
import clickhouse_connect
from app.core.config import settings

_client = None


def get_client():
    global _client
    if _client is None:
        _client = clickhouse_connect.get_client(
            host=settings.CLICKHOUSE_HOST,
            port=settings.CLICKHOUSE_PORT,
            database=settings.CLICKHOUSE_DB,
            username=settings.CLICKHOUSE_USER,
            password=settings.CLICKHOUSE_PASSWORD,
        )
    return _client


def insert_generation_event(job_id: str, topic: str, slide_count: int, duration_ms: int) -> None:
    client = get_client()
    client.insert(
        "carousel_events",
        [[job_id, topic, slide_count, duration_ms]],
        column_names=["job_id", "topic", "slide_count", "duration_ms"],
    )


def insert_agent_trace(job_id: str, agent_name: str, duration_ms: int, tokens_used: int) -> None:
    client = get_client()
    client.insert(
        "agent_traces",
        [[job_id, agent_name, duration_ms, tokens_used]],
        column_names=["job_id", "agent_name", "duration_ms", "tokens_used"],
    )
