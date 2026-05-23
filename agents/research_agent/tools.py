import httpx
from typing import Optional


async def web_search(query: str, max_results: int = 5) -> list[dict]:
    """Placeholder for web search integration (e.g. Tavily, Serper)."""
    return [{"title": f"Result for: {query}", "snippet": "", "url": ""}]


async def fetch_url(url: str) -> Optional[str]:
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(url)
            return r.text
        except Exception:
            return None
