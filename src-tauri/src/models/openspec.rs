use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct OpenSpecTaskProgress {
    pub total: usize,
    pub completed: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct OpenSpecArtifactSummary {
    pub id: String,
    pub label: String,
    pub exists: bool,
    pub path: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct OpenSpecValidationSummary {
    pub level: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct OpenSpecChangeSummary {
    pub id: String,
    pub title: String,
    pub archived: bool,
    pub path: String,
    pub updated_at: Option<String>,
    pub summary: String,
    pub task_progress: OpenSpecTaskProgress,
    pub artifacts: Vec<OpenSpecArtifactSummary>,
    pub validation: Option<OpenSpecValidationSummary>,
}

#[derive(Debug, Clone, Serialize)]
pub struct OpenSpecDocumentPreview {
    pub kind: String,
    pub title: String,
    pub path: String,
    pub updated_at: Option<String>,
    pub content: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct OpenSpecSpecFileSummary {
    pub path: String,
    pub title: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct OpenSpecChangeDetail {
    pub change: OpenSpecChangeSummary,
    pub overview_markdown: String,
    pub proposal: Option<OpenSpecDocumentPreview>,
    pub design: Option<OpenSpecDocumentPreview>,
    pub tasks: Option<OpenSpecDocumentPreview>,
    pub specs: Vec<OpenSpecSpecFileSummary>,
}

#[derive(Debug, Clone, Serialize)]
pub struct OpenSpecBoardSnapshot {
    pub project_id: String,
    pub project_path: String,
    pub state: String,
    pub cli_message: Option<String>,
    pub changes: Vec<OpenSpecChangeSummary>,
    pub archived_changes: Vec<OpenSpecChangeSummary>,
}
