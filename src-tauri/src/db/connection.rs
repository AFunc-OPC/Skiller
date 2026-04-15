use rusqlite::Connection;
use std::sync::Mutex;

use super::migrations;
use super::schema;

pub type DbConnection = Mutex<Connection>;

pub fn init_database(app_data_dir: &str) -> Result<Connection, crate::error::SkillerError> {
    let db_path = format!("{}/skiller.db", app_data_dir);
    let conn = Connection::open(&db_path)?;

    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=OFF;")?;

    schema::create_tables(&conn)?;
    migrations::run_migrations(&conn)?;

    Ok(conn)
}

pub fn get_connection(
    db: &DbConnection,
) -> Result<std::sync::MutexGuard<'_, Connection>, crate::error::SkillerError> {
    db.lock()
        .map_err(|_| crate::error::SkillerError::DatabaseError(rusqlite::Error::InvalidQuery))
}

pub fn create_test_connection() -> Result<Connection, crate::error::SkillerError> {
    let conn = Connection::open_in_memory()?;
    schema::create_tables(&conn)?;
    migrations::run_migrations(&conn)?;
    Ok(conn)
}
