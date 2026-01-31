//! Tokscale TUI - Native Rust TUI that works on Windows without Solid.js/OpenTUI reactivity issues.

use std::io;
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

use tokscale_core::tui::run_tui;
use tokscale_core::{GraphResult, ModelReport, ReportOptions};

enum LoadResult {
    Success(ModelReport, GraphResult),
    Error(String),
}

fn main() -> io::Result<()> {
    let args: Vec<String> = std::env::args().collect();
    let home_dir = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok();

    let mut sources = Vec::new();
    for arg in &args[1..] {
        match arg.as_str() {
            "--opencode" => sources.push("opencode".to_string()),
            "--claude" => sources.push("claude".to_string()),
            "--codex" => sources.push("codex".to_string()),
            "--gemini" => sources.push("gemini".to_string()),
            "--cursor" => sources.push("cursor".to_string()),
            "--amp" => sources.push("amp".to_string()),
            "--droid" => sources.push("droid".to_string()),
            "--openclaw" => sources.push("openclaw".to_string()),
            "--help" | "-h" => {
                print_help();
                return Ok(());
            }
            "--version" | "-v" => {
                println!("tokscale-tui {}", env!("CARGO_PKG_VERSION"));
                return Ok(());
            }
            _ => {}
        }
    }

    let sources = if sources.is_empty() {
        None
    } else {
        Some(sources)
    };

    let options = ReportOptions {
        home_dir,
        sources,
        since: None,
        until: None,
        year: None,
    };

    let (tx, rx) = mpsc::channel::<LoadResult>();

    let options_clone = options.clone();
    thread::spawn(move || {
        let rt = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(e) => {
                let _ = tx.send(LoadResult::Error(format!("Failed to create runtime: {}", e)));
                return;
            }
        };

        let result = rt.block_on(async {
            let report_opts = ReportOptions {
                home_dir: options_clone.home_dir.clone(),
                sources: options_clone.sources.clone(),
                since: options_clone.since.clone(),
                until: options_clone.until.clone(),
                year: options_clone.year.clone(),
            };

            let graph_opts = ReportOptions {
                home_dir: options_clone.home_dir.clone(),
                sources: options_clone.sources.clone(),
                since: options_clone.since.clone(),
                until: options_clone.until.clone(),
                year: options_clone.year.clone(),
            };

            let report = tokscale_core::get_model_report(report_opts).await?;
            let graph = tokscale_core::generate_graph_with_pricing(graph_opts).await?;

            Ok::<_, napi::Error>((report, graph))
        });

        match result {
            Ok((report, graph)) => {
                let _ = tx.send(LoadResult::Success(report, graph));
            }
            Err(e) => {
                let _ = tx.send(LoadResult::Error(format!("Failed to load data: {}", e)));
            }
        }
    });

    println!("Loading token usage data...");

    match rx.recv_timeout(Duration::from_secs(60)) {
        Ok(LoadResult::Success(report, graph)) => {
            run_tui(report, graph)?;
        }
        Ok(LoadResult::Error(e)) => {
            eprintln!("Error: {}", e);
            std::process::exit(1);
        }
        Err(_) => {
            eprintln!("Timeout: Data loading took too long");
            std::process::exit(1);
        }
    }

    Ok(())
}

fn print_help() {
    println!(
        r#"tokscale-tui - Native Rust TUI for token usage visualization

USAGE:
    tokscale-tui [OPTIONS]

OPTIONS:
    --opencode      Include OpenCode sessions
    --claude        Include Claude Code sessions
    --codex         Include Codex CLI sessions
    --gemini        Include Gemini CLI sessions
    --cursor        Include Cursor IDE sessions
    --amp           Include Amp sessions
    --droid         Include Droid sessions
    --openclaw      Include OpenClaw sessions
    -h, --help      Print help information
    -v, --version   Print version information

KEYBOARD SHORTCUTS:
    q               Quit
    1-4             Jump to tab (Overview, Models, Daily, Stats)
    Tab             Switch tabs
    j/k             Navigate lists
"#
    );
}
