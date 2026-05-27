use serde::{Deserialize, Serialize};

use super::distribution::SkillDistributionTarget;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictInfo {
    pub skill_id: String,
    pub skill_name: String,
    pub target_path: String,
    pub target_label: String,
    pub exists: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckConflictsRequest {
    pub skill_ids: Vec<String>,
    pub skill_names: Vec<String>,
    pub target: SkillDistributionTarget,
    pub preset_ids: Vec<String>,
    pub project_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckConflictsResult {
    pub conflicts: Vec<ConflictInfo>,
}