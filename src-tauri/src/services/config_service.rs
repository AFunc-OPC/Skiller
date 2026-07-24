use rusqlite::Connection;

use crate::error::SkillerError;

pub fn get_config(conn: &Connection, key: &str) -> Result<Option<String>, SkillerError> {
    let result = conn.query_row(
        "SELECT value FROM config WHERE key = ?1",
        rusqlite::params![key],
        |row| row.get(0),
    );

    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(SkillerError::DatabaseError(e)),
    }
}

pub fn set_config(conn: &Connection, key: &str, value: &str) -> Result<(), SkillerError> {
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?1, ?2, ?3)",
        rusqlite::params![key, value, now],
    )?;

    Ok(())
}
