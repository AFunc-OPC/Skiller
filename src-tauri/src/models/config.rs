use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProxyMode {
    None,
    System,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SystemProxyConfig {
    pub prefer_https: bool,
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomProxyConfig {
    pub protocols: Vec<String>,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub bypass: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyConfig {
    pub mode: ProxyMode,
    pub system: Option<SystemProxyConfig>,
    pub custom: Option<CustomProxyConfig>,
}

impl Default for ProxyConfig {
    fn default() -> Self {
        ProxyConfig {
            mode: ProxyMode::None,
            system: None,
            custom: None,
        }
    }
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
