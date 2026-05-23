# Datadog Integration

Powered by **Datadog** for full-stack observability — APM traces, custom metrics, and logs.

## What's instrumented

| Layer | Tool | What it captures |
|---|---|---|
| FastAPI routes | `ddtrace patch_all()` | Request latency, error rate, throughput |
| Agent pipeline | `trace_agent()` decorator | Per-agent span duration |
| Generation metrics | DogStatsD | Slide count, duration, success rate |
| Token usage | DogStatsD | Per-agent token consumption |

## Setup

```env
DD_API_KEY=your_api_key
DD_APP_KEY=your_app_key
DD_SERVICE=carouselflow-ai
DD_ENV=development
```

Start the Datadog Agent:
```bash
docker run -d --name dd-agent \
  -e DD_API_KEY=$DD_API_KEY \
  -e DD_APM_ENABLED=true \
  -e DD_DOGSTATSD_NON_LOCAL_TRAFFIC=true \
  -p 8126:8126/tcp \
  -p 8125:8125/udp \
  gcr.io/datadoghq/agent:latest
```

## Key Metrics

- `carouselflow.generation.count` — total jobs
- `carouselflow.generation.duration_ms` — pipeline latency
- `carouselflow.agent.duration_ms` — per-agent latency (tagged by `agent:`)
- `carouselflow.agent.tokens` — LLM token spend
