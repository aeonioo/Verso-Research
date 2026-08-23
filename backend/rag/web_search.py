"""Optional, opt-in web search — the ONLY part of Verso that talks to the
internet. Everything else (embeddings, generation, storage) stays local.
Uses DuckDuckGo's free, keyless search via the `ddgs` package.
"""

from ddgs import DDGS


def web_search(query: str, max_results: int = 4) -> list[dict]:
    try:
        with DDGS() as ddgs:
            results = ddgs.text(query, max_results=max_results)
        return [
            {"title": r.get("title", ""), "url": r.get("href", ""), "snippet": r.get("body", "")}
            for r in results
        ]
    except Exception:
        return []