use rusqlite::Connection;
use uuid::Uuid;

use crate::error::SkillerError;
use crate::models::skill::{CreateSkillRequest, Skill, SourceMetadata, UpdateSkillRequest};
use crate::services::tag_binding_service::{normalize_tag_bindings_for_skill, resolve_tag_id};

fn validate_source_metadata_with_conn(
    metadata: &SourceMetadata,
    conn: &Connection,
) -> Result<(), SkillerError> {
    match metadata {
        SourceMetadata::Npx { command } => {
            if !command.starts_with("npx skills") {
                return Err(SkillerError::ValidationError(
                    "NPX command must start with 'npx skills'".to_string(),
                ));
            }
        }
        SourceMetadata::File { original_path } => {
            if !original_path.starts_with('/')
                && !original_path.starts_with("C:")
                && !original_path.starts_with("D:")
                && !original_path.starts_with("E:")
            {
                return Err(SkillerError::ValidationError(
                    "File path must be absolute".to_string(),
                ));
            }
        }
        SourceMetadata::Repository { repo_id } => {
            let exists: bool = conn.query_row(
                "SELECT EXISTS(SELECT 1 FROM repos WHERE id = ?1)",
                rusqlite::params![repo_id],
                |row| row.get(0),
            )?;
            if !exists {
                return Err(SkillerError::ValidationError(format!(
                    "Repository with id {} does not exist",
                    repo_id
                )));
            }
        }
    }
    Ok(())
}

pub fn get_skills(
    conn: &Connection,
    tag_ids: Option<Vec<String>>,
) -> Result<Vec<Skill>, SkillerError> {
    let mut skills = Vec::new();

    let sql = match &tag_ids {
        Some(tags) if !tags.is_empty() => {
            let placeholders = tags.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            format!(
                "SELECT DISTINCT s.id, s.name, s.description, s.file_path, s.source, s.source_metadata, s.repo_id, s.created_at, s.updated_at 
                 FROM skills s 
                 INNER JOIN skill_tags st ON s.id = st.skill_id 
                 WHERE st.tag_id IN ({})",
                placeholders
            )
        }
        _ => "SELECT id, name, description, file_path, source, source_metadata, repo_id, created_at, updated_at FROM skills".to_string(),
    };

    let mut stmt = conn.prepare(&sql)?;

    let mut rows = if let Some(tags) = tag_ids.filter(|t| !t.is_empty()) {
        let params: Vec<&dyn rusqlite::ToSql> =
            tags.iter().map(|t| t as &dyn rusqlite::ToSql).collect();
        stmt.query(params.as_slice())?
    } else {
        stmt.query([])?
    };

    while let Some(row) = rows.next()? {
        let mut skill = Skill {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            file_path: row.get(3)?,
            source: row.get(4)?,
            source_metadata: row.get(5)?,
            repo_id: row.get(6)?,
            tags: vec![],
            status: "available".to_string(),
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            is_symlink: false,
        };
        skill.tags = get_skill_tags(conn, &skill.id)?;
        skills.push(skill);
    }

    Ok(skills)
}

pub fn create_skill(conn: &Connection, request: CreateSkillRequest) -> Result<Skill, SkillerError> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    if let Some(ref metadata) = request.source_metadata {
        validate_source_metadata_with_conn(metadata, conn)?;
    }

    let source_metadata_json = request
        .source_metadata
        .as_ref()
        .map(|m| serde_json::to_string(m))
        .transpose()?;

    conn.execute(
        "INSERT INTO skills (id, name, description, file_path, source, source_metadata, repo_id, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![
            id,
            request.name,
            request.description,
            request.file_path,
            request.source,
            source_metadata_json,
            request.repo_id,
            now,
            now
        ],
    )?;

    for tag_id in &request.tags {
        let normalized_tag_id = resolve_tag_id(conn, tag_id)?;
        conn.execute(
            "INSERT INTO skill_tags (skill_id, tag_id) VALUES (?1, ?2)",
            rusqlite::params![id, normalized_tag_id],
        )?;
    }

    Ok(Skill {
        id,
        name: request.name,
        description: request.description,
        file_path: request.file_path,
        source: request.source,
        source_metadata: source_metadata_json,
        repo_id: request.repo_id,
        tags: request.tags,
        status: "available".to_string(),
        created_at: now.clone(),
        updated_at: now,
        is_symlink: false,
    })
}

pub fn update_skill(conn: &Connection, request: UpdateSkillRequest) -> Result<Skill, SkillerError> {
    let now = chrono::Utc::now().to_rfc3339();

    if let Some(name) = &request.name {
        conn.execute(
            "UPDATE skills SET name = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![name, now, request.id],
        )?;
    }

    if let Some(description) = &request.description {
        conn.execute(
            "UPDATE skills SET description = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![description, now, request.id],
        )?;
    }

    if let Some(tags) = &request.tags {
        conn.execute(
            "DELETE FROM skill_tags WHERE skill_id = ?1",
            rusqlite::params![request.id],
        )?;

        for tag_id in tags {
            let normalized_tag_id = resolve_tag_id(conn, tag_id)?;
            conn.execute(
                "INSERT INTO skill_tags (skill_id, tag_id) VALUES (?1, ?2)",
                rusqlite::params![request.id, normalized_tag_id],
            )?;
        }
    }

    get_skill_by_id(conn, &request.id)
}

pub fn delete_skill(conn: &Connection, id: &str) -> Result<(), SkillerError> {
    conn.execute(
        "DELETE FROM skill_tags WHERE skill_id = ?1",
        rusqlite::params![id],
    )?;
    conn.execute("DELETE FROM skills WHERE id = ?1", rusqlite::params![id])?;
    Ok(())
}

pub fn get_skill_by_id(conn: &Connection, id: &str) -> Result<Skill, SkillerError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, file_path, source, source_metadata, repo_id, created_at, updated_at FROM skills WHERE id = ?1"
    )?;

    let skill = stmt
        .query_row(rusqlite::params![id], |row| {
            Ok(Skill {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                file_path: row.get(3)?,
                source: row.get(4)?,
                source_metadata: row.get(5)?,
                repo_id: row.get(6)?,
                tags: vec![],
                status: "available".to_string(),
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                is_symlink: false,
            })
        })
        .map_err(|_| SkillerError::SkillNotFound(id.to_string()))?;

    let tags = get_skill_tags(conn, id)?;
    Ok(Skill { tags, ..skill })
}

fn get_skill_tags(conn: &Connection, skill_id: &str) -> Result<Vec<String>, SkillerError> {
    normalize_tag_bindings_for_skill(conn, skill_id)
}

pub fn get_skills_by_repo_id(conn: &Connection, repo_id: &str) -> Result<Vec<Skill>, SkillerError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, file_path, source, source_metadata, repo_id, created_at, updated_at 
         FROM skills WHERE repo_id = ?1",
    )?;

    let skills = stmt.query_map(rusqlite::params![repo_id], |row| {
        Ok(Skill {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            file_path: row.get(3)?,
            source: row.get(4)?,
            source_metadata: row.get(5)?,
            repo_id: row.get(6)?,
            tags: vec![],
            status: "available".to_string(),
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            is_symlink: false,
        })
    })?;

    let mut result = Vec::new();
    for skill in skills {
        let mut skill = skill?;
        skill.tags = get_skill_tags(conn, &skill.id)?;
        result.push(skill);
    }

    Ok(result)
}

pub fn get_skill_count_by_repo_id(conn: &Connection, repo_id: &str) -> Result<usize, SkillerError> {
    let count: usize = conn.query_row(
        "SELECT COUNT(*) FROM skills WHERE repo_id = ?1",
        rusqlite::params![repo_id],
        |row| row.get(0),
    )?;
    Ok(count)
}
