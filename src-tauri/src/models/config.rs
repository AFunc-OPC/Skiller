use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolPreset {
    pub id: String,
    pub name: String,
    pub skill_path: String,
    pub global_path: String,
    pub is_builtin: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateToolPresetRequest {
    pub name: String,
    pub skill_path: String,
    pub global_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateToolPresetRequest {
    pub id: String,
    pub name: Option<String>,
    pub skill_path: Option<String>,
    pub global_path: Option<String>,
}
