-- ClickHouse schema for CarouselFlow AI analytics

CREATE TABLE IF NOT EXISTS carousel_events (
    job_id       String,
    topic        String,
    slide_count  UInt8,
    duration_ms  UInt32,
    created_at   DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (created_at, job_id);

CREATE TABLE IF NOT EXISTS agent_traces (
    job_id       String,
    agent_name   LowCardinality(String),
    duration_ms  UInt32,
    tokens_used  UInt32,
    created_at   DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (created_at, agent_name);

CREATE TABLE IF NOT EXISTS slide_views (
    carousel_id  String,
    slide_index  UInt8,
    views        UInt32,
    swipes       UInt32,
    date         Date DEFAULT today()
) ENGINE = SummingMergeTree()
ORDER BY (date, carousel_id, slide_index);
