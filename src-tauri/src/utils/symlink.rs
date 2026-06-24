use std::path::Path;

#[cfg(target_os = "windows")]
use std::os::windows::fs::symlink_dir;

#[cfg(not(target_os = "windows"))]
use std::os::unix::fs::symlink as symlink_dir;

use crate::error::SkillerError;

pub fn create_symlink(original: &Path, link: &Path) -> Result<(), SkillerError> {
    if let Ok(meta) = std::fs::symlink_metadata(link) {
        if meta.file_type().is_symlink() {
            std::fs::remove_file(link)?;
        } else if meta.is_dir() {
            std::fs::remove_dir_all(link)?;
        } else {
            std::fs::remove_file(link)?;
        }
    }

    if let Some(parent) = link.parent() {
        std::fs::create_dir_all(parent)?;
    }

    symlink_dir(original, link).map_err(SkillerError::IoError)?;

    Ok(())
}
