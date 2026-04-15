use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub file_path: String,
    pub source: String,
    pub source_metadata: Option<String>,
    pub repo_id: Option<String>,
    pub tags: Vec<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SourceMetadata {
    #[serde(rename = "file")]
    File { original_path: String },
    #[serde(rename = "npx")]
    Npx { command: String },
    #[serde(rename = "repository")]
    Repository { repo_id: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSkillRequest {
    pub name: String,
    pub description: Option<String>,
    pub file_path: String,
    pub source: String,
    pub source_metadata: Option<SourceMetadata>,
    pub repo_id: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSkillRequest {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
}
