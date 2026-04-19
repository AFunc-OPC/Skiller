use std::io::Write;
use std::process::{Command, Stdio};

fn log_debug(msg: &str) {
    eprintln!("[shell] {}", msg);
    if let Some(log_dir) = dirs::data_local_dir() {
        let log_path = log_dir.join("Skiller").join("shell_debug.log");
        if let Some(parent) = log_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
        let log_line = format!("[{}] {}\n", timestamp, msg);
        let _ = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
            .and_then(|mut f| f.write_all(log_line.as_bytes()));
    }
}

pub fn get_shell_path() -> Result<String, String> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| {
        if cfg!(target_os = "windows") {
            "cmd".to_string()
        } else if cfg!(target_os = "macos") {
            "/bin/zsh".to_string()
        } else {
            "/bin/bash".to_string()
        }
    });

    log_debug(&format!("Using shell: {}", shell));

    let output = if cfg!(target_os = "windows") {
        Command::new(&shell)
            .args(&["/C", "echo %PATH%"])
            .output()
            .map_err(|e| format!("Failed to execute shell: {}", e))?
    } else {
        Command::new(&shell)
            .args(&["-i", "-l", "-c", "echo $PATH"])
            .output()
            .map_err(|e| format!("Failed to execute shell: {}", e))?
    };

    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        log_debug(&format!("Got PATH length: {} chars", path.len()));
        Ok(path)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        log_debug(&format!("Failed to get PATH, stderr: {}", stderr));
        Err(format!("Shell command failed: {}", stderr))
    }
}

pub fn get_shell_command(program: &str) -> Command {
    if cfg!(target_os = "windows") {
        let mut cmd = Command::new(program);
        if let Ok(path) = get_shell_path() {
            log_debug(&format!(
                "Setting PATH for {}: {} chars",
                program,
                path.len()
            ));
            cmd.env("PATH", path);
        }
        cmd
    } else {
        Command::new(program)
    }
}

pub fn check_command_available(program: &str, version_arg: &str) -> bool {
    log_debug(&format!("Checking command: {} {}", program, version_arg));

    if cfg!(target_os = "windows") {
        let result = get_shell_command(program).arg(version_arg).output();
        match result {
            Ok(output) => {
                let success = output.status.success();
                log_debug(&format!("Command {} check result: {}", program, success));
                if success {
                    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    log_debug(&format!("Command {} stdout: {}", program, stdout));
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    log_debug(&format!("Error output: {}", stderr));
                }
                success
            }
            Err(e) => {
                log_debug(&format!("Command {} failed to execute: {}", program, e));
                false
            }
        }
    } else {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| {
            if cfg!(target_os = "macos") {
                "/bin/zsh".to_string()
            } else {
                "/bin/bash".to_string()
            }
        });
        let cmd = format!("{} {}", program, version_arg);
        let result = Command::new(&shell)
            .args(&["-i", "-l", "-c", &cmd])
            .output();

        match result {
            Ok(output) => {
                let success = output.status.success();
                log_debug(&format!("Command {} check result: {}", program, success));
                if success {
                    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    log_debug(&format!("Command {} stdout: {}", program, stdout));
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    log_debug(&format!("Error output: {}", stderr));
                }
                success
            }
            Err(e) => {
                log_debug(&format!("Command {} failed to execute: {}", program, e));
                false
            }
        }
    }
}

pub fn create_shell_command_for_npx(args: &[&str]) -> Command {
    if cfg!(target_os = "windows") {
        let mut cmd = Command::new("npx");
        if let Ok(path) = get_shell_path() {
            cmd.env("PATH", path);
        }
        cmd.args(args);
        cmd
    } else {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| {
            if cfg!(target_os = "macos") {
                "/bin/zsh".to_string()
            } else {
                "/bin/bash".to_string()
            }
        });
        let npx_cmd = format!("npx {}", args.join(" "));
        let mut cmd = Command::new(&shell);
        cmd.args(&["-i", "-l", "-c", &npx_cmd]);
        cmd
    }
}

pub fn create_shell_command_for_npx_str(npx_args_str: &str) -> Command {
    if cfg!(target_os = "windows") {
        let mut cmd = Command::new("npx");
        if let Ok(path) = get_shell_path() {
            cmd.env("PATH", path);
        }
        cmd.args(npx_args_str.split_whitespace());
        cmd
    } else {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| {
            if cfg!(target_os = "macos") {
                "/bin/zsh".to_string()
            } else {
                "/bin/bash".to_string()
            }
        });
        let npx_cmd = format!("npx {}", npx_args_str);
        let mut cmd = Command::new(&shell);
        cmd.args(&["-i", "-l", "-c", &npx_cmd]);
        cmd
    }
}

pub fn spawn_npx_command(args: &[&str]) -> std::io::Result<std::process::Child> {
    let mut cmd = create_shell_command_for_npx(args);
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped()).spawn()
}

pub fn spawn_npx_command_with_env(
    args: &[&str],
    env_vars: &[(&str, &str)],
) -> std::io::Result<std::process::Child> {
    let mut cmd = create_shell_command_for_npx(args);
    for (key, value) in env_vars {
        cmd.env(key, value);
    }
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped()).spawn()
}
