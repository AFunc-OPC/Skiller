use serde::Serialize;
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct OpenSpecTerminalResult {
    pub stdout: String,
    pub stderr: String,
    pub success: bool,
}

#[tauri::command]
pub fn execute_openspec_terminal_command(
    project_path: String,
    command: String,
) -> Result<OpenSpecTerminalResult, String> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let output = std::process::Command::new(shell)
        .current_dir(Path::new(&project_path))
        .args(["-i", "-l", "-c", &command])
        .output()
        .map_err(|error| error.to_string())?;

    Ok(OpenSpecTerminalResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        success: output.status.success(),
    })
}

#[cfg(test)]
mod tests {
    use super::execute_openspec_terminal_command;

    #[test]
    fn executes_command_in_project_directory() {
        let temp = tempfile::tempdir().unwrap();
        let result = execute_openspec_terminal_command(
            temp.path().to_string_lossy().to_string(),
            "pwd".to_string(),
        )
        .unwrap();

        assert!(result.success);
        assert!(result.stdout.contains(&temp.path().to_string_lossy().to_string()));
    }
}
