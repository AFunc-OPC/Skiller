use crate::models::{LogEntry, LogFilter, LogStats};
use crate::services::LogService;
use tauri::State;

#[tauri::command]
pub fn get_logs(
    service: State<'_, LogService>,
    filter: LogFilter,
) -> Result<Vec<LogEntry>, String> {
    service.get_logs(filter)
}

#[tauri::command]
pub fn export_logs(
    service: State<'_, LogService>,
    format: String,
    path: String,
    filter: LogFilter,
) -> Result<(), String> {
    service.export_logs(&format, &path, filter)
}

#[tauri::command]
pub fn clear_logs(service: State<'_, LogService>) -> Result<(), String> {
    service.clear_logs()
}

#[tauri::command]
pub fn get_log_stats(service: State<'_, LogService>) -> Result<LogStats, String> {
    service.get_stats()
}
