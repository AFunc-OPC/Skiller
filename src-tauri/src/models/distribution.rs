use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SkillDistributionTarget {
    Global,
    Project,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SkillDistributionMode {
    Copy,
    Symlink,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistributeSkillRequest {
    pub skill_id: String,
    pub target: SkillDistributionTarget,
    pub preset_id: String,
    pub project_id: Option<String>,
    pub mode: SkillDistributionMode,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DistributeSkillResult {
    pub target_path: String,
    pub target: SkillDistributionTarget,
    pub mode: SkillDistributionMode,
}
