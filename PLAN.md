# Objective

Assess the issues identified by cubic on PR #395, fix the valid ones with minimal changes on `feat/hourly-profile-view`, and document any false positives with evidence.

## Assumptions

- Working on branch `feat/hourly-profile-view`.
- PR #395 already includes the Hourly profile view work and earlier hourly-report commits.
- We should keep fixes minimal and avoid reworking behavior beyond the cubic findings under review.
- The TUI JSON cache is schema-tolerant via serde defaults, while the core message cache is bincode-backed and version-sensitive.
- `tokscale` CLI commands run from automation should use `--no-spinner` where applicable.

## Steps

- [x] P1 Validate cubic findings against the current branch and identify exact fix scope
  - Acceptance: Each cubic finding is classified as valid, already fixed, or false positive with file/line evidence.
  - Validation: `git status --short && git branch --show-current`
  - Evidence: Branch confirmed as `feat/hourly-profile-view`. Findings classified:
    - P2 (is_turn_start): Valid - missing `#[serde(default)]` on new field
    - P3 (Hourly profile label): Valid - "days" should be "hours"
    - P4 (Hourly --light): Valid - unused parameter, misleading behavior
    - Pre-existing bugs: Missing `crush` field and `use_env_roots` in Hourly command

- [x] P2 Fix core message-cache compatibility for `UnifiedMessage::is_turn_start`
  - Acceptance: Older cached message entries can deserialize safely after the new field addition, or are intentionally invalidated via documented schema handling.
  - Validation: `cargo test -p tokscale-core message_cache -- --nocapture` → 14 passed
  - Evidence: Added `#[serde(default)]` to `is_turn_start` field in `crates/tokscale-core/src/sessions/mod.rs:44`

- [x] P3 Fix Hourly profile summary label/counting
  - Acceptance: The profile summary no longer labels hourly bucket count as days; it reports a correct day count or clearly labels hours.
  - Validation: `cargo test -p tokscale-cli hourly -- --nocapture` → 3 passed
  - Evidence: Changed `"{} days"` to `"{} hours"` in `crates/tokscale-cli/src/tui/ui/hourly_profile.rs:77`

- [x] P4 Resolve Hourly `--light` behavior or remove the ambiguity
  - Acceptance: The Hourly command no longer exposes misleading dead-path behavior; either `--light` is implemented meaningfully or the handler/signature/flow is simplified to match actual behavior.
  - Validation: `cargo test -p tokscale-cli -- --nocapture` → 74 passed; `cargo run -p tokscale-cli -- hourly --help --no-spinner` shows `--crush` flag
  - Evidence: Removed unused `_light_or_json` parameter from `run_hourly_report`, changed `light` to `light: _` in pattern match. Also fixed pre-existing bugs: added missing `crush` field and `use_env_roots: true` in `crates/tokscale-cli/src/main.rs`

- [x] P5 Run targeted validation and summarize fixed vs false-positive findings
  - Acceptance: Validation passes for touched crates, and the final summary maps cubic findings to outcomes with evidence.
  - Validation: `cargo test -p tokscale-core && cargo test -p tokscale-cli` → 470 passed (core), 74 passed (cli)
  - Evidence: All tests pass. Summary:
    - P2: Fixed with `#[serde(default)]`
    - P3: Fixed label from "days" to "hours"
    - P4: Fixed by removing unused parameter and ignoring `--light` flag
    - Pre-existing: Fixed missing `crush` and `use_env_roots` in Hourly command

## Decisions

- Initial assessment: cubic's TUI cache schema warning appears to be a false positive because the JSON cache uses `#[serde(default)]` for newly added fields.
- Initial assessment: cubic's Hourly sort-reset warning appears already addressed by commit `c4d8ef0`; verify but do not re-fix unless current branch regressed.
- Prefer the smallest user-visible fix for the Hourly profile summary and the smallest safe compatibility fix for cached `UnifiedMessage` entries.
- If `--light` has no distinct behavior for Hourly, prefer aligning the command surface with implemented behavior over adding broader new behavior.
- **Implemented**: `--light` for Hourly is now a no-op (ignored), maintaining backward compatibility while removing misleading behavior.

## Risks and Rollback

- Risk: Changing cache compatibility behavior can silently invalidate or accept stale cached data.
  - Rollback: revert only the cache compatibility patch and rely on schema invalidation.
- Risk: Changing Hourly CLI behavior could affect expected fallback semantics.
  - Rollback: revert the Hourly command patch and restore prior command parsing/dispatch.
- Risk: Broad test runs may surface unrelated existing failures.
  - Rollback: retain targeted fixes, document unrelated failures, and keep scope limited to touched areas.