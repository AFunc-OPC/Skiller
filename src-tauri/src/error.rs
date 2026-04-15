use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SkillerError {
    #[error("Skill not found: {0}")]
    SkillNotFound(String),

    #[error("Tag name already exists: {0}")]
    TagNameExists(String),

    #[error("Tag not found: {0}")]
    TagNotFound(String),

    #[error("Project not found: {0}")]
    ProjectNotFound(String),

    #[error("Repository not found: {0}")]
    RepoNotFound(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Database error: {0}")]
    DatabaseError(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("Git error: {0}")]
    GitError(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),
}

impl Serialize for SkillerError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("SkillerError", 2)?;
        state.serialize_field("code", &self.error_code())?;
        state.serialize_field("message", &self.to_string())?;
        state.end()
    }
}

impl SkillerError {
    pub fn error_code(&self) -> &str {
        match self {
            SkillerError::SkillNotFound(_) => "SKILL_NOT_FOUND",
            SkillerError::TagNameExists(_) => "TAG_EXISTS",
            SkillerError::TagNotFound(_) => "TAG_NOT_FOUND",
            SkillerError::ProjectNotFound(_) => "PROJECT_NOT_FOUND",
            SkillerError::RepoNotFound(_) => "REPO_NOT_FOUND",
            SkillerError::ValidationError(_) => "VALIDATION_ERROR",
            SkillerError::DatabaseError(_) => "DATABASE_ERROR",
            SkillerError::IoError(_) => "IO_ERROR",
            SkillerError::JsonError(_) => "JSON_ERROR",
            SkillerError::GitError(_) => "GIT_ERROR",
            SkillerError::InvalidInput(_) => "INVALID_INPUT",
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
}

impl From<SkillerError> for ApiError {
    fn from(err: SkillerError) -> Self {
        ApiError {
            code: err.error_code().to_string(),
            message: err.to_string(),
        }
    }
}
