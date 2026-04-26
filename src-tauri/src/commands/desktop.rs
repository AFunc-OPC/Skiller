use tauri_plugin_dialog::DialogExt;

fn expand_tilde(path: &str) -> String {
    if path.starts_with('~') {
        if let Some(home) = dirs::home_dir() {
            if path == "~" {
                return home.to_string_lossy().to_string();
            }
            return path.replacen('~', &home.to_string_lossy(), 1);
        }
    }
    path.to_string()
}

#[tauri::command]
pub async fn select_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let folder_path = app
        .dialog()
        .file()
        .blocking_pick_folder();
    
    Ok(folder_path.map(|p| p.to_string()))
}

#[tauri::command]
pub async fn open_folder(path: String, app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    
    let expanded_path = expand_tilde(&path);
    let _ = app.opener().open_path(&expanded_path, None::<&str>);
    Ok(())
}

#[tauri::command]
pub async fn open_path(path: String, app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;

    let expanded_path = expand_tilde(&path);
    let _ = app.opener().open_path(&expanded_path, None::<&str>);
    Ok(())
}
