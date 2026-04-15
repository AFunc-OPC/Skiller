use rusqlite::Connection;

use crate::error::SkillerError;
use crate::models::config::ToolPreset;

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

pub fn get_tool_presets(conn: &Connection) -> Result<Vec<ToolPreset>, SkillerError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, skill_path, global_path, is_builtin, created_at, COALESCE(updated_at, created_at) FROM tool_presets ORDER BY COALESCE(updated_at, created_at) DESC, name ASC",
    )?;

    let presets = stmt.query_map([], |row| {
        Ok(ToolPreset {
            id: row.get(0)?,
            name: row.get(1)?,
            skill_path: row.get(2)?,
            global_path: row.get(3)?,
            is_builtin: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;

    let mut result = Vec::new();
    for preset in presets {
        result.push(preset?);
    }

    Ok(result)
}

pub fn create_tool_preset(
    conn: &Connection,
    request: &crate::models::config::CreateToolPresetRequest,
) -> Result<(), SkillerError> {
    if request.name.trim().is_empty() {
        return Err(SkillerError::ValidationError(
            "Name cannot be empty".to_string(),
        ));
    }
    if request.skill_path.trim().is_empty() {
        return Err(SkillerError::ValidationError(
            "Skill path cannot be empty".to_string(),
        ));
    }
    if request.global_path.trim().is_empty() {
        return Err(SkillerError::ValidationError(
            "Global path cannot be empty".to_string(),
        ));
    }

    let now = chrono::Utc::now().to_rfc3339();
    let id = uuid::Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO tool_presets (id, name, skill_path, global_path, is_builtin, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 0, ?5, ?5)",
        rusqlite::params![id, request.name, request.skill_path, request.global_path, now],
    )?;

    Ok(())
}

pub fn update_tool_preset(
    conn: &Connection,
    request: &crate::models::config::UpdateToolPresetRequest,
) -> Result<(), SkillerError> {
    let preset: ToolPreset = conn
        .query_row(
            "SELECT id, name, skill_path, global_path, is_builtin, created_at, COALESCE(updated_at, created_at) FROM tool_presets WHERE id = ?1",
            rusqlite::params![request.id],
            |row| {
                Ok(ToolPreset {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    skill_path: row.get(2)?,
                    global_path: row.get(3)?,
                    is_builtin: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
        .map_err(|_| SkillerError::ValidationError("Preset not found".to_string()))?;

    let name = request.name.as_ref().unwrap_or(&preset.name);
    let skill_path = request.skill_path.as_ref().unwrap_or(&preset.skill_path);
    let global_path = request.global_path.as_ref().unwrap_or(&preset.global_path);

    if name.trim().is_empty() || skill_path.trim().is_empty() || global_path.trim().is_empty() {
        return Err(SkillerError::ValidationError(
            "Preset fields cannot be empty".to_string(),
        ));
    }

    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE tool_presets SET name = ?1, skill_path = ?2, global_path = ?3, updated_at = ?4 WHERE id = ?5",
        rusqlite::params![name, skill_path, global_path, now, request.id],
    )?;

    Ok(())
}

pub fn delete_tool_preset(conn: &Connection, id: &str) -> Result<(), SkillerError> {
    conn.execute(
        "DELETE FROM tool_presets WHERE id = ?1",
        rusqlite::params![id],
    )?;

    Ok(())
}
