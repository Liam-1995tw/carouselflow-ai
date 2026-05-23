// Datadog sponsor integration
// Metrics are printed to console in demo mode.
// Add `hot-shots` to package.json and set DD_API_KEY to enable real DogStatsD.

const NOOP = { increment: () => {}, histogram: () => {}, gauge: () => {}, timing: () => {} }

let _statsd = null

function getStatsd() {
  if (_statsd) return _statsd
  _statsd = NOOP  // default until we can async-init
  return _statsd
}

// Async init so we can safely dynamic-import hot-shots without crashing on missing dep
async function tryInitStatsd() {
  try {
    const { StatsD } = await import('hot-shots')
    _statsd = new StatsD({
      host: process.env.DATADOG_AGENT_HOST || 'localhost',
      port: 8125,
      prefix: 'carouselflow.',
      globalTags: [
        `env:${process.env.DD_ENV || 'development'}`,
        `service:${process.env.DD_SERVICE || 'carouselflow-ai'}`,
      ],
      errorHandler: () => {},
    })
  } catch {
    // hot-shots not installed — console logging only
  }
}
tryInitStatsd()

// ── Metric helpers ─────────────────────────────────────────────────

export function recordAgentRun(agentName, durationMs, tokensUsed = 0) {
  const tags = [`agent:${agentName}`]
  getStatsd().increment('agent.run_count', 1, tags)
  getStatsd().histogram('agent.duration_ms', durationMs, tags)
  console.log(`[Datadog] ✓ agent=${agentName} duration=${durationMs}ms tokens=${tokensUsed}`)
}

export function recordGenerationJob(projectId, status, durationMs, slideCount) {
  const tags = [`status:${status}`]
  getStatsd().increment('generation.count', 1, tags)
  getStatsd().histogram('generation.duration_ms', durationMs, tags)
  console.log(`[Datadog] ✓ project=${projectId} status=${status} duration=${durationMs}ms slides=${slideCount}`)
}

export function recordError(agentName, errorType) {
  getStatsd().increment('agent.error_count', 1, [`agent:${agentName}`, `error:${errorType}`])
  console.error(`[Datadog] ✗ agent=${agentName} error=${errorType}`)
}

export function recordApiRequest(endpoint, statusCode, durationMs) {
  getStatsd().histogram('api.request_duration_ms', durationMs, [
    `endpoint:${endpoint}`,
    `status:${statusCode}`,
  ])
}
