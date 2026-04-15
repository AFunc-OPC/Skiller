use crate::error::SkillerError;
use std::fs;
use std::path::Path;

pub fn parse_frontmatter(content: &str) -> Result<(Option<String>, Option<String>), SkillerError> {
    if !content.starts_with("---") {
        return Ok((None, None));
    }

    let parts: Vec<&str> = content.splitn(3, "---").collect();
    if parts.len() < 3 {
        return Ok((None, None));
    }

    let frontmatter = parts[1].trim();

    let mut name = None;
    let mut description = None;

    for line in frontmatter.lines() {
        let line = line.trim();

        if let Some(value) = line.strip_prefix("name:") {
            name = Some(value.trim().to_string());
        } else if let Some(value) = line.strip_prefix("description:") {
            let desc_value = value.trim();
            if desc_value.starts_with('|') {
                let mut multiline = String::new();
                let mut in_multiline = false;

                for line in frontmatter
                    .lines()
                    .skip_while(|l| !l.contains("description: |"))
                {
                    if in_multiline && (line.starts_with("  ") || line.starts_with("\t")) {
                        multiline.push_str(line.trim());
                        multiline.push('\n');
                    } else if line.contains("description: |") {
                        in_multiline = true;
                    } else if in_multiline
                        && !line.starts_with(" ")
                        && !line.starts_with("\t")
                        && !line.is_empty()
                    {
                        break;
                    }
                }

                description = Some(multiline.trim().to_string());
            } else {
                description = Some(desc_value.to_string());
            }
        }
    }

    Ok((name, description))
}

pub fn parse_skill_markdown(path: &Path) -> Result<(Option<String>, Option<String>), SkillerError> {
    let content = fs::read_to_string(path).map_err(|e| {
        SkillerError::InvalidInput(format!("Failed to read {}: {}", path.display(), e))
    })?;

    parse_frontmatter(&content)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_frontmatter_with_name_and_description() {
        let content = r#"---
name: My Skill
description: This is a test skill
---

# Content here"#;

        let (name, description) = parse_frontmatter(content).unwrap();
        assert_eq!(name, Some("My Skill".to_string()));
        assert_eq!(description, Some("This is a test skill".to_string()));
    }

    #[test]
    fn test_parse_frontmatter_missing_description() {
        let content = r#"---
name: Only Name
---

# Content"#;

        let (name, description) = parse_frontmatter(content).unwrap();
        assert_eq!(name, Some("Only Name".to_string()));
        assert_eq!(description, None);
    }

    #[test]
    fn test_parse_frontmatter_no_frontmatter() {
        let content = "# Just markdown\nNo frontmatter here";
        let (name, description) = parse_frontmatter(content).unwrap();
        assert_eq!(name, None);
        assert_eq!(description, None);
    }

    #[test]
    fn test_parse_frontmatter_multiline_description() {
        let content = r#"---
name: Complex Skill
description: |
  This is a multiline
  description
---

# Content"#;

        let (name, description) = parse_frontmatter(content).unwrap();
        assert_eq!(name, Some("Complex Skill".to_string()));
        assert!(description.unwrap().contains("multiline"));
    }
}
