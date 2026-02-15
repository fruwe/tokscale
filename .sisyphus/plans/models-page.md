# Models Page - Work Plan

## TL;DR

> **Quick Summary**: Create a `/models` page that displays all LiteLLM chat models with pricing data, using the dashboard design system (leaderboard pattern). Includes search, provider filtering, sorting, and expandable rows showing provider variants.
> 
> **Deliverables**:
> - API route: `/api/models` - fetches, caches, and transforms LiteLLM pricing data
> - Page: `/app/(main)/models/page.tsx` - SSR with Suspense
> - Client: `ModelsClient.tsx` - interactive table with search/filter/sort
> - Navigation link added to header
> - Unit tests for API route
> - Playwright QA scenarios
> 
> **Estimated Effort**: Medium (3-5 hours)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 (API) → Task 3 (Client) → Task 5 (Navigation) → Task 6 (Tests)

---

## Context

### Original Request
Create a new `/models` page to provide all models we track and resolve/pricing data, using the same design system as the landing page.

### Interview Summary
**Key Discussions**:
- Data to display: Pricing (input/output per 1M tokens), cache pricing, context window, provider, capabilities
- Model filter: Chat models only (exclude image gen, embeddings, rerank)
- Features: Search by model name, filter by provider, sort by price, sort by context window
- Deduplication: Show cheapest price per model with "+N providers" badge, expandable row shows all variants
- Design system: Dashboard pattern (CSS vars, `main-container`, Navigation/Footer shell) for consistency with leaderboard

**Research Findings**:
- LiteLLM JSON is ~4MB+, needs aggressive caching (`revalidate: 3600`)
- Same model appears across 10+ providers - needs deduplication logic
- Existing patterns: LeaderboardClient.tsx has reusable table patterns
- ProviderLogo only supports 3 providers - use text fallback for others

### Metis Review
**Identified Gaps** (addressed):
- Design system ambiguity → Resolved: Use dashboard pattern (leaderboard style)
- Model deduplication → Resolved: Cheapest price + expandable variants
- 4MB JSON size → Addressed: ISR caching + pagination
- ProviderLogo coverage → Addressed: Text fallback (no new logos)
- Mobile columns → Follow leaderboard hide pattern

---

## Work Objectives

### Core Objective
Build a production-ready `/models` page displaying LiteLLM chat models with pricing, search, filtering, sorting, and expandable provider variants.

### Concrete Deliverables
- `src/app/api/models/route.ts` - API route with caching
- `src/app/(main)/models/page.tsx` - Server component with Suspense
- `src/app/(main)/models/ModelsClient.tsx` - Client component with table
- `src/app/(main)/models/ModelsSkeleton.tsx` - Loading skeleton
- Updated `src/components/layout/Navigation.tsx` - Models link
- `__tests__/api/models.test.ts` - Unit tests

### Definition of Done
- [ ] `curl http://localhost:3000/api/models | jq '.models | length'` returns > 0
- [ ] `/models` page renders with table of models
- [ ] Search filters models by name
- [ ] Provider tabs filter models
- [ ] Sort by price and context window works
- [ ] Clicking row expands to show provider variants
- [ ] Navigation includes "Models" link
- [ ] `bun run build` succeeds with no errors
- [ ] All unit tests pass

### Must Have
- Chat models only (`mode === "chat"`)
- Pricing per 1M tokens (not per-token)
- Deduplication with cheapest price shown
- "+N providers" badge on deduplicated rows
- Expandable row for provider variants
- Search by model name
- Provider filter tabs
- Sort by price (input/output) and context window
- Pagination (50 per page, like leaderboard)
- ISR caching (1 hour)

### Must NOT Have (Guardrails)
- NO separate `/models/[modelId]` detail pages
- NO model comparison feature
- NO new provider logos (use text fallback)
- NO favorites/bookmarks persistence
- NO price history/trends charts
- NO modification to ProviderLogo.tsx
- NO modification to globals.css or layout.tsx
- NO new npm dependencies
- NO Tailwind CSS or CSS modules
- NO extraction/refactoring of LeaderboardClient components

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES (vitest in devDependencies)
- **Automated tests**: Tests-after
- **Framework**: vitest

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **API Route** | Bash (curl) | Send requests, parse JSON, assert fields |
| **Page UI** | Playwright | Navigate, interact, assert DOM, screenshot |
| **Build** | Bash | Run build command, check exit code |
| **Tests** | Bash (vitest) | Run test command, check pass/fail |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: API Route (/api/models)
└── Task 2: Page Shell + Skeleton

Wave 2 (After Wave 1):
├── Task 3: ModelsClient Component
└── Task 4: Provider Filter Tabs

Wave 3 (After Wave 2):
├── Task 5: Navigation Link
└── Task 6: Unit Tests + QA

Critical Path: Task 1 → Task 3 → Task 6
Parallel Speedup: ~30% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3, 6 | 2 |
| 2 | None | 3 | 1 |
| 3 | 1, 2 | 5, 6 | 4 |
| 4 | 1, 2 | 6 | 3 |
| 5 | 3 | 6 | None |
| 6 | 3, 4, 5 | None | None (final) |

---

## TODOs

- [ ] 1. Create API Route `/api/models`

  **What to do**:
  - Create `src/app/api/models/route.ts`
  - Fetch LiteLLM JSON from `https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json`
  - Use `export const revalidate = 3600` for 1-hour ISR caching
  - Filter to `mode === "chat"` only
  - Skip `sample_spec` key (it's documentation)
  - Transform pricing from per-token to per-1M-tokens
  - Deduplicate models: group by base model name, keep all variants
  - Return structure: `{ models: DeduplicatedModel[], providers: string[] }`
  - Handle fetch errors gracefully (return cached or error response)

  **Must NOT do**:
  - Do not add new dependencies
  - Do not use external caching libraries

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: API data transformation logic requires careful implementation
  - **Skills**: []
    - No special skills needed, standard TypeScript

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3, Task 6
  - **Blocked By**: None (can start immediately)

  **References**:
  - `src/app/api/leaderboard/route.ts:1-43` - API route pattern with revalidate
  - `packages/core/src/pricing/litellm.rs:6` - LiteLLM URL constant
  - `packages/core/src/pricing/lookup.rs:190-265` - Model deduplication/normalization logic reference

  **Type Definition** (create in route file or separate types file):
  ```typescript
  interface ModelVariant {
    fullKey: string;        // e.g., "anthropic/claude-opus-4-6"
    provider: string;       // e.g., "anthropic"
    inputCostPer1M: number | null;
    outputCostPer1M: number | null;
    cacheReadPer1M: number | null;
    cacheWritePer1M: number | null;
    contextWindow: number | null;
    maxOutput: number | null;
    capabilities: string[];  // ["vision", "function_calling", "reasoning", ...]
  }

  interface DeduplicatedModel {
    name: string;           // Base model name e.g., "claude-opus-4-6"
    cheapestVariant: ModelVariant;
    variantCount: number;
    variants: ModelVariant[];
  }

  interface ModelsResponse {
    models: DeduplicatedModel[];
    providers: string[];    // Unique provider list for filter tabs
  }
  ```

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: API returns valid model data
    Tool: Bash (curl + jq)
    Preconditions: Dev server running on localhost:3000
    Steps:
      1. curl -s http://localhost:3000/api/models > /tmp/models-response.json
      2. jq '.models | length' /tmp/models-response.json
      3. Assert: Output > 50 (should have many chat models)
      4. jq '.models[0] | keys' /tmp/models-response.json
      5. Assert: Contains "name", "cheapestVariant", "variantCount", "variants"
    Expected Result: API returns structured model data
    Evidence: /tmp/models-response.json saved

  Scenario: All models are chat mode only
    Tool: Bash (curl + jq)
    Steps:
      1. curl -s http://localhost:3000/api/models | jq '[.models[].variants[].capabilities] | flatten | unique'
      2. Assert: Output does not contain "image_generation" or "embedding"
    Expected Result: No non-chat models present
    Evidence: Output captured

  Scenario: sample_spec is excluded
    Tool: Bash (curl + jq)
    Steps:
      1. curl -s http://localhost:3000/api/models | jq '.models[] | select(.name == "sample_spec")'
      2. Assert: Empty output (no match)
    Expected Result: sample_spec documentation key not present
    Evidence: Empty output captured

  Scenario: Providers list populated
    Tool: Bash (curl + jq)
    Steps:
      1. curl -s http://localhost:3000/api/models | jq '.providers | length'
      2. Assert: Output > 5 (should have anthropic, openai, google, bedrock, etc.)
    Expected Result: Provider filter data available
    Evidence: Output captured
  ```

  **Commit**: YES
  - Message: `feat(frontend): add /api/models route for LiteLLM pricing data`
  - Files: `src/app/api/models/route.ts`
  - Pre-commit: `bun run build`

---

- [ ] 2. Create Page Shell with Skeleton

  **What to do**:
  - Create `src/app/(main)/models/page.tsx` following leaderboard pattern
  - Add Navigation, main.main-container, Footer shell
  - Add BlackholeHero component
  - Create `src/app/(main)/models/ModelsSkeleton.tsx` for loading state
  - Use Suspense with ModelsSkeleton fallback
  - Fetch models data in server component, pass to client

  **Must NOT do**:
  - Do not create a `(main)/layout.tsx` - keep per-page shell pattern
  - Do not use different layout than leaderboard

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple boilerplate following existing pattern
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:
  - `src/app/(main)/leaderboard/page.tsx:12-58` - Exact page shell pattern to copy
  - `src/components/Skeleton.tsx` - Existing skeleton components

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Page shell renders correctly
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to: http://localhost:3000/models
      2. Wait for: Navigation element visible (timeout: 10s)
      3. Assert: Page contains Navigation component
      4. Assert: Page contains Footer component
      5. Assert: Page contains main element with class "main-container"
      6. Screenshot: .sisyphus/evidence/task-2-page-shell.png
    Expected Result: Page has standard dashboard shell
    Evidence: .sisyphus/evidence/task-2-page-shell.png

  Scenario: Skeleton shows during loading
    Tool: Playwright
    Steps:
      1. Navigate to: http://localhost:3000/models with network throttling (Slow 3G)
      2. Assert: Skeleton/loading state appears before content
      3. Wait for: Content loads
      4. Assert: Skeleton is replaced by actual content
    Expected Result: Loading skeleton displays
    Evidence: Screenshots captured
  ```

  **Commit**: YES (group with Task 1)
  - Message: `feat(frontend): add /models page shell with skeleton`
  - Files: `src/app/(main)/models/page.tsx`, `src/app/(main)/models/ModelsSkeleton.tsx`
  - Pre-commit: `bun run build`

---

- [ ] 3. Create ModelsClient Component with Table

  **What to do**:
  - Create `src/app/(main)/models/ModelsClient.tsx`
  - Add "use client" directive
  - Create styled-components table following LeaderboardClient pattern
  - Display columns: Model Name, Provider, Input $/1M, Output $/1M, Context Window, Capabilities
  - Show "+N providers" badge for models with multiple variants
  - Implement expandable row accordion for provider variants
  - Implement search input (filter by model name using `includes()`)
  - Implement sort functionality (by input price, output price, context window)
  - Implement pagination (50 per page, like leaderboard)
  - Show "—" for null/missing prices, not "$0.00"
  - Format prices as "$X.XX" (e.g., "$3.00" for input)

  **Must NOT do**:
  - Do not use fuzzy search or regex - simple `includes()` is sufficient
  - Do not add virtualization - pagination is sufficient
  - Do not extract shared components from LeaderboardClient

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex UI component with table, accordion, interactions
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Design sensibility for table layout, interactions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Task 5, Task 6
  - **Blocked By**: Task 1, Task 2

  **References**:
  - `src/app/(main)/leaderboard/LeaderboardClient.tsx:72-262` - Table styled components (TableContainer, TableHead, TableRow, TableCell, etc.)
  - `src/app/(main)/leaderboard/LeaderboardClient.tsx:702-760` - LeaderboardRow component pattern
  - `src/app/(main)/leaderboard/LeaderboardClient.tsx:762-1083` - Client component structure with state management
  - `src/components/TabBar.tsx` - TabBar component for provider filters (Task 4 will use this)

  **Styled Components to Create** (based on leaderboard patterns):
  ```typescript
  // Copy and adapt from LeaderboardClient:
  Section, Title, Description, TableContainer, TableWrapper, Table,
  TableHead, TableHeaderCell, TableBody, TableRow, TableCell,
  PaginationContainer, PaginationText
  
  // New components for this page:
  SearchInput, VariantBadge, ExpandIcon, VariantRow, CapabilityTag
  ```

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Table renders with model data
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to: http://localhost:3000/models
      2. Wait for: table element visible (timeout: 15s)
      3. Assert: Table has header row with columns
      4. Assert: At least one data row contains "$" (price data)
      5. Assert: At least one row has "+N" badge (variant count)
      6. Screenshot: .sisyphus/evidence/task-3-table.png
    Expected Result: Table displays model data with prices
    Evidence: .sisyphus/evidence/task-3-table.png

  Scenario: Search filters models
    Tool: Playwright
    Steps:
      1. Navigate to: http://localhost:3000/models
      2. Wait for: Search input visible
      3. Fill: input[type="search"] or input[placeholder*="Search"] → "claude"
      4. Wait for: Table updates (debounce)
      5. Assert: All visible model names contain "claude" (case-insensitive)
      6. Clear search input
      7. Assert: More models appear (unfiltered)
    Expected Result: Search filters table by model name
    Evidence: Screenshots captured

  Scenario: Sort by price works
    Tool: Playwright
    Steps:
      1. Navigate to: http://localhost:3000/models
      2. Wait for: Table visible
      3. Click: Sort header for "Input $/1M"
      4. Get first 3 row prices
      5. Assert: Prices are in ascending order
      6. Click: Sort header again
      7. Assert: Prices are in descending order
    Expected Result: Sort toggles between asc/desc
    Evidence: Price values captured

  Scenario: Expandable row shows variants
    Tool: Playwright
    Steps:
      1. Navigate to: http://localhost:3000/models
      2. Wait for: Row with "+N" badge visible
      3. Click: That row (or expand icon)
      4. Wait for: Variant rows appear (nested/expanded)
      5. Assert: Variant rows show different providers
      6. Assert: Variant rows show provider-specific prices
      7. Click: Row again to collapse
      8. Assert: Variant rows hidden
      9. Screenshot: .sisyphus/evidence/task-3-expand.png
    Expected Result: Row expands to show provider variants
    Evidence: .sisyphus/evidence/task-3-expand.png

  Scenario: Pagination works
    Tool: Playwright
    Steps:
      1. Navigate to: http://localhost:3000/models
      2. Wait for: Pagination visible
      3. Assert: "Showing 1-50 of X" text present
      4. Click: Next page button
      5. Assert: Different models shown
      6. Assert: "Showing 51-100 of X" text (or similar)
    Expected Result: Pagination navigates between pages
    Evidence: Text content captured
  ```

  **Commit**: YES
  - Message: `feat(frontend): add ModelsClient with table, search, sort, expand`
  - Files: `src/app/(main)/models/ModelsClient.tsx`
  - Pre-commit: `bun run build`

---

- [ ] 4. Add Provider Filter Tabs

  **What to do**:
  - Add TabBar component to ModelsClient for provider filtering
  - Create tabs from unique providers list (returned by API)
  - Add "All" tab as first option
  - Filter table when tab is selected
  - Highlight currently selected tab

  **Must NOT do**:
  - Do not create a new TabBar component - use existing one
  - Do not filter by capabilities (out of scope)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple integration of existing TabBar component
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1, Task 2

  **References**:
  - `src/components/TabBar.tsx` - Existing TabBar component
  - `src/app/(main)/leaderboard/LeaderboardClient.tsx:956-969` - TabBar usage pattern

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Provider tabs render
    Tool: Playwright
    Steps:
      1. Navigate to: http://localhost:3000/models
      2. Wait for: TabBar visible
      3. Assert: "All" tab exists
      4. Assert: At least 3 provider tabs exist (e.g., Anthropic, OpenAI, Google)
    Expected Result: Provider filter tabs displayed
    Evidence: Screenshot captured

  Scenario: Provider filter works
    Tool: Playwright
    Steps:
      1. Navigate to: http://localhost:3000/models
      2. Wait for: Table and tabs visible
      3. Note: Current row count
      4. Click: "Anthropic" tab (or first non-All tab)
      5. Wait for: Table updates
      6. Assert: All visible model names or providers match selected filter
      7. Click: "All" tab
      8. Assert: More models appear
    Expected Result: Tab selection filters table
    Evidence: Row counts captured
  ```

  **Commit**: YES (group with Task 3)
  - Message: `feat(frontend): add provider filter tabs to models page`
  - Files: `src/app/(main)/models/ModelsClient.tsx` (update)
  - Pre-commit: `bun run build`

---

- [ ] 5. Add Navigation Link

  **What to do**:
  - Add "Models" link to Navigation.tsx
  - Position between "Leaderboard" and "Profile" (or after Leaderboard)
  - Use existing NavItemLink styled component
  - Add active state detection for `/models` path

  **Must NOT do**:
  - Do not change Navigation layout or styling
  - Do not add icons or badges

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, few lines change
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 3)
  - **Blocks**: Task 6
  - **Blocked By**: Task 3

  **References**:
  - `src/components/layout/Navigation.tsx:1-350` - Navigation component with NavItemLink pattern

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Models link in navigation
    Tool: Playwright
    Steps:
      1. Navigate to: http://localhost:3000
      2. Wait for: Navigation visible
      3. Assert: Link with text "Models" exists
      4. Assert: Link href is "/models"
      5. Screenshot: .sisyphus/evidence/task-5-nav.png
    Expected Result: Models link present in navigation
    Evidence: .sisyphus/evidence/task-5-nav.png

  Scenario: Navigation link works
    Tool: Playwright
    Steps:
      1. Navigate to: http://localhost:3000
      2. Click: "Models" link
      3. Wait for: Navigation to /models
      4. Assert: URL is http://localhost:3000/models
      5. Assert: Models page content visible
    Expected Result: Link navigates to models page
    Evidence: URL captured

  Scenario: Active state on models page
    Tool: Playwright
    Steps:
      1. Navigate to: http://localhost:3000/models
      2. Wait for: Navigation visible
      3. Assert: "Models" link has active styling (background color or different state)
    Expected Result: Models link highlighted when on /models
    Evidence: Computed styles captured
  ```

  **Commit**: YES
  - Message: `feat(frontend): add Models link to navigation`
  - Files: `src/components/layout/Navigation.tsx`
  - Pre-commit: `bun run build`

---

- [ ] 6. Add Unit Tests and Final QA

  **What to do**:
  - Create `__tests__/api/models.test.ts`
  - Test: API returns valid structure
  - Test: Only chat models included
  - Test: sample_spec excluded
  - Test: Deduplication works correctly
  - Test: Price formatting (per 1M tokens)
  - Run full Playwright QA suite
  - Run production build verification

  **Must NOT do**:
  - Do not add integration tests that require external network
  - Do not mock the entire LiteLLM response (use minimal fixtures)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Testing requires understanding of data transformations
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 3, final)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 3, Task 4, Task 5

  **References**:
  - `__tests__/api/` - Existing test patterns (if any exist)
  - `vitest.config.ts` or `package.json` scripts for test configuration

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Unit tests pass
    Tool: Bash (vitest)
    Preconditions: Tests written
    Steps:
      1. cd packages/frontend
      2. bun vitest run __tests__/api/models.test.ts
      3. Assert: Exit code 0
      4. Assert: All tests pass (no failures)
    Expected Result: Unit tests all green
    Evidence: Test output captured

  Scenario: Build succeeds
    Tool: Bash
    Steps:
      1. cd packages/frontend
      2. bun run build
      3. Assert: Exit code 0
      4. Assert: No TypeScript errors
      5. Assert: No build warnings
    Expected Result: Production build succeeds
    Evidence: Build output captured

  Scenario: Full page integration
    Tool: Playwright
    Steps:
      1. Navigate to: http://localhost:3000/models
      2. Wait for: Page fully loaded
      3. Assert: Title contains "Models"
      4. Assert: Table has data
      5. Assert: Search works
      6. Assert: Tabs work
      7. Assert: Sort works
      8. Assert: Expand works
      9. Assert: Pagination works
      10. Screenshot: .sisyphus/evidence/task-6-final.png
    Expected Result: All features work end-to-end
    Evidence: .sisyphus/evidence/task-6-final.png
  ```

  **Commit**: YES
  - Message: `test(frontend): add unit tests for /api/models route`
  - Files: `__tests__/api/models.test.ts`
  - Pre-commit: `bun vitest run && bun run build`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(frontend): add /api/models route for LiteLLM pricing data` | `src/app/api/models/route.ts` | `bun run build` |
| 2 | `feat(frontend): add /models page shell with skeleton` | `src/app/(main)/models/page.tsx`, `ModelsSkeleton.tsx` | `bun run build` |
| 3+4 | `feat(frontend): add ModelsClient with table, search, sort, expand, tabs` | `src/app/(main)/models/ModelsClient.tsx` | `bun run build` |
| 5 | `feat(frontend): add Models link to navigation` | `src/components/layout/Navigation.tsx` | `bun run build` |
| 6 | `test(frontend): add unit tests for /api/models route` | `__tests__/api/models.test.ts` | `bun vitest run && bun run build` |

---

## Success Criteria

### Verification Commands
```bash
# API returns data
curl -s http://localhost:3000/api/models | jq '.models | length'
# Expected: > 50

# Build succeeds
cd packages/frontend && bun run build
# Expected: exit 0

# Tests pass
cd packages/frontend && bun vitest run
# Expected: all pass
```

### Final Checklist
- [ ] API returns chat models only with proper deduplication
- [ ] Page renders with table, search, tabs, sort, pagination
- [ ] Expandable rows show provider variants
- [ ] Navigation includes Models link with active state
- [ ] All unit tests pass
- [ ] Production build succeeds
- [ ] All Playwright scenarios pass
