use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClawhubSource {
    pub id: String,
    pub name: String,
    pub registry_url: String,
    pub token: String,
    pub connection_type: String,
    pub cli_path: Option<String>,
    pub is_enabled: bool,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateClawhubSourceRequest {
    pub name: String,
    pub registry_url: String,
    pub token: String,
    pub connection_type: String,
    pub cli_path: Option<String>,
    pub is_enabled: Option<bool>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateClawhubSourceRequest {
    pub id: String,
    pub name: Option<String>,
    pub registry_url: Option<String>,
    pub token: Option<String>,
    pub connection_type: Option<String>,
    pub cli_path: Option<String>,
    pub is_enabled: Option<bool>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClawhubExploreResponse {
    pub skills: Vec<ClawhubSkill>,
    #[serde(default)]
    pub total: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClawhubSearchResult {
    pub slug: String,
    #[serde(default)]
    pub display_name: String,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub score: Option<f64>,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub updated_at: Option<i64>,
    #[serde(default)]
    pub owner_handle: Option<String>,
}

impl ClawhubSearchResult {
    pub fn into_clawhub_skill(self) -> ClawhubSkill {
        ClawhubSkill {
            slug: self.slug,
            name: self.display_name,
            description: self.summary,
            version: self.version,
            downloads: None,
            rating: None,
            created_at: None,
            updated_at: self.updated_at.map(|t| t.to_string()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClawhubSearchResponse {
    pub results: Vec<ClawhubSearchResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClawhubSkill {
    pub slug: String,
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub downloads: Option<i64>,
    pub rating: Option<f64>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClawhubCliExploreResponse {
    pub items: Vec<ClawhubCliItem>,
    #[serde(default)]
    pub next_cursor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClawhubCliItem {
    pub slug: String,
    #[serde(default)]
    pub display_name: String,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub tags: Option<serde_json::Value>,
    #[serde(default)]
    pub stats: Option<serde_json::Value>,
    #[serde(default)]
    pub created_at: Option<i64>,
    #[serde(default)]
    pub updated_at: Option<i64>,
    #[serde(default)]
    pub latest_version: Option<serde_json::Value>,
}

impl ClawhubCliItem {
    pub fn into_clawhub_skill(self) -> ClawhubSkill {
        let version = self.latest_version.as_ref()
            .and_then(|v| v.get("version"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        let downloads = self.stats.as_ref()
            .and_then(|s| s.get("installsAllTime"))
            .and_then(|v| v.as_i64());
        let rating = self.stats.as_ref()
            .and_then(|s| s.get("stars"))
            .and_then(|v| v.as_f64());
        ClawhubSkill {
            slug: self.slug,
            name: self.display_name,
            description: self.summary,
            version,
            downloads,
            rating,
            created_at: self.created_at.map(|t| t.to_string()),
            updated_at: self.updated_at.map(|t| t.to_string()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClawhubSkillDetail {
    pub slug: String,
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub downloads: Option<i64>,
    pub rating: Option<f64>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub skill_md_content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClawhubSkillOverview {
    pub slug: String,
    pub name: String,
    pub description: Option<String>,
    pub summary: Option<String>,
    pub version: Option<String>,
    pub downloads: Option<i64>,
    pub rating: Option<f64>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub owner_handle: Option<String>,
    pub owner_name: Option<String>,
    pub metadata_os: Option<Vec<String>>,
    pub metadata_systems: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClawhubSkillVersionItem {
    pub version: String,
    pub created_at: Option<String>,
    pub changelog: Option<String>,
    pub is_latest: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClawhubSkillFileEntry {
    pub path: String,
    pub size: Option<i64>,
    pub content_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClawhubSkillFileContent {
    pub path: String,
    pub content: Option<String>,
    pub is_markdown: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClawhubApiVersionSummary {
    pub version: String,
    #[serde(default)]
    pub created_at: Option<i64>,
    #[serde(default)]
    pub changelog: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClawhubApiSkillMetadata {
    #[serde(default)]
    pub os: Option<Vec<String>>,
    #[serde(default)]
    pub systems: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClawhubApiOwner {
    pub handle: String,
    #[serde(default)]
    pub display_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClawhubApiSkillDetailResponse {
    pub skill: ClawhubCliItem,
    #[serde(default)]
    pub latest_version: Option<ClawhubApiVersionSummary>,
    #[serde(default)]
    pub metadata: Option<ClawhubApiSkillMetadata>,
    #[serde(default)]
    pub owner: Option<ClawhubApiOwner>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClawhubApiVersionsResponse {
    pub versions: Vec<ClawhubApiVersionSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClawhubApiFileEntry {
    pub path: String,
    #[serde(default)]
    pub size: Option<i64>,
    #[serde(default)]
    pub content_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClawhubApiVersionDetail {
    pub version: String,
    #[serde(default)]
    pub files: Vec<ClawhubApiFileEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClawhubApiVersionDetailResponse {
    pub version: ClawhubApiVersionDetail,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    pub message: String,
    pub username: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportSkillsRequest {
    pub source_id: String,
    pub slugs: Vec<String>,
    pub overwrite: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportSkillResult {
    pub slug: String,
    pub success: bool,
    pub error: Option<String>,
    pub skill_id: Option<String>,
    pub already_exists: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateCheckResult {
    pub slug: String,
    pub exists: bool,
    pub existing_skill_id: Option<String>,
    pub existing_skill_name: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::ClawhubCliItem;

    #[test]
    fn converts_cli_item_stats_and_timestamps_into_skill_metadata() {
        let item = ClawhubCliItem {
            slug: "demo-skill".to_string(),
            display_name: "Demo Skill".to_string(),
            summary: Some("Summary".to_string()),
            tags: None,
            stats: Some(serde_json::json!({
                "installsAllTime": 42,
                "stars": 4.5
            })),
            created_at: Some(1_747_139_696),
            updated_at: Some(1_747_139_696),
            latest_version: Some(serde_json::json!({
                "version": "1.2.3"
            })),
        };

        let skill = item.into_clawhub_skill();

        assert_eq!(skill.slug, "demo-skill");
        assert_eq!(skill.name, "Demo Skill");
        assert_eq!(skill.description.as_deref(), Some("Summary"));
        assert_eq!(skill.version.as_deref(), Some("1.2.3"));
        assert_eq!(skill.downloads, Some(42));
        assert_eq!(skill.rating, Some(4.5));
        assert_eq!(skill.created_at.as_deref(), Some("1747139696"));
        assert_eq!(skill.updated_at.as_deref(), Some("1747139696"));
    }
}
