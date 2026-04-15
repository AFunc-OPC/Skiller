use std::fs;
use std::path::Path;

pub fn ensure_dir(path: &Path) -> std::io::Result<()> {
    if !path.exists() {
        fs::create_dir_all(path)?;
    }
    Ok(())
}

pub fn copy_file(src: &Path, dst: &Path) -> std::io::Result<()> {
    if let Some(parent) = dst.parent() {
        ensure_dir(parent)?;
    }
    fs::copy(src, dst)?;
    Ok(())
}

pub fn read_file(path: &Path) -> std::io::Result<String> {
    fs::read_to_string(path)
}

pub fn write_file(path: &Path, content: &str) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        ensure_dir(parent)?;
    }
    fs::write(path, content)
}
