use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub skill_path: String,
    pub tool_preset_id: Option<String>,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub is_builtin: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub path: String,
    pub skill_path: String,
    pub tool_preset_id: Option<String>,
    pub description: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProjectRequest {
    pub name: Option<String>,
    #[serde(default, deserialize_with = "deserialize_null_as_some_none")]
    pub description: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserialize_null_as_some_none")]
    pub icon: Option<Option<String>>,
}

fn deserialize_null_as_some_none<'de, D>(
    deserializer: D,
) -> Result<Option<Option<String>>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let opt = Option::<String>::deserialize(deserializer)?;
    Ok(Some(opt))
}
