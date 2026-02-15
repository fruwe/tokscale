# Decisions - Models Page

## 2026-02-15 Initial Decisions
- Use dashboard design system (leaderboard pattern, CSS vars, main-container)
- Deduplicate models: cheapest price + "+N providers" badge with expandable rows
- Chat models only (mode === "chat")
- ISR caching (1 hour) for LiteLLM data
- Pagination (50 per page)
- Text fallback for unknown providers (no new logos)

