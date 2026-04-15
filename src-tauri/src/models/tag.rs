use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub group_id: String,
    pub parent_id: Option<String>,
    pub materialized_path: String,
    pub depth: i32,
    pub is_builtin: bool,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub skill_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagGroup {
    pub id: String,
    pub name: String,
    pub is_builtin: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTagRequest {
    pub name: String,
    pub group_id: String,
    pub parent_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTagRequest {
    pub id: String,
    pub name: Option<String>,
    pub parent_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveTagRequest {
    pub tag_id: String,
    pub new_parent_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreeNode {
    pub tag: Tag,
    pub children: Vec<TreeNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeleteTagOptions {
    pub delete_children: bool,
}
