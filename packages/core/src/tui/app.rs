use std::io;
use std::time::{Duration, Instant};

use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode, KeyEventKind},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, Paragraph, Tabs},
    Frame, Terminal,
};

use crate::{GraphResult, ModelReport};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Tab {
    Overview,
    Models,
    Daily,
    Stats,
}

impl Tab {
    fn titles() -> Vec<&'static str> {
        vec!["Overview", "Models", "Daily", "Stats"]
    }

    fn index(&self) -> usize {
        match self {
            Tab::Overview => 0,
            Tab::Models => 1,
            Tab::Daily => 2,
            Tab::Stats => 3,
        }
    }

    fn from_index(index: usize) -> Self {
        match index % 4 {
            0 => Tab::Overview,
            1 => Tab::Models,
            2 => Tab::Daily,
            3 => Tab::Stats,
            _ => Tab::Overview,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Source {
    OpenCode,
    Claude,
    Codex,
    Cursor,
    Gemini,
    Amp,
    Droid,
    OpenClaw,
}

impl Source {
    pub fn all() -> [Source; 8] {
        [
            Source::OpenCode,
            Source::Claude,
            Source::Codex,
            Source::Cursor,
            Source::Gemini,
            Source::Amp,
            Source::Droid,
            Source::OpenClaw,
        ]
    }

    pub fn label(&self) -> &'static str {
        match self {
            Source::OpenCode => "OC",
            Source::Claude => "CC",
            Source::Codex => "CX",
            Source::Cursor => "CR",
            Source::Gemini => "GM",
            Source::Amp => "AM",
            Source::Droid => "DR",
            Source::OpenClaw => "CL",
        }
    }

    pub fn matches(&self, source_str: &str) -> bool {
        let s = source_str.to_lowercase();
        match self {
            Source::OpenCode => s == "opencode",
            Source::Claude => s == "claude",
            Source::Codex => s == "codex",
            Source::Cursor => s == "cursor",
            Source::Gemini => s == "gemini",
            Source::Amp => s == "amp",
            Source::Droid => s == "droid",
            Source::OpenClaw => s == "openclaw",
        }
    }
}

pub struct App {
    pub tab: Tab,
    pub report: Option<ModelReport>,
    pub graph: Option<GraphResult>,
    pub loading: bool,
    pub selected_index: usize,
    pub scroll_offset: usize,
    pub enabled_sources: [bool; 8],
}

impl App {
    pub fn new() -> Self {
        Self {
            tab: Tab::Overview,
            report: None,
            graph: None,
            loading: true,
            selected_index: 0,
            scroll_offset: 0,
            enabled_sources: [true; 8],
        }
    }

    pub fn toggle_source(&mut self, index: usize) {
        if index < 8 {
            self.enabled_sources[index] = !self.enabled_sources[index];
            self.selected_index = 0;
            self.scroll_offset = 0;
        }
    }

    pub fn is_source_enabled(&self, source_str: &str) -> bool {
        for (i, source) in Source::all().iter().enumerate() {
            if source.matches(source_str) {
                return self.enabled_sources[i];
            }
        }
        true
    }

    pub fn set_data(&mut self, report: ModelReport, graph: GraphResult) {
        self.report = Some(report);
        self.graph = Some(graph);
        self.loading = false;
    }

    pub fn next_tab(&mut self) {
        self.tab = Tab::from_index(self.tab.index() + 1);
        self.selected_index = 0;
        self.scroll_offset = 0;
    }

    pub fn prev_tab(&mut self) {
        self.tab = Tab::from_index(self.tab.index() + 3);
        self.selected_index = 0;
        self.scroll_offset = 0;
    }

    pub fn select_next(&mut self) {
        let max = match self.tab {
            Tab::Models => self
                .report
                .as_ref()
                .map(|r| {
                    r.entries
                        .iter()
                        .filter(|e| self.is_source_enabled(&e.source))
                        .count()
                        .saturating_sub(1)
                })
                .unwrap_or(0),
            Tab::Daily => self
                .graph
                .as_ref()
                .map(|g| g.contributions.len().saturating_sub(1))
                .unwrap_or(0),
            _ => 0,
        };
        if self.selected_index < max {
            self.selected_index += 1;
        }
    }

    pub fn select_prev(&mut self) {
        if self.selected_index > 0 {
            self.selected_index -= 1;
        }
    }
}

pub fn run_tui(report: ModelReport, graph: GraphResult) -> io::Result<()> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let mut app = App::new();
    app.set_data(report, graph);

    let tick_rate = Duration::from_millis(16);
    let mut last_tick = Instant::now();

    loop {
        terminal.draw(|f| ui(f, &app))?;

        let timeout = tick_rate
            .checked_sub(last_tick.elapsed())
            .unwrap_or_else(|| Duration::from_secs(0));

        if crossterm::event::poll(timeout)? {
            if let Event::Key(key) = event::read()? {
                if key.kind == KeyEventKind::Press {
                    match key.code {
                        KeyCode::Char('q') => break,
                        KeyCode::Tab | KeyCode::Right => app.next_tab(),
                        KeyCode::BackTab | KeyCode::Left => app.prev_tab(),
                        KeyCode::Down | KeyCode::Char('j') => app.select_next(),
                        KeyCode::Up | KeyCode::Char('k') => app.select_prev(),
                        KeyCode::Char('1') => app.tab = Tab::Overview,
                        KeyCode::Char('2') => app.tab = Tab::Models,
                        KeyCode::Char('3') => app.tab = Tab::Daily,
                        KeyCode::Char('4') => app.tab = Tab::Stats,
                        KeyCode::F(1) => app.toggle_source(0),
                        KeyCode::F(2) => app.toggle_source(1),
                        KeyCode::F(3) => app.toggle_source(2),
                        KeyCode::F(4) => app.toggle_source(3),
                        KeyCode::F(5) => app.toggle_source(4),
                        KeyCode::F(6) => app.toggle_source(5),
                        KeyCode::F(7) => app.toggle_source(6),
                        KeyCode::F(8) => app.toggle_source(7),
                        _ => {}
                    }
                }
            }
        }

        if last_tick.elapsed() >= tick_rate {
            last_tick = Instant::now();
        }
    }

    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    Ok(())
}

fn ui(f: &mut Frame, app: &App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),
            Constraint::Min(0),
            Constraint::Length(3),
        ])
        .split(f.area());

    render_tabs(f, app, chunks[0]);
    render_content(f, app, chunks[1]);
    render_footer(f, app, chunks[2]);
}

fn render_tabs(f: &mut Frame, app: &App, area: Rect) {
    let titles: Vec<Line> = Tab::titles()
        .iter()
        .map(|t| Line::from(Span::styled(*t, Style::default().fg(Color::White))))
        .collect();

    let tabs = Tabs::new(titles)
        .block(Block::default().borders(Borders::ALL).title("Tokscale"))
        .select(app.tab.index())
        .style(Style::default().fg(Color::DarkGray))
        .highlight_style(
            Style::default()
                .fg(Color::Cyan)
                .add_modifier(Modifier::BOLD),
        );

    f.render_widget(tabs, area);
}

fn render_content(f: &mut Frame, app: &App, area: Rect) {
    if app.loading {
        let loading = Paragraph::new("Loading...").block(Block::default().borders(Borders::ALL));
        f.render_widget(loading, area);
        return;
    }

    match app.tab {
        Tab::Overview => render_overview(f, app, area),
        Tab::Models => render_models(f, app, area),
        Tab::Daily => render_daily(f, app, area),
        Tab::Stats => render_stats(f, app, area),
    }
}

fn render_overview(f: &mut Frame, app: &App, area: Rect) {
    let report = match &app.report {
        Some(r) => r,
        None => return,
    };

    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(area);

    let stats_text = vec![
        Line::from(format!("Total Cost: ${:.2}", report.total_cost)),
        Line::from(format!(
            "Total Input: {}",
            format_tokens(report.total_input)
        )),
        Line::from(format!(
            "Total Output: {}",
            format_tokens(report.total_output)
        )),
        Line::from(format!(
            "Cache Read: {}",
            format_tokens(report.total_cache_read)
        )),
        Line::from(format!(
            "Cache Write: {}",
            format_tokens(report.total_cache_write)
        )),
        Line::from(format!("Messages: {}", report.total_messages)),
    ];

    let stats =
        Paragraph::new(stats_text).block(Block::default().borders(Borders::ALL).title("Summary"));
    f.render_widget(stats, chunks[0]);

    let top_models: Vec<ListItem> = report
        .entries
        .iter()
        .take(10)
        .map(|e| ListItem::new(Line::from(format!("{}: ${:.2}", e.model, e.cost))))
        .collect();

    let models_list =
        List::new(top_models).block(Block::default().borders(Borders::ALL).title("Top Models"));
    f.render_widget(models_list, chunks[1]);
}

fn render_models(f: &mut Frame, app: &App, area: Rect) {
    let report = match &app.report {
        Some(r) => r,
        None => return,
    };

    let filtered_entries: Vec<&crate::ModelUsage> = report
        .entries
        .iter()
        .filter(|e| app.is_source_enabled(&e.source))
        .collect();

    let items: Vec<ListItem> = filtered_entries
        .iter()
        .enumerate()
        .map(|(i, e)| {
            let style = if i == app.selected_index {
                Style::default().bg(Color::DarkGray).fg(Color::White)
            } else {
                Style::default()
            };

            ListItem::new(Line::from(vec![
                Span::styled(format!("{:<30}", truncate(&e.model, 28)), style),
                Span::styled(format!("{:>12}", format_tokens(e.input + e.output)), style),
                Span::styled(format!("{:>10}", format!("${:.2}", e.cost)), style),
            ]))
        })
        .collect();

    let list = List::new(items).block(Block::default().borders(Borders::ALL).title("Models"));
    f.render_widget(list, area);
}

fn render_daily(f: &mut Frame, app: &App, area: Rect) {
    let graph = match &app.graph {
        Some(g) => g,
        None => return,
    };

    if graph.contributions.is_empty() {
        let empty = Paragraph::new("No daily data available")
            .block(Block::default().borders(Borders::ALL).title("Daily"));
        f.render_widget(empty, area);
        return;
    }

    let mut daily_entries: Vec<&crate::DailyContribution> = graph.contributions.iter().collect();
    daily_entries.sort_by(|a, b| b.date.cmp(&a.date));

    let visible_height = area.height.saturating_sub(2) as usize;
    let start_idx = app.scroll_offset.min(daily_entries.len().saturating_sub(1));
    let end_idx = (start_idx + visible_height).min(daily_entries.len());

    let items: Vec<ListItem> = daily_entries[start_idx..end_idx]
        .iter()
        .enumerate()
        .map(|(i, entry)| {
            let actual_idx = start_idx + i;
            let style = if actual_idx == app.selected_index {
                Style::default().bg(Color::DarkGray).fg(Color::White)
            } else {
                Style::default()
            };

            ListItem::new(Line::from(vec![
                Span::styled(format!("{:<12}", entry.date), style),
                Span::styled(format!("{:>12}", format_tokens(entry.totals.tokens)), style),
                Span::styled(
                    format!("{:>10}", format!("${:.2}", entry.totals.cost)),
                    style,
                ),
                Span::styled(format!("{:>8} msgs", entry.totals.messages), style),
            ]))
        })
        .collect();

    let title = format!(
        "Daily ({}/{})",
        app.selected_index
            .saturating_add(1)
            .min(daily_entries.len()),
        daily_entries.len()
    );
    let list = List::new(items).block(Block::default().borders(Borders::ALL).title(title));
    f.render_widget(list, area);
}

fn render_stats(f: &mut Frame, app: &App, area: Rect) {
    let graph = match &app.graph {
        Some(g) => g,
        None => return,
    };

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(10), Constraint::Min(0)])
        .split(area);

    let stats_text = vec![
        Line::from(format!("Total Days: {}", graph.summary.total_days)),
        Line::from(format!("Active Days: {}", graph.summary.active_days)),
        Line::from(format!("Total Cost: ${:.2}", graph.summary.total_cost)),
        Line::from(format!(
            "Total Tokens: {}",
            format_tokens(graph.summary.total_tokens)
        )),
    ];

    let stats = Paragraph::new(stats_text)
        .block(Block::default().borders(Borders::ALL).title("Statistics"));
    f.render_widget(stats, chunks[0]);

    render_contribution_graph(f, app, chunks[1]);
}

fn render_contribution_graph(f: &mut Frame, app: &App, area: Rect) {
    let graph = match &app.graph {
        Some(g) => g,
        None => return,
    };

    let block = Block::default()
        .borders(Borders::ALL)
        .title("Contribution Graph");

    let inner = block.inner(area);
    f.render_widget(block, area);

    if graph.contributions.is_empty() {
        return;
    }

    let max_cost = graph
        .contributions
        .iter()
        .map(|c| c.totals.cost)
        .fold(0.0f64, |a, b| a.max(b));

    let weeks = (inner.width as usize).min(52);
    let start_idx = graph.contributions.len().saturating_sub(weeks * 7);

    for (i, contrib) in graph.contributions.iter().skip(start_idx).enumerate() {
        let week = i / 7;
        let day = i % 7;

        if week >= inner.width as usize || day >= inner.height as usize {
            continue;
        }

        let intensity = if max_cost > 0.0 {
            (contrib.totals.cost / max_cost * 4.0).ceil() as u8
        } else {
            0
        };

        let color = match intensity {
            0 => Color::DarkGray,
            1 => Color::Green,
            2 => Color::LightGreen,
            3 => Color::Yellow,
            _ => Color::LightYellow,
        };

        let x = inner.x + week as u16;
        let y = inner.y + day as u16;

        if x < inner.x + inner.width && y < inner.y + inner.height {
            let cell = Paragraph::new("█").style(Style::default().fg(color));
            f.render_widget(cell, Rect::new(x, y, 1, 1));
        }
    }
}

fn render_footer(f: &mut Frame, app: &App, area: Rect) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(1), Constraint::Length(2)])
        .split(area);

    let mut source_spans = vec![Span::raw(" Sources: ")];
    for (i, source) in Source::all().iter().enumerate() {
        let enabled = app.enabled_sources[i];
        let style = if enabled {
            Style::default().fg(Color::Green)
        } else {
            Style::default().fg(Color::DarkGray)
        };
        source_spans.push(Span::styled(
            format!("F{}", i + 1),
            Style::default().fg(Color::Cyan),
        ));
        source_spans.push(Span::styled(format!("{} ", source.label()), style));
    }

    let sources_line = Paragraph::new(Line::from(source_spans));
    f.render_widget(sources_line, chunks[0]);

    let help = Paragraph::new(Line::from(vec![
        Span::styled("q", Style::default().fg(Color::Cyan)),
        Span::raw(" Quit  "),
        Span::styled("←/→", Style::default().fg(Color::Cyan)),
        Span::raw(" Tab  "),
        Span::styled("↑/↓", Style::default().fg(Color::Cyan)),
        Span::raw(" Nav  "),
        Span::styled("1-4", Style::default().fg(Color::Cyan)),
        Span::raw(" Jump  "),
        Span::styled("F1-F8", Style::default().fg(Color::Cyan)),
        Span::raw(" Toggle Source"),
    ]))
    .block(Block::default().borders(Borders::ALL));

    f.render_widget(help, chunks[1]);
}

fn format_tokens(tokens: i64) -> String {
    if tokens >= 1_000_000_000 {
        format!("{:.1}B", tokens as f64 / 1_000_000_000.0)
    } else if tokens >= 1_000_000 {
        format!("{:.1}M", tokens as f64 / 1_000_000.0)
    } else if tokens >= 1_000 {
        format!("{:.1}K", tokens as f64 / 1_000.0)
    } else {
        tokens.to_string()
    }
}

fn truncate(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        format!("{}...", &s[..max_len - 3])
    }
}
