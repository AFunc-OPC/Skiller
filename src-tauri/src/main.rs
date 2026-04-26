#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use skiller::db::connection::{init_database, DbConnection};
use skiller::services::LogService;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory")
                .to_string_lossy()
                .to_string();

            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");

            let conn = init_database(&app_data_dir).expect("Failed to initialize database");

            app.manage(DbConnection::new(conn));

            let log_service = LogService::new().expect("Failed to initialize LogService");
            app.manage(log_service);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            skiller::commands::skill::get_skills,
            skiller::commands::skill::create_skill,
            skiller::commands::skill::update_skill,
            skiller::commands::skill::delete_skill,
            skiller::commands::skill_file::get_file_skills,
            skiller::commands::skill_file::toggle_skill,
            skiller::commands::skill_file::delete_file_skill,
            skiller::commands::skill_file::unzip_skill,
            skiller::commands::skill_file::copy_skill,
            skiller::commands::skill_file::distribute_skill,
            skiller::commands::skill_file::check_git_available,
            skiller::commands::skill_file::check_npx_available,
            skiller::commands::skill_file::diagnose_shell_env,
            skiller::commands::skill_file::prepare_npx_skill_import,
            skiller::commands::skill_file::confirm_npx_skill_import,
            skiller::commands::skill_file::cancel_npx_skill_import,
            skiller::commands::skill_file::execute_npx_command,
            skiller::commands::skill_file::get_file_skill_tags,
            skiller::commands::skill_file::update_file_skill_tags,
            skiller::commands::skill_file::read_skill_md_content,
            skiller::commands::skill_file::execute_npx_skills_add_native,
            skiller::commands::skill_file::confirm_overwrite_and_sync,
            skiller::commands::skill_file::sync_skill_to_skiller,
            skiller::commands::skill_file::list_agents_skills,
            skiller::commands::skill_file::search_skills_sh_api,
            skiller::commands::skill_file::execute_npx_skills_find,
            skiller::commands::tag::get_tags,
            skiller::commands::tag::get_tag_groups,
            skiller::commands::tag::create_tag,
            skiller::commands::tag::delete_tag,
            skiller::commands::tag::delete_tag_with_options,
            skiller::commands::tag::get_tag_tree,
            skiller::commands::tag::get_tag_subtree,
            skiller::commands::tag::update_tag,
            skiller::commands::tag::move_tag,
            skiller::commands::tag::get_tag_children,
            skiller::commands::tag::get_tag_skill_count,
            skiller::commands::project::get_projects,
            skiller::commands::project::create_project,
            skiller::commands::project::update_project,
            skiller::commands::project::delete_project,
            skiller::commands::project_skill::get_project_skills,
            skiller::commands::project_skill::get_project_skills_by_presets,
            skiller::commands::project_skill::remove_project_skill,
            skiller::commands::project_skill::toggle_project_skill_status,
            skiller::commands::project_skill::batch_remove_project_skills,
            skiller::commands::project_skill::batch_toggle_project_skills_status,
            skiller::commands::project_skill::check_project_skill_exists,
            skiller::commands::repo::get_repos,
            skiller::commands::repo::add_repo,
            skiller::commands::repo::update_repo,
            skiller::commands::repo::delete_repo,
            skiller::commands::repo::refresh_repo,
            skiller::commands::repo::repair_repo,
            skiller::commands::repo::list_repo_skills,
            skiller::commands::repo::get_repo_skill_count,
            skiller::commands::config::get_config,
            skiller::commands::config::set_config,
            skiller::commands::config::get_tool_presets,
            skiller::commands::config::create_tool_preset,
            skiller::commands::config::update_tool_preset,
            skiller::commands::config::delete_tool_preset,
            skiller::commands::config::get_storage_path,
            skiller::commands::config::get_proxy_config,
            skiller::commands::config::set_proxy_config,
            skiller::commands::config::get_effective_proxy,
            skiller::commands::desktop::select_folder,
            skiller::commands::desktop::open_folder,
            skiller::commands::desktop::open_path,
            skiller::commands::openspec::get_openspec_board_snapshot,
            skiller::commands::openspec::get_openspec_change_detail,
            skiller::commands::openspec::get_openspec_spec_document,
            skiller::commands::openspec_terminal::execute_openspec_terminal_command,
            skiller::commands::log::get_logs,
            skiller::commands::log::export_logs,
            skiller::commands::log::clear_logs,
            skiller::commands::log::get_log_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
