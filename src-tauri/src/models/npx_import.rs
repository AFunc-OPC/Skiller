use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NpxImportLogEntry {
    pub stage: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NpxImportProgressEvent {
    pub request_id: String,
    pub entry: NpxImportLogEntry,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ParsedNpxSkillCommand {
    pub repo_url: String,
    pub skill_name: String,
    pub branch: Option<String>,
    pub skill_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NpxImportToolStatus {
    pub git: bool,
    pub npx: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NpxSkillImportSummary {
    pub skill_name: String,
    pub display_name: String,
    pub repo_url: String,
    pub branch: Option<String>,
    pub skill_path: String,
    pub staged_path: String,
    pub required_tools: Vec<String>,
    pub exists_in_skiller: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PrepareNpxSkillImportResponse {
    pub session_id: String,
    pub command: String,
    pub parsed: ParsedNpxSkillCommand,
    pub tools: NpxImportToolStatus,
    pub logs: Vec<NpxImportLogEntry>,
    pub summary: NpxSkillImportSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ConfirmNpxSkillImportResponse {
    pub skill_path: String,
    pub imported_skill_name: String,
    pub cleaned_up: bool,
    pub is_update: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ManagedNpxImportSession {
    pub session_id: String,
    pub command: String,
    pub parsed: ParsedNpxSkillCommand,
    pub summary: NpxSkillImportSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NativeNpxProgressEvent {
    pub request_id: String,
    pub line: String,
    pub is_error: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NativeNpxImportResponse {
    pub success: bool,
    pub skill_name: String,
    pub exists_in_skiller: bool,
    pub logs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SyncToSkillerResponse {
    pub skill_name: String,
    pub skill_path: String,
    pub is_update: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AgentsSkillInfo {
    pub name: String,
    pub path: String,
    pub has_skill_md: bool,
}
