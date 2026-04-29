use rusqlite::Connection;
use uuid::Uuid;

use crate::error::SkillerError;
use crate::models::tag::{
    CreateTagRequest, DeleteTagOptions, MoveTagRequest, Tag, TagGroup, TreeNode, UpdateTagRequest,
};

pub fn get_tags(conn: &Connection) -> Result<Vec<Tag>, SkillerError> {
    let skills_dir = dirs::home_dir()
        .ok_or_else(|| {
            SkillerError::IoError(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "Cannot get home directory",
            ))
        })?
        .join(".skiller")
        .join("skills");
    let skills_dir_str = skills_dir.to_string_lossy().to_string();

    let mut stmt = conn.prepare(
        r#"SELECT t.id, t.name, t.group_id, t.parent_id, t.materialized_path, t.depth, t.is_builtin, t.created_at, t.updated_at,
           (
               SELECT COUNT(DISTINCT st.skill_id)
               FROM skill_tags st
               LEFT JOIN tags alias_t ON alias_t.name = st.tag_id
               WHERE (st.tag_id = t.id OR alias_t.id = t.id)
                 AND (
                     st.skill_id LIKE ?1 || '/%'
                     OR st.skill_id LIKE ?1 || '/.disable.%'
                 )
           ) as skill_count
           FROM tags t"#,
    )?;

    let tags = stmt.query_map(rusqlite::params![skills_dir_str], |row| {
        Ok(Tag {
            id: row.get(0)?,
            name: row.get(1)?,
            group_id: row.get(2)?,
            parent_id: row.get(3)?,
            materialized_path: row.get(4)?,
            depth: row.get(5)?,
            is_builtin: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            skill_count: row.get(9)?,
        })
    })?;

    let mut result = Vec::new();
    for tag in tags {
        result.push(tag?);
    }

    Ok(result)
}

pub fn get_tag_groups(conn: &Connection) -> Result<Vec<TagGroup>, SkillerError> {
    let mut stmt = conn.prepare("SELECT id, name, is_builtin, created_at FROM tag_groups")?;

    let groups = stmt.query_map([], |row| {
        Ok(TagGroup {
            id: row.get(0)?,
            name: row.get(1)?,
            is_builtin: row.get(2)?,
            created_at: row.get(3)?,
        })
    })?;

    let mut result = Vec::new();
    for group in groups {
        result.push(group?);
    }

    Ok(result)
}

fn calculate_materialized_path(
    conn: &Connection,
    parent_id: Option<&str>,
    tag_name: &str,
) -> Result<String, SkillerError> {
    match parent_id {
        Some(pid) => {
            let parent_path: String = conn.query_row(
                "SELECT materialized_path FROM tags WHERE id = ?1",
                rusqlite::params![pid],
                |row| row.get(0),
            )?;
            Ok(format!("{}/{}", parent_path, tag_name))
        }
        None => Ok(tag_name.to_string()),
    }
}

fn calculate_depth(conn: &Connection, parent_id: Option<&str>) -> Result<i32, SkillerError> {
    match parent_id {
        Some(pid) => {
            let parent_depth: i32 = conn.query_row(
                "SELECT depth FROM tags WHERE id = ?1",
                rusqlite::params![pid],
                |row| row.get(0),
            )?;
            Ok(parent_depth + 1)
        }
        None => Ok(0),
    }
}

pub fn create_tag(conn: &Connection, request: CreateTagRequest) -> Result<Tag, SkillerError> {
    let exists: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM tags WHERE name = ?1 AND (parent_id = ?2 OR (?2 IS NULL AND parent_id IS NULL))",
        rusqlite::params![&request.name, &request.parent_id],
        |row| row.get(0),
    )?;

    if exists {
        return Err(SkillerError::TagNameExists(request.name));
    }

    let depth = calculate_depth(conn, request.parent_id.as_deref())?;

    if depth > 10 {
        return Err(SkillerError::ValidationError(
            "Maximum depth of 10 levels exceeded".to_string(),
        ));
    }

    let materialized_path =
        calculate_materialized_path(conn, request.parent_id.as_deref(), &request.name)?;

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO tags (id, name, group_id, parent_id, materialized_path, depth, is_builtin, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8)",
        rusqlite::params![
            id,
            request.name,
            request.group_id,
            request.parent_id,
            materialized_path,
            depth,
            now,
            now
        ],
    )?;

    Ok(Tag {
        id,
        name: request.name,
        group_id: request.group_id,
        parent_id: request.parent_id,
        materialized_path,
        depth,
        is_builtin: false,
        created_at: now.clone(),
        updated_at: now,
        skill_count: 0,
    })
}

pub fn delete_tag(conn: &Connection, id: &str) -> Result<(), SkillerError> {
    conn.execute(
        "DELETE FROM skill_tags WHERE tag_id = ?1",
        rusqlite::params![id],
    )?;
    conn.execute("DELETE FROM tags WHERE id = ?1", rusqlite::params![id])?;
    Ok(())
}

pub fn delete_tag_with_options(
    conn: &Connection,
    id: &str,
    options: DeleteTagOptions,
) -> Result<(), SkillerError> {
    let tag = get_tag_by_id(conn, id)?;

    if options.delete_children {
        let descendant_pattern = format!("{}/%", tag.materialized_path);

        let descendants: Vec<String> = conn
            .prepare("SELECT id FROM tags WHERE materialized_path LIKE ?1 OR id = ?2")?
            .query_map(rusqlite::params![&descendant_pattern, id], |row| row.get(0))?
            .filter_map(|r| r.ok())
            .collect();

        for desc_id in &descendants {
            conn.execute(
                "DELETE FROM skill_tags WHERE tag_id = ?1",
                rusqlite::params![desc_id],
            )?;
        }

        conn.execute(
            "DELETE FROM tags WHERE materialized_path LIKE ?1 OR id = ?2",
            rusqlite::params![&descendant_pattern, id],
        )?;
    } else {
        conn.execute(
            "UPDATE tags SET parent_id = ?1 WHERE parent_id = ?2",
            rusqlite::params![&tag.parent_id, id],
        )?;

        conn.execute(
            "DELETE FROM skill_tags WHERE tag_id = ?1",
            rusqlite::params![id],
        )?;
        conn.execute("DELETE FROM tags WHERE id = ?1", rusqlite::params![id])?;
    }

    Ok(())
}

pub fn get_tag_tree(conn: &Connection) -> Result<Vec<TreeNode>, SkillerError> {
    let tags = get_tags(conn)?;
    build_tree(tags, None)
}

pub fn get_tag_subtree(conn: &Connection, tag_id: &str) -> Result<TreeNode, SkillerError> {
    let tag: Tag = conn.query_row(
        r#"SELECT t.id, t.name, t.group_id, t.parent_id, t.materialized_path, t.depth, t.is_builtin, t.created_at, t.updated_at,
           (SELECT COUNT(*) FROM skill_tags WHERE tag_id = t.id) as skill_count
           FROM tags t WHERE t.id = ?1"#,
        rusqlite::params![tag_id],
        |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                group_id: row.get(2)?,
                parent_id: row.get(3)?,
                materialized_path: row.get(4)?,
                depth: row.get(5)?,
                is_builtin: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                skill_count: row.get(9)?,
            })
        },
    )?;

    let descendant_path = format!("{}/%", tag.materialized_path);
    let mut stmt = conn.prepare(
        r#"SELECT t.id, t.name, t.group_id, t.parent_id, t.materialized_path, t.depth, t.is_builtin, t.created_at, t.updated_at,
           (SELECT COUNT(*) FROM skill_tags WHERE tag_id = t.id) as skill_count
           FROM tags t WHERE t.materialized_path LIKE ?1 ORDER BY t.materialized_path"#,
    )?;

    let descendants: Vec<Tag> = stmt
        .query_map(rusqlite::params![descendant_path], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                group_id: row.get(2)?,
                parent_id: row.get(3)?,
                materialized_path: row.get(4)?,
                depth: row.get(5)?,
                is_builtin: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                skill_count: row.get(9)?,
            })
        })?
        .filter_map(|t| t.ok())
        .collect();

    let children = build_tree(descendants, Some(&tag.id))?;
    Ok(TreeNode { tag, children })
}

fn build_tree(tags: Vec<Tag>, parent_id: Option<&str>) -> Result<Vec<TreeNode>, SkillerError> {
    let mut roots: Vec<TreeNode> = Vec::new();

    for tag in tags.iter() {
        if tag.parent_id.as_deref() == parent_id {
            let children = build_tree(tags.clone(), Some(&tag.id))?;
            roots.push(TreeNode {
                tag: tag.clone(),
                children,
            });
        }
    }

    Ok(roots)
}

pub fn is_descendant(
    conn: &Connection,
    tag_id: &str,
    potential_parent_id: &str,
) -> Result<bool, SkillerError> {
    if tag_id == potential_parent_id {
        return Ok(true);
    }

    let tag_path: String = conn.query_row(
        "SELECT materialized_path FROM tags WHERE id = ?1",
        rusqlite::params![tag_id],
        |row| row.get(0),
    )?;

    let parent_path: String = conn.query_row(
        "SELECT materialized_path FROM tags WHERE id = ?1",
        rusqlite::params![potential_parent_id],
        |row| row.get(0),
    )?;

    Ok(parent_path.starts_with(&format!("{}/", tag_path)))
}

pub fn move_tag(conn: &Connection, request: MoveTagRequest) -> Result<Tag, SkillerError> {
    if let Some(ref new_parent_id) = request.new_parent_id {
        if is_descendant(conn, &request.tag_id, new_parent_id)? {
            return Err(SkillerError::ValidationError(
                "Cannot move tag into its own descendant".to_string(),
            ));
        }
    }

    let tag: Tag = conn.query_row(
        r#"SELECT t.id, t.name, t.group_id, t.parent_id, t.materialized_path, t.depth, t.is_builtin, t.created_at, t.updated_at,
           (SELECT COUNT(*) FROM skill_tags WHERE tag_id = t.id) as skill_count
           FROM tags t WHERE t.id = ?1"#,
        rusqlite::params![&request.tag_id],
        |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                group_id: row.get(2)?,
                parent_id: row.get(3)?,
                materialized_path: row.get(4)?,
                depth: row.get(5)?,
                is_builtin: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                skill_count: row.get(9)?,
            })
        },
    )?;

    let new_depth = calculate_depth(conn, request.new_parent_id.as_deref())?;
    let new_path = calculate_materialized_path(conn, request.new_parent_id.as_deref(), &tag.name)?;

    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE tags SET parent_id = ?1, depth = ?2, materialized_path = ?3, updated_at = ?4 WHERE id = ?5",
        rusqlite::params![
            request.new_parent_id,
            new_depth,
            new_path,
            now,
            &request.tag_id
        ],
    )?;

    update_descendant_paths(conn, &tag.materialized_path, &new_path)?;

    get_tag_by_id(conn, &request.tag_id)
}

fn update_descendant_paths(
    conn: &Connection,
    old_path: &str,
    new_path: &str,
) -> Result<(), SkillerError> {
    let descendant_pattern = format!("{}/%", old_path);

    let mut stmt =
        conn.prepare("SELECT id, materialized_path FROM tags WHERE materialized_path LIKE ?1")?;

    let descendants: Vec<(String, String)> = stmt
        .query_map(rusqlite::params![&descendant_pattern], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?
        .filter_map(|r| r.ok())
        .collect();

    for (desc_id, desc_path) in descendants {
        let updated_path = desc_path.replacen(old_path, new_path, 1);
        conn.execute(
            "UPDATE tags SET materialized_path = ?1 WHERE id = ?2",
            rusqlite::params![updated_path, desc_id],
        )?;
    }

    Ok(())
}

pub fn get_tag_by_id(conn: &Connection, id: &str) -> Result<Tag, SkillerError> {
    conn.query_row(
        r#"SELECT t.id, t.name, t.group_id, t.parent_id, t.materialized_path, t.depth, t.is_builtin, t.created_at, t.updated_at,
           (SELECT COUNT(*) FROM skill_tags WHERE tag_id = t.id) as skill_count
           FROM tags t WHERE t.id = ?1"#,
        rusqlite::params![id],
        |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                group_id: row.get(2)?,
                parent_id: row.get(3)?,
                materialized_path: row.get(4)?,
                depth: row.get(5)?,
                is_builtin: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                skill_count: row.get(9)?,
            })
        },
    ).map_err(|_| SkillerError::TagNotFound(format!("Tag not found: {}", id)))
}

pub fn update_tag(conn: &Connection, request: UpdateTagRequest) -> Result<Tag, SkillerError> {
    let tag = get_tag_by_id(conn, &request.id)?;

    let new_name = request.name.unwrap_or_else(|| tag.name.clone());

    if new_name != tag.name {
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) > 0 FROM tags WHERE name = ?1 AND id != ?2 AND (parent_id = ?3 OR (?3 IS NULL AND parent_id IS NULL))",
            rusqlite::params![&new_name, &request.id, &tag.parent_id],
            |row| row.get(0),
        )?;

        if exists {
            return Err(SkillerError::TagNameExists(new_name));
        }
    }

    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE tags SET name = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![&new_name, now, &request.id],
    )?;

    if new_name != tag.name {
        let old_path = tag.materialized_path.clone();
        let parent_path = tag
            .materialized_path
            .rfind('/')
            .map(|i| &tag.materialized_path[..i]);

        let new_path = match parent_path {
            Some(p) => format!("{}/{}", p, new_name),
            None => new_name.clone(),
        };

        conn.execute(
            "UPDATE tags SET materialized_path = ?1 WHERE id = ?2",
            rusqlite::params![&new_path, &request.id],
        )?;

        update_descendant_paths(conn, &old_path, &new_path)?;
    }

    get_tag_by_id(conn, &request.id)
}

pub fn get_tag_skill_count(conn: &Connection, tag_id: &str) -> Result<usize, SkillerError> {
    let skills_dir = dirs::home_dir()
        .ok_or_else(|| {
            SkillerError::IoError(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "Cannot get home directory",
            ))
        })?
        .join(".skiller")
        .join("skills");
    let skills_dir_str = skills_dir.to_string_lossy().to_string();

    let count: i64 = conn.query_row(
        r#"SELECT COUNT(DISTINCT st.skill_id)
           FROM skill_tags st
           LEFT JOIN tags alias_t ON alias_t.name = st.tag_id
           WHERE (st.tag_id = ?1 OR alias_t.id = ?1)
             AND (
                 st.skill_id LIKE ?2 || '/%'
                 OR st.skill_id LIKE ?2 || '/.disable.%'
             )"#,
        rusqlite::params![tag_id, skills_dir_str],
        |row| row.get(0),
    )?;
    Ok(count as usize)
}

pub fn get_tag_children(
    conn: &Connection,
    parent_id: Option<&str>,
) -> Result<Vec<Tag>, SkillerError> {
    let mut tags = Vec::new();

    match parent_id {
        Some(pid) => {
            let mut stmt = conn.prepare(
                r#"SELECT t.id, t.name, t.group_id, t.parent_id, t.materialized_path, t.depth, t.is_builtin, t.created_at, t.updated_at,
                   (SELECT COUNT(*) FROM skill_tags WHERE tag_id = t.id) as skill_count
                   FROM tags t WHERE t.parent_id = ?1"#,
            )?;
            let rows = stmt.query_map(rusqlite::params![pid], |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    group_id: row.get(2)?,
                    parent_id: row.get(3)?,
                    materialized_path: row.get(4)?,
                    depth: row.get(5)?,
                    is_builtin: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                    skill_count: row.get(9)?,
                })
            })?;
            for tag in rows {
                tags.push(tag?);
            }
        }
        None => {
            let mut stmt = conn.prepare(
                r#"SELECT t.id, t.name, t.group_id, t.parent_id, t.materialized_path, t.depth, t.is_builtin, t.created_at, t.updated_at,
                   (SELECT COUNT(*) FROM skill_tags WHERE tag_id = t.id) as skill_count
                   FROM tags t WHERE t.parent_id IS NULL"#,
            )?;
            let rows = stmt.query_map([], |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    group_id: row.get(2)?,
                    parent_id: row.get(3)?,
                    materialized_path: row.get(4)?,
                    depth: row.get(5)?,
                    is_builtin: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                    skill_count: row.get(9)?,
                })
            })?;
            for tag in rows {
                tags.push(tag?);
            }
        }
    }

    Ok(tags)
}
