# ClickHouse Integration

Powered by **ClickHouse** for real-time analytics on carousel generation and agent performance.

## Tables

| Table | Purpose |
|---|---|
| `carousel_events` | Generation jobs — topic, slide count, duration |
| `agent_traces` | Per-agent timing and token usage |
| `slide_views` | Engagement data per slide |

## Setup

```env
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DB=carouselflow
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
```

Run schema:
```bash
clickhouse-client < sponsor/clickhouse/schema.sql
```

## Usage

```python
from sponsor.clickhouse.client import insert_generation_event
from sponsor.clickhouse.queries import agent_performance

insert_generation_event(job_id, topic, slide_count, duration_ms)
stats = agent_performance()
```
