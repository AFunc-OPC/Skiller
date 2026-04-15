use rusqlite::Connection;

pub fn fix_global_paths(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    conn.execute(
        "UPDATE tool_presets SET global_path = '~/' || skill_path WHERE global_path NOT LIKE '~/%' AND global_path != ''",
        [],
    )?;

    Ok(())
}
