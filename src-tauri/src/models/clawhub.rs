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
