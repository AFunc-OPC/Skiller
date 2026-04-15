pub mod v1;
pub mod v10;
pub mod v11;
pub mod v12;
pub mod v13;
pub mod v2;
pub mod v3;
pub mod v4;
pub mod v5;
pub mod v6;
pub mod v7;
pub mod v8;
pub mod v9;
use rusqlite::Connection;

pub fn run_migrations(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    v1::seed_initial_data(conn)?;
    v2::migrate_tag_hierarchy(conn)?;
    v3::fix_unique_constraint(conn)?;
    v4::add_project_metadata(conn)?;
    v5::enhance_tool_presets(conn)?;
    v6::change_repo_unique_constraint(conn)?;
    v7::add_repo_metadata(conn)?;
    v8::add_source_metadata(conn)?;
    v9::add_tool_preset_updated_at(conn)?;
    v10::add_builtin_tags(conn)?;
    v11::add_builtin_repos(conn)?;
    v12::fix_global_paths(conn)?;
    v13::add_global_skills_project(conn)?;
    Ok(())
}
