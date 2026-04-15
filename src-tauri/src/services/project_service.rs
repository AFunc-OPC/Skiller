use rusqlite::Connection;
use uuid::Uuid;

use crate::error::SkillerError;
use crate::models::project::{CreateProjectRequest, Project, UpdateProjectRequest};

pub fn get_projects(conn: &Connection) -> Result<Vec<Project>, SkillerError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, path, skill_path, tool_preset_id, description, icon, is_builtin, created_at, updated_at FROM projects",
    )?;

    let projects = stmt.query_map([], |row| {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
            skill_path: row.get(3)?,
            tool_preset_id: row.get(4)?,
            description: row.get(5)?,
            icon: row.get(6)?,
            is_builtin: row.get::<_, i32>(7)? != 0,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })?;

    let mut result = Vec::new();
    for project in projects {
        result.push(project?);
    }

    Ok(result)
}

pub fn create_project(
    conn: &Connection,
    request: CreateProjectRequest,
) -> Result<Project, SkillerError> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO projects (id, name, path, skill_path, tool_preset_id, description, icon, is_builtin, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8, ?9)",
        rusqlite::params![
            id,
            request.name,
            request.path,
            request.skill_path,
            request.tool_preset_id,
            request.description,
            request.icon,
            now,
            now
        ],
    )?;

    Ok(Project {
        id,
        name: request.name,
        path: request.path,
        skill_path: request.skill_path,
        tool_preset_id: request.tool_preset_id,
        description: request.description,
        icon: request.icon,
        is_builtin: false,
        created_at: now.clone(),
        updated_at: now,
    })
}

pub fn delete_project(conn: &Connection, id: &str) -> Result<(), SkillerError> {
    conn.execute(
        "DELETE FROM project_skills WHERE project_id = ?1",
        rusqlite::params![id],
    )?;
    conn.execute("DELETE FROM projects WHERE id = ?1", rusqlite::params![id])?;
    Ok(())
}

pub fn update_project(
    conn: &Connection,
    id: &str,
    request: UpdateProjectRequest,
) -> Result<Project, SkillerError> {
    let now = chrono::Utc::now().to_rfc3339();

    let mut updates = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(name) = &request.name {
        updates.push("name = ?");
        params.push(Box::new(name.clone()));
    }

    if let Some(description) = &request.description {
        updates.push("description = ?");
        match description {
            Some(val) => params.push(Box::new(val.clone())),
            None => params.push(Box::new(None::<String>)),
        }
    }

    if let Some(icon) = &request.icon {
        updates.push("icon = ?");
        match icon {
            Some(val) => params.push(Box::new(val.clone())),
            None => params.push(Box::new(None::<String>)),
        }
    }

    if updates.is_empty() {
        return get_project_by_id(conn, id);
    }

    updates.push("updated_at = ?");
    params.push(Box::new(now.clone()));
    params.push(Box::new(id.to_string()));

    let sql = format!("UPDATE projects SET {} WHERE id = ?", updates.join(", "));

    conn.execute(&sql, rusqlite::params_from_iter(params.iter()))?;

    get_project_by_id(conn, id)
}

pub fn get_project_by_id(conn: &Connection, id: &str) -> Result<Project, SkillerError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, path, skill_path, tool_preset_id, description, icon, is_builtin, created_at, updated_at FROM projects WHERE id = ?1",
    )?;

    let project = stmt.query_row(rusqlite::params![id], |row| {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
            skill_path: row.get(3)?,
            tool_preset_id: row.get(4)?,
            description: row.get(5)?,
            icon: row.get(6)?,
            is_builtin: row.get::<_, i32>(7)? != 0,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })?;

    Ok(project)
}
