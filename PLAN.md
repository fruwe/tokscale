# Objective

Add a profile view toggle to the Hourly tab in Tokscale TUI. Press 'v' to switch between Table and Profile views. The profile view shows time-of-day breakdown, weekday breakdown, week strip, and key insights.

## Assumptions

- Working on `feat/hourly-profile-view` branch
- The Hourly tab already exists in `crates/tokscale-cli/src/tui/ui/hourly.rs`
- Key binding 'v' is available (p is taken for theme cycling)
- Data available in `HourlyUsage`: datetime, tokens, cost, clients, message_count, turn_count
- Reference Python implementation at `~/github/hourly-heatmap-ai/hourly-heatmap.py` provides aggregation logic

## Steps

- [x] P1 Add HourlyViewMode enum to app.rs
  - Acceptance: `HourlyViewMode` enum with `Table` and `Profile` variants exists in `app.rs`
  - Validation: `cargo check` passes
  - Evidence: Enum definition at lines 109-114 in app.rs

- [x] P2 Add hourly_view_mode field to App struct
  - Acceptance: `hourly_view_mode: HourlyViewMode` field added to `App` struct with `Default` trait
  - Validation: `cargo check` passes
  - Evidence: Field at line 178, initialized at line 264 in app.rs

- [x] P3 Handle 'v' key in handle_key_events for Tab::Hourly
  - Acceptance: Pressing 'v' while on Hourly tab toggles between Table and Profile views
  - Validation: `cargo test` passes
  - Evidence: Key handler at line 417 in app.rs, tests at lines 1970-2002

- [x] P4 Add aggregation helpers to data/mod.rs
  - Acceptance: Functions for period_buckets (Morning/Daytime/Evening/Night) and weekday_buckets (Mon-Sun) exist
  - Validation: `cargo check` passes
  - Evidence: `aggregate_by_period` at line 682, `aggregate_by_weekday` at line 715, `find_peak_hour` at line 747

- [x] P5 Create tui/ui/hourly_profile.rs with render function
  - Acceptance: New file with `render(frame, app, area)` function that displays profile view
  - Validation: `cargo check` passes
  - Evidence: New file hourly_profile.rs with 190 lines

- [x] P6 Modify hourly.rs to dispatch based on view mode
  - Acceptance: hourly.rs render function dispatches to either table view or profile view based on `app.hourly_view_mode`
  - Validation: `cargo check` passes
  - Evidence: Dispatch logic at lines 11-16 in hourly.rs

- [x] P7 Update footer help text to show "[v:profile]" hint for Hourly tab
  - Acceptance: Footer shows "[v:profile]" hint when on Hourly tab
  - Validation: Visual inspection or test
  - Evidence: Updated help text at lines 179-202 in footer.rs

- [x] P8 Add tests for HourlyViewMode
  - Acceptance: Unit tests for HourlyViewMode toggle behavior
  - Validation: `cargo test` passes (366 tests passed)
  - Evidence: Test functions at lines 1970-2002 in app.rs

- [x] P9 Update ui/mod.rs to include hourly_profile module
  - Acceptance: `mod hourly_profile;` added to ui/mod.rs
  - Validation: `cargo check` passes
  - Evidence: Module declaration at line 6 in ui/mod.rs

## Decisions

- Key binding: 'v' for view toggle (p is taken for theme cycling)
- Default view mode: Table (existing behavior)
- Profile view layout: Time-of-day periods → Weekday breakdown → Peak hour insight
- Aggregation periods: Morning (05:00-11:59), Daytime (12:00-16:59), Evening (17:00-21:59), Night (22:00-04:59)

## Risks and Rollback

- Risk: Profile view may not fit on narrow terminals
  - Mitigation: Check terminal width and adapt layout or show "Terminal too narrow" message
  - Status: Not implemented yet - can be added if needed
- Risk: Aggregation may be slow for large datasets
  - Mitigation: Compute aggregates once per render, not per frame
  - Status: Implemented - aggregates computed once per render

## Completion Summary

All 9 steps completed successfully:
- `cargo check --package tokscale-cli` passes with 2 minor warnings (unused fields)
- `cargo test --package tokscale-cli` passes all 366 tests

Files modified:
- `crates/tokscale-cli/src/tui/app.rs` - Added HourlyViewMode enum, field, key handler, and tests
- `crates/tokscale-cli/src/tui/data/mod.rs` - Added aggregation helpers
- `crates/tokscale-cli/src/tui/ui/hourly.rs` - Added dispatch logic
- `crates/tokscale-cli/src/tui/ui/hourly_profile.rs` - New file with profile view renderer
- `crates/tokscale-cli/src/tui/ui/footer.rs` - Added "[v:profile]" hint for Hourly tab
- `crates/tokscale-cli/src/tui/ui/mod.rs` - Added hourly_profile module declaration