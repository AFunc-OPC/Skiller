use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SkillerError {
    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Database error: {0}")]
    DatabaseError(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),

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
            SkillerError::ValidationError(_) => "VALIDATION_ERROR",
            SkillerError::DatabaseError(_) => "DATABASE_ERROR",
            SkillerError::IoError(_) => "IO_ERROR",
            SkillerError::JsonError(_) => "JSON_ERROR",
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
