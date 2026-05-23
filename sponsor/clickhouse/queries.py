"""Pre-built analytics queries for the CarouselFlow dashboard."""
from sponsor.clickhouse.client import get_client


def top_topics(limit: int = 10) -> list[dict]:
    client = get_client()
    result = client.query(f"""
        SELECT topic, count() AS count
        FROM carousel_events
        GROUP BY topic
        ORDER BY count DESC
        LIMIT {limit}
    """)
    return [{"topic": row[0], "count": row[1]} for row in result.result_rows]


def avg_generation_time_by_slide_count() -> list[dict]:
    client = get_client()
    result = client.query("""
        SELECT slide_count, avg(duration_ms) AS avg_ms
        FROM carousel_events
        GROUP BY slide_count
        ORDER BY slide_count
    """)
    return [{"slide_count": row[0], "avg_ms": round(row[1], 2)} for row in result.result_rows]


def agent_performance() -> list[dict]:
    client = get_client()
    result = client.query("""
        SELECT agent_name,
               avg(duration_ms)  AS avg_ms,
               sum(tokens_used)  AS total_tokens,
               count()           AS runs
        FROM agent_traces
        GROUP BY agent_name
        ORDER BY avg_ms DESC
    """)
    return [
        {"agent": r[0], "avg_ms": round(r[1], 2), "total_tokens": r[2], "runs": r[3]}
        for r in result.result_rows
    ]
