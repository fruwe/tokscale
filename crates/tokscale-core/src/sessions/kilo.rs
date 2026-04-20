//! Kilo CLI session parser
//!
//! Parses messages from:
//! - SQLite database: ~/.local/share/kilo/kilo.db
//!
//! Kilo CLI uses a SQLite database similar to OpenCode.

use super::utils::{file_modified_timestamp_ms, open_readonly_sqlite};
use super::UnifiedMessage;
use crate::{provider_identity, TokenBreakdown};
use serde::Deserialize;
use std::path::Path;

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct KiloMessage {
    #[serde(default)]
    pub id: Option<String>,
    pub session_id: Option<String>,
    pub role: String,
    #[serde(rename = "modelID", default)]
    pub model_id: Option<String>,
    #[serde(rename = "providerID", default)]
    pub provider_id: Option<String>,
    pub cost: Option<f64>,
    pub tokens: Option<KiloTokens>,
    pub time: Option<KiloTime>,
    pub agent: Option<String>,
    pub mode: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct KiloTokens {
    pub input: i64,
    pub output: i64,
    #[serde(default)]
    pub reasoning: Option<i64>,
    pub cache: KiloCache,
}

#[derive(Debug, Deserialize)]
pub struct KiloCache {
    pub read: i64,
    pub write: i64,
}

#[derive(Debug, Deserialize)]
pub struct KiloTime {
    pub created: f64,
    pub completed: Option<f64>,
}

pub fn parse_kilo_sqlite(db_path: &Path) -> Vec<UnifiedMessage> {
    let fallback_timestamp = file_modified_timestamp_ms(db_path);
    parse_kilo_sqlite_with_fallback(db_path, fallback_timestamp)
}

pub fn parse_kilo_sqlite_with_fallback(
    db_path: &Path,
    fallback_timestamp: i64,
) -> Vec<UnifiedMessage> {
    let Some(conn) = open_readonly_sqlite(db_path) else {
        return Vec::new();
    };

    let query = r#"
        SELECT m.id, m.data
        FROM message m
        WHERE json_extract(m.data, '$.role') = 'assistant'
          AND json_extract(m.data, '$.tokens') IS NOT NULL
    "#;

    let mut stmt = match conn.prepare(query) {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };

    let rows = match stmt.query_map([], |row| {
        let id: String = row.get(0)?;
        let data_json: String = row.get(1)?;
        Ok((id, data_json))
    }) {
        Ok(r) => r,
        Err(_) => return Vec::new(),
    };

    let mut messages = Vec::new();

    for row_result in rows {
        let (_id, data_json) = match row_result {
            Ok(r) => r,
            Err(_) => continue,
        };

        let mut bytes = data_json.into_bytes();
        let msg: KiloMessage = match simd_json::from_slice(&mut bytes) {
            Ok(m) => m,
            Err(_) => continue,
        };

        if msg.role != "assistant" {
            continue;
        }

        let tokens = match msg.tokens {
            Some(t) => t,
            None => continue,
        };

        let model_id = match msg.model_id {
            Some(m) => m,
            None => continue,
        };

        let agent = msg.agent.or(msg.mode);
        let session_id = msg.session_id.unwrap_or_else(|| "unknown".to_string());
        let timestamp = msg
            .time
            .map(|t| t.created as i64)
            .unwrap_or(fallback_timestamp);

        let provider = msg
            .provider_id
            .as_deref()
            .or_else(|| provider_identity::inferred_provider_from_model(&model_id))
            .unwrap_or("kilo")
            .to_string();

        let unified = UnifiedMessage::new_with_agent(
            "kilo",
            model_id,
            provider,
            session_id,
            timestamp,
            TokenBreakdown {
                input: tokens.input.max(0),
                output: tokens.output.max(0),
                cache_read: tokens.cache.read.max(0),
                cache_write: tokens.cache.write.max(0),
                reasoning: tokens.reasoning.unwrap_or(0).max(0),
            },
            msg.cost.unwrap_or(0.0).max(0.0),
            agent,
        );

        messages.push(unified);
    }

    messages
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn test_parse_kilo_message_structure() {
        let json = r#"{
            "id": "msg-123",
            "session_id": "sess-456",
            "role": "assistant",
            "modelID": "minimax/m2.5",
            "providerID": "kilo",
            "cost": 0.15,
            "tokens": {
                "input": 1000,
                "output": 200,
                "cache": {"read": 500, "write": 100}
            },
            "time": {"created": 1700000000000}
        }"#;

        let mut bytes = json.as_bytes().to_vec();
        let msg: KiloMessage = simd_json::from_slice(&mut bytes).unwrap();
        assert_eq!(msg.role, "assistant");
        assert_eq!(msg.cost, Some(0.15));
        assert_eq!(msg.model_id, Some("minimax/m2.5".to_string()));
    }

    fn setup_kilo_db(path: &Path) -> Connection {
        let conn = Connection::open(path).unwrap();
        conn.execute_batch(
            "CREATE TABLE message (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                data TEXT NOT NULL
            );",
        )
        .unwrap();
        conn
    }

    fn insert_message(conn: &Connection, id: &str, session: &str, data: &str) {
        conn.execute(
            "INSERT INTO message (id, session_id, data) VALUES (?1, ?2, ?3)",
            rusqlite::params![id, session, data],
        )
        .unwrap();
    }

    #[test]
    fn test_parse_kilo_sqlite_happy_path() {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("kilo.db");
        let conn = setup_kilo_db(&db);
        insert_message(
            &conn,
            "m1",
            "s1",
            r#"{
                "session_id": "s1",
                "role": "assistant",
                "modelID": "claude-sonnet-4",
                "providerID": "anthropic",
                "cost": 0.5,
                "tokens": {
                    "input": 100,
                    "output": 50,
                    "reasoning": 10,
                    "cache": {"read": 20, "write": 5}
                },
                "time": {"created": 1700000000000.0}
            }"#,
        );
        drop(conn);

        let messages = parse_kilo_sqlite(&db);
        assert_eq!(messages.len(), 1);
        let m = &messages[0];
        assert_eq!(m.client, "kilo");
        assert_eq!(m.model_id, "claude-sonnet-4");
        assert_eq!(m.provider_id, "anthropic");
        assert_eq!(m.session_id, "s1");
        assert_eq!(m.tokens.input, 100);
        assert_eq!(m.tokens.output, 50);
        assert_eq!(m.tokens.reasoning, 10);
        assert_eq!(m.tokens.cache_read, 20);
        assert_eq!(m.tokens.cache_write, 5);
        assert_eq!(m.cost, 0.5);
        assert_eq!(m.timestamp, 1700000000000);
    }

    #[test]
    fn test_parse_kilo_sqlite_returns_empty_for_missing_file() {
        let dir = tempfile::tempdir().unwrap();
        let missing = dir.path().join("does-not-exist.db");
        assert!(parse_kilo_sqlite(&missing).is_empty());
    }

    #[test]
    fn test_parse_kilo_sqlite_filters_user_messages_via_sql() {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("kilo.db");
        let conn = setup_kilo_db(&db);
        // user message — the SQL WHERE json_extract role='assistant' filters it.
        insert_message(
            &conn,
            "u1",
            "s1",
            r#"{
                "role": "user",
                "modelID": "whatever",
                "tokens": {
                    "input": 1, "output": 1,
                    "cache": {"read": 0, "write": 0}
                }
            }"#,
        );
        // assistant message without tokens → filtered by SQL.
        insert_message(
            &conn,
            "a1",
            "s1",
            r#"{
                "role": "assistant",
                "modelID": "whatever"
            }"#,
        );
        drop(conn);

        assert!(parse_kilo_sqlite(&db).is_empty());
    }

    #[test]
    fn test_parse_kilo_sqlite_skips_rows_without_model_id() {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("kilo.db");
        let conn = setup_kilo_db(&db);
        insert_message(
            &conn,
            "m1",
            "s1",
            r#"{
                "role": "assistant",
                "providerID": "anthropic",
                "tokens": {
                    "input": 1, "output": 1,
                    "cache": {"read": 0, "write": 0}
                },
                "time": {"created": 1700000000000.0}
            }"#,
        );
        drop(conn);
        assert!(parse_kilo_sqlite(&db).is_empty());
    }

    #[test]
    fn test_parse_kilo_sqlite_uses_fallback_timestamp_when_time_missing() {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("kilo.db");
        let conn = setup_kilo_db(&db);
        insert_message(
            &conn,
            "m1",
            "s1",
            r#"{
                "role": "assistant",
                "modelID": "claude-sonnet-4",
                "tokens": {
                    "input": 1, "output": 1,
                    "cache": {"read": 0, "write": 0}
                }
            }"#,
        );
        drop(conn);

        let messages = parse_kilo_sqlite_with_fallback(&db, 4242);
        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].timestamp, 4242);
    }

    #[test]
    fn test_parse_kilo_sqlite_clamps_negative_tokens_to_zero() {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("kilo.db");
        let conn = setup_kilo_db(&db);
        insert_message(
            &conn,
            "m1",
            "s1",
            r#"{
                "role": "assistant",
                "modelID": "claude-sonnet-4",
                "cost": -2.0,
                "tokens": {
                    "input": -10, "output": -5, "reasoning": -1,
                    "cache": {"read": -3, "write": -2}
                },
                "time": {"created": 1700000000000.0}
            }"#,
        );
        drop(conn);

        let messages = parse_kilo_sqlite(&db);
        assert_eq!(messages.len(), 1);
        let m = &messages[0];
        assert_eq!(m.tokens.input, 0);
        assert_eq!(m.tokens.output, 0);
        assert_eq!(m.tokens.reasoning, 0);
        assert_eq!(m.tokens.cache_read, 0);
        assert_eq!(m.tokens.cache_write, 0);
        assert_eq!(m.cost, 0.0);
    }

    #[test]
    fn test_parse_kilo_sqlite_defaults_session_id_to_unknown() {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("kilo.db");
        let conn = setup_kilo_db(&db);
        insert_message(
            &conn,
            "m1",
            "s1",
            r#"{
                "role": "assistant",
                "modelID": "claude-sonnet-4",
                "tokens": {
                    "input": 1, "output": 1,
                    "cache": {"read": 0, "write": 0}
                },
                "time": {"created": 1700000000000.0}
            }"#,
        );
        drop(conn);
        let messages = parse_kilo_sqlite(&db);
        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].session_id, "unknown");
    }

    #[test]
    fn test_parse_kilo_sqlite_prefers_agent_over_mode() {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("kilo.db");
        let conn = setup_kilo_db(&db);
        insert_message(
            &conn,
            "m1",
            "s1",
            r#"{
                "session_id": "s1",
                "role": "assistant",
                "modelID": "claude-sonnet-4",
                "agent": "explorer",
                "mode": "chat",
                "tokens": {
                    "input": 1, "output": 1,
                    "cache": {"read": 0, "write": 0}
                },
                "time": {"created": 1700000000000.0}
            }"#,
        );
        // mode-only fallback
        insert_message(
            &conn,
            "m2",
            "s2",
            r#"{
                "session_id": "s2",
                "role": "assistant",
                "modelID": "claude-sonnet-4",
                "mode": "only-mode",
                "tokens": {
                    "input": 1, "output": 1,
                    "cache": {"read": 0, "write": 0}
                },
                "time": {"created": 1700000000000.0}
            }"#,
        );
        drop(conn);

        let messages = parse_kilo_sqlite(&db);
        assert_eq!(messages.len(), 2);
        let agents: Vec<_> = messages.iter().map(|m| m.agent.clone()).collect();
        assert!(agents.contains(&Some("explorer".to_string())));
        assert!(agents.contains(&Some("only-mode".to_string())));
    }

    #[test]
    fn test_parse_kilo_sqlite_infers_provider_from_model_when_absent() {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("kilo.db");
        let conn = setup_kilo_db(&db);
        insert_message(
            &conn,
            "m1",
            "s1",
            r#"{
                "session_id": "s1",
                "role": "assistant",
                "modelID": "claude-sonnet-4",
                "tokens": {
                    "input": 1, "output": 1,
                    "cache": {"read": 0, "write": 0}
                },
                "time": {"created": 1700000000000.0}
            }"#,
        );
        drop(conn);
        let messages = parse_kilo_sqlite(&db);
        assert_eq!(messages.len(), 1);
        // inferred_provider_from_model maps claude-* to anthropic.
        assert_eq!(messages[0].provider_id, "anthropic");
    }

    #[test]
    fn test_parse_kilo_sqlite_defaults_provider_to_kilo_for_unknown_model() {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("kilo.db");
        let conn = setup_kilo_db(&db);
        insert_message(
            &conn,
            "m1",
            "s1",
            r#"{
                "session_id": "s1",
                "role": "assistant",
                "modelID": "totally-unknown-model-xyz",
                "tokens": {
                    "input": 1, "output": 1,
                    "cache": {"read": 0, "write": 0}
                },
                "time": {"created": 1700000000000.0}
            }"#,
        );
        drop(conn);
        let messages = parse_kilo_sqlite(&db);
        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].provider_id, "kilo");
    }

    #[test]
    fn test_parse_kilo_sqlite_skips_malformed_json_rows() {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("kilo.db");
        let conn = setup_kilo_db(&db);
        // Row must still pass the SQL WHERE (role=assistant + tokens IS NOT
        // NULL) but simd_json fails on this structure because "cache" is a
        // string, not an object. The parser should silently skip it.
        insert_message(
            &conn,
            "m1",
            "s1",
            r#"{
                "role": "assistant",
                "modelID": "claude-sonnet-4",
                "tokens": {
                    "input": 1, "output": 1, "cache": "not-an-object"
                }
            }"#,
        );
        // A valid sibling proves we only skip the bad row, not the whole batch.
        insert_message(
            &conn,
            "m2",
            "s1",
            r#"{
                "role": "assistant",
                "modelID": "claude-sonnet-4",
                "tokens": {
                    "input": 2, "output": 2,
                    "cache": {"read": 0, "write": 0}
                },
                "time": {"created": 1700000000000.0}
            }"#,
        );
        drop(conn);

        let messages = parse_kilo_sqlite(&db);
        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].tokens.input, 2);
    }
}
