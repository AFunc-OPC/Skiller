use chrono::{DateTime, Utc};
use rusqlite::Connection;
use serde_json::Value;
use std::fs;
use std::path::{Component, Path, PathBuf};

use crate::error::SkillerError;
use crate::models::openspec::{
    OpenSpecArtifactSummary, OpenSpecBoardSnapshot, OpenSpecChangeDetail, OpenSpecChangeSummary,
    OpenSpecDocumentPreview, OpenSpecSpecFileSummary, OpenSpecTaskProgress,
    OpenSpecValidationSummary,
};
use crate::services::project_service;
use crate::utils::shell::{check_command_available, get_shell_command};

const OPENSPEC_DIR: &str = "openspec";
const CHANGES_DIR: &str = "changes";
const ARCHIVE_DIR: &str = "archive";
const SPECS_DIR: &str = "specs";

pub fn parse_task_progress(markdown: &str) -> OpenSpecTaskProgress {
    let mut total = 0;
    let mut completed = 0;

    for line in markdown.lines() {
        let trimmed = line.trim_start();
        if trimmed.starts_with("- [") {
            total += 1;
            if trimmed.starts_with("- [x]") || trimmed.starts_with("- [X]") {
                completed += 1;
            }
        }
    }

    OpenSpecTaskProgress { total, completed }
}

pub fn detect_project_state(project_path: &Path, cli_available: bool) -> String {
    if !cli_available {
        return "cli_unavailable".to_string();
    }

    let openspec_dir = project_path.join(OPENSPEC_DIR);
    let changes_dir = openspec_dir.join(CHANGES_DIR);

    if !openspec_dir.is_dir() || !changes_dir.is_dir() {
        return "not_initialized".to_string();
    }

    "ready".to_string()
}

pub fn get_board_snapshot(
    conn: &Connection,
    project_id: &str,
) -> Result<OpenSpecBoardSnapshot, SkillerError> {
    let project = project_service::get_project_by_id(conn, project_id)?;
    let project_path = PathBuf::from(&project.path);
    let cli_available = check_command_available("openspec", "--version");
    let state = detect_project_state(&project_path, cli_available);

    if state == "cli_unavailable" {
        return Ok(OpenSpecBoardSnapshot {
            project_id: project.id,
            project_path: project.path,
            state,
            cli_message: Some("OpenSpec CLI is not available in the current shell environment".to_string()),
            changes: Vec::new(),
            archived_changes: Vec::new(),
        });
    }

    if state == "not_initialized" {
        return Ok(OpenSpecBoardSnapshot {
            project_id: project.id,
            project_path: project.path,
            state,
            cli_message: Some("The current project has not been initialized for OpenSpec".to_string()),
            changes: Vec::new(),
            archived_changes: Vec::new(),
        });
    }

    let changes = load_change_summaries(&project_path, false)?;
    let archived_changes = load_change_summaries(&project_path, true)?;
    let effective_state = if changes.is_empty() && archived_changes.is_empty() {
        "ready_empty".to_string()
    } else {
        "ready".to_string()
    };

    Ok(OpenSpecBoardSnapshot {
        project_id: project.id,
        project_path: project.path,
        state: effective_state,
        cli_message: None,
        changes,
        archived_changes,
    })
}

pub fn get_change_detail(
    conn: &Connection,
    project_id: &str,
    change_id: &str,
) -> Result<OpenSpecChangeDetail, SkillerError> {
    let project = project_service::get_project_by_id(conn, project_id)?;
    let project_path = PathBuf::from(&project.path);
    let change_dir = find_change_dir(&project_path, change_id).ok_or_else(|| {
        SkillerError::InvalidInput(format!("OpenSpec change not found: {}", change_id))
    })?;

    let archived = is_archived_change(&project_path, &change_dir);
    let change = build_change_summary(&project_path, change_id, &change_dir, archived)?;
    let proposal = read_markdown_document(&change_dir.join("proposal.md"), "Proposal")?;
    let design = read_markdown_document(&change_dir.join("design.md"), "Design")?;
    let tasks = read_markdown_document(&change_dir.join("tasks.md"), "Tasks")?;
    let specs = load_spec_file_summaries(&change_dir)?;

    Ok(OpenSpecChangeDetail {
        overview_markdown: build_overview_markdown(&change),
        change,
        proposal,
        design,
        tasks,
        specs,
    })
}

pub fn get_spec_document(
    conn: &Connection,
    project_id: &str,
    change_id: &str,
    spec_path: &str,
) -> Result<OpenSpecDocumentPreview, SkillerError> {
    let project = project_service::get_project_by_id(conn, project_id)?;
    let project_path = PathBuf::from(&project.path);
    let change_dir = find_change_dir(&project_path, change_id).ok_or_else(|| {
        SkillerError::InvalidInput(format!("OpenSpec change not found: {}", change_id))
    })?;
    let spec_full_path = resolve_spec_document_path(&change_dir, spec_path)?;
    let title = relative_to_specs_dir(&change_dir, &spec_full_path)
        .unwrap_or_else(|| spec_path.replace('\\', "/"));

    read_markdown_document(&spec_full_path, &title)?.ok_or_else(|| {
        SkillerError::InvalidInput(format!("OpenSpec spec document not found: {}", spec_path))
    })
}

pub fn read_markdown_document(
    path: &Path,
    title: &str,
) -> Result<Option<OpenSpecDocumentPreview>, SkillerError> {
    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(path)?;
    let updated_at = read_updated_at(path)?;

    Ok(Some(OpenSpecDocumentPreview {
        kind: "markdown".to_string(),
        title: title.to_string(),
        path: path.to_string_lossy().to_string(),
        updated_at,
        content,
    }))
}

fn load_change_summaries(
    project_path: &Path,
    archived: bool,
) -> Result<Vec<OpenSpecChangeSummary>, SkillerError> {
    let change_dirs = discover_change_dirs(project_path, archived)?;
    let listed_changes = list_changes_json(project_path)?;
    let mut summaries = Vec::new();

    for change_dir in change_dirs {
        let Some(change_id) = change_dir.file_name().and_then(|name| name.to_str()) else {
            continue;
        };

        let mut summary = build_change_summary(project_path, change_id, &change_dir, archived)?;

        if let Some(list_item) = listed_changes.get(change_id) {
            hydrate_change_summary_from_list_item(&mut summary, list_item);
        }

        summaries.push(summary);
    }

    summaries.sort_by(|left, right| right.updated_at.cmp(&left.updated_at).then_with(|| left.id.cmp(&right.id)));

    Ok(summaries)
}

fn build_change_summary(
    project_path: &Path,
    change_id: &str,
    change_dir: &Path,
    archived: bool,
) -> Result<OpenSpecChangeSummary, SkillerError> {
    let proposal_path = change_dir.join("proposal.md");
    let design_path = change_dir.join("design.md");
    let tasks_path = change_dir.join("tasks.md");
    let specs_dir = change_dir.join(SPECS_DIR);
    let tasks_markdown = fs::read_to_string(&tasks_path).unwrap_or_default();
    let task_progress = parse_task_progress(&tasks_markdown);
    let status_json = run_openspec_json(project_path, &["status", "--change", change_id]).ok();
    let validation_json = run_openspec_json(project_path, &["validate", change_id, "--type", "change"]).ok();
    let summary = summarize_proposal(&proposal_path)?;
    let updated_at = latest_change_timestamp(change_dir)?;

    let mut summary = OpenSpecChangeSummary {
        id: change_id.to_string(),
        title: read_change_title(change_id, &proposal_path)?,
        archived,
        path: change_dir.to_string_lossy().to_string(),
        updated_at,
        summary,
        task_progress,
        artifacts: vec![
            build_artifact_summary("proposal", "Proposal", &proposal_path)?,
            build_artifact_summary("design", "Design", &design_path)?,
            build_artifact_summary("tasks", "Tasks", &tasks_path)?,
            build_specs_artifact_summary(&specs_dir)?,
        ],
        validation: summarize_validation(validation_json.as_ref()),
    };

    if let Some(status) = status_json.as_ref() {
        merge_status_into_summary(&mut summary, status);
    }

    Ok(summary)
}

fn build_artifact_summary(
    id: &str,
    label: &str,
    path: &Path,
) -> Result<OpenSpecArtifactSummary, SkillerError> {
    let exists = path.is_file();
    let updated_at = if exists { read_updated_at(path)? } else { None };

    Ok(OpenSpecArtifactSummary {
        id: id.to_string(),
        label: label.to_string(),
        exists,
        path: exists.then(|| path.to_string_lossy().to_string()),
        updated_at,
    })
}

fn build_specs_artifact_summary(specs_dir: &Path) -> Result<OpenSpecArtifactSummary, SkillerError> {
    let spec_files = collect_spec_files(specs_dir)?;
    let updated_at = most_recent_updated_at(&spec_files)?;

    Ok(OpenSpecArtifactSummary {
        id: "specs".to_string(),
        label: "Specs".to_string(),
        exists: !spec_files.is_empty(),
        path: specs_dir.is_dir().then(|| specs_dir.to_string_lossy().to_string()),
        updated_at,
    })
}

fn build_overview_markdown(change: &OpenSpecChangeSummary) -> String {
    let mut lines = vec![
        format!("# {}", change.title),
        String::new(),
        format!("- Change ID: `{}`", change.id),
        format!("- Archived: {}", if change.archived { "Yes" } else { "No" }),
        format!(
            "- Tasks: {}/{} completed",
            change.task_progress.completed, change.task_progress.total
        ),
    ];

    if let Some(updated_at) = &change.updated_at {
        lines.push(format!("- Updated: {}", updated_at));
    }

    if let Some(validation) = &change.validation {
        lines.push(format!("- Validation: {} - {}", validation.level, validation.message));
    }

    lines.push(String::new());
    lines.push("## Artifacts".to_string());
    lines.push(String::new());

    for artifact in &change.artifacts {
        let status = if artifact.exists { "present" } else { "missing" };
        lines.push(format!("- {}: {}", artifact.label, status));
    }

    if !change.summary.is_empty() {
        lines.push(String::new());
        lines.push("## Summary".to_string());
        lines.push(String::new());
        lines.push(change.summary.clone());
    }

    lines.join("\n")
}

fn hydrate_change_summary_from_list_item(summary: &mut OpenSpecChangeSummary, list_item: &Value) {
    if let Some(title) = first_string(list_item, &["title", "name", "change", "id"]) {
        summary.title = title;
    }

    if let Some(archived) = first_bool(list_item, &["archived", "isArchived"]) {
        summary.archived = archived;
    }

    if let Some(updated_at) = first_string(list_item, &["updated_at", "updatedAt", "modified_at", "modifiedAt"]) {
        summary.updated_at = Some(updated_at);
    }

    if let Some(summary_text) = first_string(list_item, &["summary", "description"]) {
        summary.summary = summary_text;
    }
}

fn merge_status_into_summary(summary: &mut OpenSpecChangeSummary, status: &Value) {
    if let Some(artifacts) = status
        .get("artifacts")
        .and_then(Value::as_array)
        .or_else(|| status.get("steps").and_then(Value::as_array))
    {
        for artifact in &mut summary.artifacts {
            if let Some(entry) = artifacts.iter().find(|entry| {
                let id = first_string(entry, &["id", "name", "artifact_id", "artifact"]);
                id.as_deref() == Some(artifact.id.as_str())
            }) {
                if let Some(exists) = first_bool(entry, &["exists", "completed", "present"]) {
                    artifact.exists = artifact.exists || exists;
                }

                if artifact.updated_at.is_none() {
                    artifact.updated_at = first_string(entry, &["updated_at", "updatedAt"]);
                }
            }
        }
    }
}

fn summarize_validation(validation: Option<&Value>) -> Option<OpenSpecValidationSummary> {
    let validation = validation?;

    if let Some(summary) = validation.get("summary") {
        let level = first_string(summary, &["level", "status", "severity"])
            .or_else(|| first_string(validation, &["level", "status", "severity"]))
            .unwrap_or_else(|| "ok".to_string())
            .to_lowercase();
        let message = first_string(summary, &["message", "text"])
            .or_else(|| first_string(validation, &["message", "text"]))
            .unwrap_or_else(|| "Validation completed".to_string());

        return Some(OpenSpecValidationSummary { level, message });
    }

    let issues = validation
        .get("issues")
        .and_then(Value::as_array)
        .or_else(|| validation.get("results").and_then(Value::as_array));

    let issues = issues?;
    if issues.is_empty() {
        return Some(OpenSpecValidationSummary {
            level: "ok".to_string(),
            message: "No validation issues".to_string(),
        });
    }

    let mut chosen_level = "ok".to_string();
    let mut chosen_message = "Validation issues found".to_string();

    for issue in issues {
        let level = first_string(issue, &["level", "severity", "status"])
            .unwrap_or_else(|| "warning".to_string())
            .to_lowercase();
        let message = first_string(issue, &["message", "text"])
            .unwrap_or_else(|| "Validation issue".to_string());

        if severity_rank(&level) > severity_rank(&chosen_level) {
            chosen_level = level;
            chosen_message = message;
        }
    }

    Some(OpenSpecValidationSummary {
        level: chosen_level,
        message: chosen_message,
    })
}

fn severity_rank(level: &str) -> usize {
    match level {
        "critical" | "error" => 3,
        "warning" => 2,
        "suggestion" | "info" => 1,
        _ => 0,
    }
}

fn read_change_title(change_id: &str, proposal_path: &Path) -> Result<String, SkillerError> {
    if let Some(document) = read_markdown_document(proposal_path, "Proposal")? {
        for line in document.content.lines() {
            let trimmed = line.trim();
            if let Some(title) = trimmed.strip_prefix("# ") {
                let title = title.trim();
                if !title.is_empty() {
                    return Ok(title.to_string());
                }
            }
        }
    }

    Ok(change_id.to_string())
}

fn summarize_proposal(proposal_path: &Path) -> Result<String, SkillerError> {
    let Some(document) = read_markdown_document(proposal_path, "Proposal")? else {
        return Ok(String::new());
    };

    Ok(first_non_heading_paragraph(&document.content).unwrap_or_default())
}

fn first_non_heading_paragraph(markdown: &str) -> Option<String> {
    let mut paragraphs = Vec::new();

    for line in markdown.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            if !paragraphs.is_empty() {
                break;
            }
            continue;
        }

        if trimmed.starts_with('#') {
            continue;
        }

        paragraphs.push(trimmed.to_string());
    }

    if paragraphs.is_empty() {
        None
    } else {
        Some(paragraphs.join(" "))
    }
}

fn list_changes_json(project_path: &Path) -> Result<std::collections::HashMap<String, Value>, SkillerError> {
    let mut items_by_id = std::collections::HashMap::new();
    let Ok(json) = run_openspec_json(project_path, &["list", "--changes"]) else {
        return Ok(items_by_id);
    };

    let items = json
        .get("changes")
        .and_then(Value::as_array)
        .or_else(|| json.as_array())
        .cloned()
        .unwrap_or_default();

    for item in items {
        if let Some(id) = first_string(&item, &["id", "name", "change"]) {
            items_by_id.insert(id, item);
        }
    }

    Ok(items_by_id)
}

fn run_openspec_json(project_path: &Path, args: &[&str]) -> Result<Value, SkillerError> {
    let output = get_shell_command("openspec")
        .current_dir(project_path)
        .args(args)
        .arg("--json")
        .output()?;

    if !output.status.success() {
        return Err(SkillerError::InvalidInput(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ));
    }

    Ok(serde_json::from_slice(&output.stdout)?)
}

fn discover_change_dirs(project_path: &Path, archived: bool) -> Result<Vec<PathBuf>, SkillerError> {
    let root = if archived {
        project_path.join(OPENSPEC_DIR).join(CHANGES_DIR).join(ARCHIVE_DIR)
    } else {
        project_path.join(OPENSPEC_DIR).join(CHANGES_DIR)
    };

    if !root.is_dir() {
        return Ok(Vec::new());
    }

    let mut dirs = Vec::new();
    if archived {
        for archive_bucket in fs::read_dir(&root)? {
            let archive_bucket = archive_bucket?;
            let archive_bucket_path = archive_bucket.path();
            if !archive_bucket_path.is_dir() {
                continue;
            }

            for entry in fs::read_dir(archive_bucket_path)? {
                let entry = entry?;
                let path = entry.path();
                if path.is_dir() {
                    dirs.push(path);
                }
            }
        }
    } else {
        for entry in fs::read_dir(&root)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir()
                && path
                    .file_name()
                    .and_then(|name| name.to_str())
                    .map(|name| name != ARCHIVE_DIR)
                    .unwrap_or(false)
            {
                dirs.push(path);
            }
        }
    }

    Ok(dirs)
}

fn find_change_dir(project_path: &Path, change_id: &str) -> Option<PathBuf> {
    let active = project_path
        .join(OPENSPEC_DIR)
        .join(CHANGES_DIR)
        .join(change_id);
    if active.is_dir() {
        return Some(active);
    }

    let archive_root = project_path.join(OPENSPEC_DIR).join(CHANGES_DIR).join(ARCHIVE_DIR);
    if !archive_root.is_dir() {
        return None;
    }

    let buckets = fs::read_dir(archive_root).ok()?;
    for bucket in buckets.flatten() {
        let candidate = bucket.path().join(change_id);
        if candidate.is_dir() {
            return Some(candidate);
        }
    }

    None
}

fn is_archived_change(project_path: &Path, change_dir: &Path) -> bool {
    let archive_root = project_path.join(OPENSPEC_DIR).join(CHANGES_DIR).join(ARCHIVE_DIR);
    change_dir.starts_with(archive_root)
}

fn load_spec_file_summaries(change_dir: &Path) -> Result<Vec<OpenSpecSpecFileSummary>, SkillerError> {
    let specs_dir = change_dir.join(SPECS_DIR);
    let spec_files = collect_spec_files(&specs_dir)?;
    let mut summaries = Vec::new();

    for path in spec_files {
        let title = relative_to_specs_dir(change_dir, &path)
            .unwrap_or_else(|| path.file_name().and_then(|name| name.to_str()).unwrap_or("spec.md").to_string());
        let updated_at = read_updated_at(&path)?;

        summaries.push(OpenSpecSpecFileSummary {
            path: path.to_string_lossy().to_string(),
            title,
            updated_at,
        });
    }

    summaries.sort_by(|left, right| left.title.cmp(&right.title));
    Ok(summaries)
}

fn collect_spec_files(specs_dir: &Path) -> Result<Vec<PathBuf>, SkillerError> {
    let mut files = Vec::new();
    if !specs_dir.is_dir() {
        return Ok(files);
    }

    collect_spec_files_recursive(specs_dir, &mut files)?;
    Ok(files)
}

fn collect_spec_files_recursive(dir: &Path, files: &mut Vec<PathBuf>) -> Result<(), SkillerError> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            collect_spec_files_recursive(&path, files)?;
        } else if path
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.eq_ignore_ascii_case("md"))
            .unwrap_or(false)
        {
            files.push(path);
        }
    }

    Ok(())
}

fn resolve_spec_document_path(change_dir: &Path, spec_path: &str) -> Result<PathBuf, SkillerError> {
    let input_path = Path::new(spec_path);
    let spec_full_path = if input_path.is_absolute() {
        input_path.to_path_buf()
    } else {
        change_dir.join(spec_path)
    };

    if !spec_full_path.starts_with(change_dir.join(SPECS_DIR)) {
        return Err(SkillerError::InvalidInput(format!(
            "Spec path must be inside the change specs directory: {}",
            spec_path
        )));
    }

    for component in spec_full_path.components() {
        if matches!(component, Component::ParentDir) {
            return Err(SkillerError::InvalidInput(format!(
                "Spec path cannot escape the change directory: {}",
                spec_path
            )));
        }
    }

    Ok(spec_full_path)
}

fn relative_to_specs_dir(change_dir: &Path, path: &Path) -> Option<String> {
    path.strip_prefix(change_dir.join(SPECS_DIR))
        .ok()
        .map(|relative| relative.to_string_lossy().replace('\\', "/"))
}

fn latest_change_timestamp(change_dir: &Path) -> Result<Option<String>, SkillerError> {
    let mut paths = vec![
        change_dir.join("proposal.md"),
        change_dir.join("design.md"),
        change_dir.join("tasks.md"),
    ];
    paths.extend(collect_spec_files(&change_dir.join(SPECS_DIR))?);

    if paths.iter().all(|path| !path.exists()) {
        return read_updated_at(change_dir);
    }

    most_recent_updated_at(&paths)
}

fn most_recent_updated_at(paths: &[PathBuf]) -> Result<Option<String>, SkillerError> {
    let mut latest: Option<DateTime<Utc>> = None;

    for path in paths {
        let Some(updated_at) = read_updated_at_datetime(path)? else {
            continue;
        };

        if latest.as_ref().map(|current| updated_at > *current).unwrap_or(true) {
            latest = Some(updated_at);
        }
    }

    Ok(latest.map(|date| date.to_rfc3339()))
}

fn read_updated_at(path: &Path) -> Result<Option<String>, SkillerError> {
    Ok(read_updated_at_datetime(path)?.map(|time| time.to_rfc3339()))
}

fn read_updated_at_datetime(path: &Path) -> Result<Option<DateTime<Utc>>, SkillerError> {
    if !path.exists() {
        return Ok(None);
    }

    let updated_at = fs::metadata(path)?
        .modified()
        .ok()
        .map(DateTime::<Utc>::from);

    Ok(updated_at)
}

fn first_string(value: &Value, keys: &[&str]) -> Option<String> {
    for key in keys {
        if let Some(text) = value.get(key).and_then(Value::as_str) {
            if !text.is_empty() {
                return Some(text.to_string());
            }
        }
    }

    None
}

fn first_bool(value: &Value, keys: &[&str]) -> Option<bool> {
    for key in keys {
        if let Some(flag) = value.get(key).and_then(Value::as_bool) {
            return Some(flag);
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::{
        detect_project_state, first_non_heading_paragraph, load_spec_file_summaries,
        parse_task_progress, read_markdown_document, resolve_spec_document_path,
    };
    use crate::db::connection::create_test_connection;
    use crate::models::project::CreateProjectRequest;
    use crate::services::openspec_service;
    use crate::services::project_service;
    use std::fs;

    #[test]
    fn parses_markdown_checkbox_progress() {
        let markdown = "- [x] create proposal\n- [ ] implement board\n- [x] add tests\n";
        let progress = parse_task_progress(markdown);

        assert_eq!(progress.total, 3);
        assert_eq!(progress.completed, 2);
    }

    #[test]
    fn reports_cli_unavailable_when_openspec_is_missing() {
        let temp = tempfile::tempdir().unwrap();
        let state = detect_project_state(temp.path(), false);

        assert_eq!(state, "cli_unavailable");
    }

    #[test]
    fn reports_not_initialized_when_project_has_no_openspec_dir() {
        let temp = tempfile::tempdir().unwrap();
        let state = detect_project_state(temp.path(), true);

        assert_eq!(state, "not_initialized");
    }

    #[test]
    fn reports_ready_when_openspec_changes_dir_exists() {
        let temp = tempfile::tempdir().unwrap();
        fs::create_dir_all(temp.path().join("openspec/changes")).unwrap();

        let state = detect_project_state(temp.path(), true);

        assert_eq!(state, "ready");
    }

    #[test]
    fn returns_none_for_missing_markdown_document() {
        let temp = tempfile::tempdir().unwrap();
        let missing = temp.path().join("proposal.md");

        let document = read_markdown_document(&missing, "Proposal").unwrap();

        assert!(document.is_none());
    }

    #[test]
    fn reads_existing_markdown_document() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("design.md");
        fs::write(&path, "# Design\n\nBoard helpers\n").unwrap();

        let document = read_markdown_document(&path, "Design")
            .unwrap()
            .expect("existing markdown document");

        assert_eq!(document.kind, "markdown");
        assert_eq!(document.title, "Design");
        assert_eq!(document.path, path.to_string_lossy());
        assert_eq!(document.content, "# Design\n\nBoard helpers\n");
        assert!(document.updated_at.is_some());
    }

    #[test]
    fn extracts_first_non_heading_paragraph_from_markdown() {
        let markdown = "# Proposal\n\nFirst paragraph.\nStill same paragraph.\n\n## Next\n\nOther";
        let summary = first_non_heading_paragraph(markdown);

        assert_eq!(summary.as_deref(), Some("First paragraph. Still same paragraph."));
    }

    #[test]
    fn loads_spec_file_summaries_with_relative_titles() {
        let temp = tempfile::tempdir().unwrap();
        let change_dir = temp.path().join("openspec/changes/add-board");
        let nested_dir = change_dir.join("specs/auth");
        fs::create_dir_all(&nested_dir).unwrap();
        fs::write(nested_dir.join("spec.md"), "# Auth Spec\n").unwrap();

        let specs = load_spec_file_summaries(&change_dir).unwrap();

        assert_eq!(specs.len(), 1);
        assert_eq!(specs[0].title, "auth/spec.md");
        assert!(specs[0].path.ends_with("specs/auth/spec.md"));
    }

    #[test]
    fn rejects_spec_paths_outside_specs_directory() {
        let temp = tempfile::tempdir().unwrap();
        let change_dir = temp.path().join("openspec/changes/add-board");
        fs::create_dir_all(change_dir.join("specs")).unwrap();

        let error = resolve_spec_document_path(&change_dir, "../proposal.md").unwrap_err();

        assert!(error.to_string().contains("inside the change specs directory"));
    }

    #[test]
    fn assembles_ready_empty_snapshot_for_initialized_project_without_changes() {
        let temp = tempfile::tempdir().unwrap();
        fs::create_dir_all(temp.path().join("openspec/changes")).unwrap();

        let conn = create_test_connection().unwrap();
        let project = project_service::create_project(
            &conn,
            CreateProjectRequest {
                name: "OpenSpec Demo".to_string(),
                path: temp.path().to_string_lossy().to_string(),
                skill_path: ".skills".to_string(),
                tool_preset_id: None,
                description: None,
                icon: None,
            },
        )
        .unwrap();

        let snapshot = openspec_service::get_board_snapshot(&conn, &project.id).unwrap();

        assert_eq!(snapshot.project_id, project.id);
        assert_eq!(snapshot.project_path, project.path);
        assert!(matches!(snapshot.state.as_str(), "ready_empty" | "cli_unavailable"));
        if snapshot.state == "ready_empty" {
            assert!(snapshot.changes.is_empty());
            assert!(snapshot.archived_changes.is_empty());
            assert!(snapshot.cli_message.is_none());
        }
    }
}
