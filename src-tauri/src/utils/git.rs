use std::fs;
use std::io::{BufRead, BufReader};
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};
use uuid::Uuid;

use crate::error::SkillerError;
use crate::utils::shell::get_shell_command;

#[derive(Debug, Clone, Default)]
pub struct GitAuthConfig {
    pub auth_method: Option<String>,
    pub username: Option<String>,
    pub token: Option<String>,
    pub ssh_key: Option<String>,
}

fn looks_like_private_key(value: &str) -> bool {
    value.contains("BEGIN OPENSSH PRIVATE KEY")
        || value.contains("BEGIN RSA PRIVATE KEY")
        || value.contains("BEGIN PRIVATE KEY")
        || value.contains("BEGIN ED25519 PRIVATE KEY")
}

struct TempGitAuthContext {
    files_to_cleanup: Vec<PathBuf>,
}

impl TempGitAuthContext {
    fn new() -> Self {
        Self {
            files_to_cleanup: Vec::new(),
        }
    }

    fn track(&mut self, path: PathBuf) {
        self.files_to_cleanup.push(path);
    }
}

impl Drop for TempGitAuthContext {
    fn drop(&mut self) {
        for path in &self.files_to_cleanup {
            let _ = fs::remove_file(path);
        }
    }
}

#[cfg(unix)]
fn set_owner_only_permissions(path: &Path, mode: u32) -> Result<(), SkillerError> {
    let permissions = fs::Permissions::from_mode(mode);
    fs::set_permissions(path, permissions)?;
    Ok(())
}

#[cfg(not(unix))]
fn set_owner_only_permissions(_path: &Path, _mode: u32) -> Result<(), SkillerError> {
    Ok(())
}

fn expand_home_path(path: &str) -> PathBuf {
    if path == "~" {
        return dirs::home_dir().unwrap_or_else(|| PathBuf::from(path));
    }

    if let Some(stripped) = path.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(stripped);
        }
    }

    PathBuf::from(path)
}

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

fn create_temp_file(prefix: &str, content: &str, mode: u32) -> Result<PathBuf, SkillerError> {
    let path =
        std::env::temp_dir().join(format!("skiller-{}-{}", prefix, Uuid::new_v4().as_simple()));

    fs::write(&path, content)?;
    set_owner_only_permissions(&path, mode)?;
    Ok(path)
}

fn prepare_git_auth(
    command: &mut Command,
    auth: &GitAuthConfig,
) -> Result<TempGitAuthContext, SkillerError> {
    let mut temp_auth = TempGitAuthContext::new();
    let auth_method = auth.auth_method.as_deref().unwrap_or("ssh");

    command.env("GIT_TERMINAL_PROMPT", "0");

    if auth_method == "http" {
        if let Some(token) = auth
            .token
            .as_deref()
            .filter(|value| !value.trim().is_empty())
        {
            let script = "#!/bin/sh
prompt=\"${1:-}\"
case \"$prompt\" in
  *Username*|*username*) printf '%s\\n' \"${SKILLER_GIT_USERNAME:-git}\" ;;
  *) printf '%s\\n' \"${SKILLER_GIT_TOKEN:-}\" ;;
esac
";

            let askpass_path = create_temp_file("git-askpass.sh", script, 0o700)?;
            command
                .env("GIT_ASKPASS", &askpass_path)
                .env("GIT_ASKPASS_REQUIRE", "force")
                .env(
                    "SKILLER_GIT_USERNAME",
                    auth.username
                        .as_deref()
                        .filter(|value| !value.trim().is_empty())
                        .unwrap_or("git"),
                )
                .env("SKILLER_GIT_TOKEN", token);
            temp_auth.track(askpass_path);
        }
    } else if let Some(ssh_key) = auth
        .ssh_key
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        let ssh_key_path = if looks_like_private_key(ssh_key) {
            let key_content = if ssh_key.ends_with('\n') {
                ssh_key.to_string()
            } else {
                format!("{}\n", ssh_key)
            };
            let path = create_temp_file("ssh-key", &key_content, 0o600)?;
            temp_auth.track(path.clone());
            path
        } else {
            let path = expand_home_path(ssh_key);
            if !path.exists() {
                return Err(SkillerError::GitError(format!(
                    "SSH key file not found: {}",
                    path.display()
                )));
            }
            path
        };

        command.env(
            "GIT_SSH_COMMAND",
            format!(
                "ssh -i {} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new",
                shell_quote(&ssh_key_path.to_string_lossy())
            ),
        );
    }

    Ok(temp_auth)
}

fn format_git_error(
    action: &str,
    status_code: Option<i32>,
    stderr_lines: &[String],
) -> SkillerError {
    let detail = stderr_lines.join("\n");
    let detail = detail.trim();

    let mut message = if detail.is_empty() {
        format!("{} failed with exit code {:?}", action, status_code)
    } else {
        format!("{} failed: {}", action, detail)
    };

    let lower = detail.to_lowercase();
    if lower.contains("authentication failed")
        || lower.contains("permission denied")
        || lower.contains("could not read from remote repository")
        || lower.contains("could not resolve host")
        || lower.contains("repository not found")
    {
        message
            .push_str("\nPlease check the repository URL and the SSH key or token you provided.");
    }

    SkillerError::GitError(message)
}

fn run_git_command(
    args: &[&str],
    working_dir: Option<&Path>,
    auth: &GitAuthConfig,
    timeout: Duration,
    action: &str,
    mut on_stderr_line: Option<&mut dyn FnMut(String)>,
) -> Result<(), SkillerError> {
    let mut command = get_shell_command("git");
    command
        .args(args)
        .stdout(Stdio::null())
        .stderr(Stdio::piped());

    if let Some(path) = working_dir {
        command.current_dir(path);
    }

    let _temp_auth = prepare_git_auth(&mut command, auth)?;

    let mut child = command.spawn().map_err(|error| {
        SkillerError::GitError(format!("Unable to start {}: {}", action, error))
    })?;

    let (stderr_tx, stderr_rx) = mpsc::channel();
    let stderr_handle = child.stderr.take().map(|stream| {
        thread::spawn(move || {
            let reader = BufReader::new(stream);
            for line in reader.lines() {
                match line {
                    Ok(line) => {
                        let _ = stderr_tx.send(line);
                    }
                    Err(_) => break,
                }
            }
        })
    });

    let mut stderr_lines = Vec::new();

    let drain_stderr =
        |stderr_lines: &mut Vec<String>, on_stderr_line: &mut Option<&mut dyn FnMut(String)>| {
            while let Ok(line) = stderr_rx.try_recv() {
                stderr_lines.push(line.clone());
                if let Some(callback) = on_stderr_line.as_mut() {
                    callback(line);
                }
            }
        };

    let start = Instant::now();
    loop {
        drain_stderr(&mut stderr_lines, &mut on_stderr_line);

        if let Some(status) = child.try_wait()? {
            if let Some(handle) = stderr_handle {
                let _ = handle.join();
            }

            drain_stderr(&mut stderr_lines, &mut on_stderr_line);

            if status.success() {
                return Ok(());
            }

            return Err(format_git_error(action, status.code(), &stderr_lines));
        }

        if start.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            if let Some(handle) = stderr_handle {
                let _ = handle.join();
            }
            drain_stderr(&mut stderr_lines, &mut on_stderr_line);

            return Err(SkillerError::GitError(format!(
                "{} timed out after {} seconds. Please check the repository URL, network connection, access permissions, or branch name.",
                action,
                timeout.as_secs()
            )));
        }

        thread::sleep(Duration::from_millis(100));
    }
}

pub fn clone_repo(
    url: &str,
    branch: Option<&str>,
    local_path: &Path,
    on_stderr_line: Option<&mut dyn FnMut(String)>,
) -> Result<(), SkillerError> {
    let default_auth = GitAuthConfig::default();
    clone_repo_with_auth(url, branch, local_path, &default_auth, on_stderr_line)
}

pub fn clone_repo_with_auth(
    url: &str,
    branch: Option<&str>,
    local_path: &Path,
    auth: &GitAuthConfig,
    on_stderr_line: Option<&mut dyn FnMut(String)>,
) -> Result<(), SkillerError> {
    const CLONE_TIMEOUT: Duration = Duration::from_secs(60);

    let mut args = vec!["clone"];
    if let Some(branch_name) = branch.filter(|value| !value.trim().is_empty()) {
        args.extend(["--branch", branch_name, "--single-branch"]);
    }

    let local_path_string = local_path.to_string_lossy().to_string();
    args.push(url);
    args.push(local_path_string.as_str());

    run_git_command(
        &args,
        None,
        auth,
        CLONE_TIMEOUT,
        "git clone",
        on_stderr_line,
    )
}

pub fn pull_repo(
    local_path: &Path,
    branch: &str,
    auth: &GitAuthConfig,
) -> Result<(), SkillerError> {
    const PULL_TIMEOUT: Duration = Duration::from_secs(60);

    run_git_command(
        &["fetch", "--prune", "origin", branch],
        Some(local_path),
        auth,
        PULL_TIMEOUT,
        "git fetch",
        None,
    )?;

    if run_git_command(
        &["checkout", branch],
        Some(local_path),
        auth,
        PULL_TIMEOUT,
        "git checkout",
        None,
    )
    .is_err()
    {
        run_git_command(
            &[
                "checkout",
                "-b",
                branch,
                "--track",
                &format!("origin/{}", branch),
            ],
            Some(local_path),
            auth,
            PULL_TIMEOUT,
            "git checkout",
            None,
        )?;
    }

    run_git_command(
        &["pull", "--ff-only", "origin", branch],
        Some(local_path),
        auth,
        PULL_TIMEOUT,
        "git pull",
        None,
    )
}
