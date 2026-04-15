use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Repo {
    pub id: String,
    pub name: String,
    pub url: String,
    pub local_path: Option<String>,
    pub branch: String,
    pub last_sync: Option<String>,
    pub is_builtin: bool,
    pub created_at: String,
    pub updated_at: String,
    pub description: Option<String>,
    pub skill_relative_path: Option<String>,
    pub auth_method: Option<String>,
    pub username: Option<String>,
    pub token: Option<String>,
    pub ssh_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRepoRequest {
    pub name: String,
    pub url: String,
    pub branch: String,
    pub description: Option<String>,
    pub skill_relative_path: Option<String>,
    pub auth_method: Option<String>,
    pub username: Option<String>,
    pub token: Option<String>,
    pub ssh_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateRepoRequest {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub skill_relative_path: Option<String>,
    pub branch: Option<String>,
    pub auth_method: Option<String>,
    pub username: Option<String>,
    pub token: Option<String>,
    pub ssh_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoSyncEvent {
    pub request_id: String,
    pub repo_id: String,
    pub status: String,
    pub repo: Option<Repo>,
    pub error: Option<String>,
    pub recovery_action: Option<String>,
}
