use rusqlite::Connection;

pub fn add_source_metadata(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    if !column_exists(conn, "skills", "source_metadata")? {
        conn.execute("ALTER TABLE skills ADD COLUMN source_metadata TEXT", [])?;
    }

    Ok(())
}

fn column_exists(
    conn: &Connection,
    table: &str,
    column: &str,
) -> Result<bool, crate::error::SkillerError> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let mut rows = stmt.query([])?;

    while let Some(row) = rows.next()? {
        let name: String = row.get(1)?;
        if name == column {
            return Ok(true);
        }
    }

    Ok(false)
}

#[cfg(test)]
mod tests {
    use super::add_source_metadata;
    use crate::db::{migrations, schema};
    use rusqlite::Connection;

    #[test]
    fn migrations_can_run_multiple_times_on_same_database() {
        let conn = Connection::open_in_memory().expect("open in-memory db");

        schema::create_tables(&conn).expect("create schema");
        migrations::run_migrations(&conn).expect("first migration run");

        let result = migrations::run_migrations(&conn);

        assert!(
            result.is_ok(),
            "expected repeated migrations to succeed, got {result:?}"
        );
    }

    #[test]
    fn add_source_metadata_is_idempotent() {
        let conn = Connection::open_in_memory().expect("open in-memory db");

        schema::create_tables(&conn).expect("create schema");
        add_source_metadata(&conn).expect("first add source metadata");
        add_source_metadata(&conn).expect("second add source metadata");
    }
}
