use rusqlite::Connection;

pub fn run_migrations(_conn: &Connection) -> Result<(), crate::error::SkillerError> {
    Ok(())
}
