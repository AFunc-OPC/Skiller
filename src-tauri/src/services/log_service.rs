use chrono::Utc;
use directories::ProjectDirs;
use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

use crate::models::{LogEntry, LogFilter, LogStats};

pub struct LogService {
    log_file_path: PathBuf,
    buffer: Mutex<Vec<LogEntry>>,
}

impl LogService {
    pub fn new() -> Result<Self, String> {
        let project_dirs = ProjectDirs::from("com", "skiller", "Skiller")
            .ok_or("Failed to get project directories")?;

        let log_dir = project_dirs.data_dir().join("logs");
        fs::create_dir_all(&log_dir).map_err(|e| e.to_string())?;

        let log_file_path = log_dir.join("skiller.log");

        Ok(Self {
            log_file_path,
            buffer: Mutex::new(Vec::new()),
        })
    }

    pub fn log(
        &self,
        app: Option<&AppHandle>,
        level: &str,
        source: &str,
        message: &str,
        metadata: Option<serde_json::Value>,
    ) {
        let entry = LogEntry {
            timestamp: Utc::now().to_rfc3339(),
            level: level.to_string(),
            source: source.to_string(),
            message: message.to_string(),
            metadata,
        };

        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_file_path)
        {
            let json = serde_json::to_string(&entry).unwrap_or_default();
            let _ = writeln!(file, "{}", json);
        }

        if let Ok(mut buffer) = self.buffer.lock() {
            buffer.push(entry.clone());
            if buffer.len() > 10000 {
                buffer.remove(0);
            }
        }

        if let Some(app_handle) = app {
            let _ = app_handle.emit("log:new", &entry);
        }
    }

    pub fn get_logs(&self, filter: LogFilter) -> Result<Vec<LogEntry>, String> {
        let mut entries = Vec::new();

        if let Ok(file) = File::open(&self.log_file_path) {
            let reader = BufReader::new(file);
            for line in reader.lines() {
                if let Ok(line) = line {
                    if let Ok(entry) = serde_json::from_str::<LogEntry>(&line) {
                        entries.push(entry);
                    }
                }
            }
        }

        entries = self.apply_filter(entries, filter);

        Ok(entries)
    }

    fn apply_filter(&self, mut entries: Vec<LogEntry>, filter: LogFilter) -> Vec<LogEntry> {
        if let Some(level) = &filter.level {
            entries.retain(|e| &e.level == level);
        }

        if let Some(keyword) = &filter.keyword {
            let keyword_lower = keyword.to_lowercase();
            entries.retain(|e| {
                e.message.to_lowercase().contains(&keyword_lower)
                    || e.source.to_lowercase().contains(&keyword_lower)
            });
        }

        if let Some(start) = &filter.start_time {
            entries.retain(|e| &e.timestamp >= start);
        }

        if let Some(end) = &filter.end_time {
            entries.retain(|e| &e.timestamp <= end);
        }

        if let Some(limit) = filter.limit {
            let start = entries.len().saturating_sub(limit);
            entries = entries.split_off(start);
        }

        entries
    }

    pub fn export_logs(&self, format: &str, path: &str, filter: LogFilter) -> Result<(), String> {
        let entries = self.get_logs(filter)?;
        let content = match format {
            "json" => serde_json::to_string_pretty(&entries).map_err(|e| e.to_string())?,
            _ => entries
                .iter()
                .map(|e| {
                    format!(
                        "[{}] [{}] [{}] {}",
                        e.timestamp, e.level, e.source, e.message
                    )
                })
                .collect::<Vec<_>>()
                .join("\n"),
        };

        fs::write(path, content).map_err(|e| e.to_string())
    }

    pub fn clear_logs(&self) -> Result<(), String> {
        if let Ok(mut file) = OpenOptions::new()
            .write(true)
            .truncate(true)
            .open(&self.log_file_path)
        {
            let _ = file.write_all(b"");
        }

        if let Ok(mut buffer) = self.buffer.lock() {
            buffer.clear();
        }

        Ok(())
    }

    pub fn get_stats(&self) -> Result<LogStats, String> {
        let entries = self.get_logs(LogFilter::default())?;

        Ok(LogStats {
            total: entries.len(),
            info_count: entries.iter().filter(|e| e.level == "INFO").count(),
            warn_count: entries.iter().filter(|e| e.level == "WARN").count(),
            error_count: entries.iter().filter(|e| e.level == "ERROR").count(),
        })
    }
}
