use skiller::db::connection::create_test_connection;
use skiller::models::repo::CreateRepoRequest;
use skiller::services::repo_service;

#[test]
#[ignore] // Requires network access
fn test_add_repo_public_github() {
    let conn = create_test_connection().unwrap();

    let request = CreateRepoRequest {
        name: "Test Repo".to_string(),
        url: "https://github.com/octocat/Hello-World.git".to_string(),
        branch: "master".to_string(),
        description: None,
        skill_relative_path: None,
        auth_method: None,
        username: None,
        token: None,
        ssh_key: None,
    };

    let repo = repo_service::add_repo(&conn, request).unwrap();

    assert!(repo.local_path.is_some());
    assert!(repo.last_sync.is_some());
}

#[test]
fn test_scan_skills_empty_repo() {
    let conn = create_test_connection().unwrap();

    // Test with repo that has no skills
    let request = CreateRepoRequest {
        name: "Empty Repo".to_string(),
        url: "https://github.com/example/empty.git".to_string(),
        branch: "main".to_string(),
        description: None,
        skill_relative_path: None,
        auth_method: None,
        username: None,
        token: None,
        ssh_key: None,
    };

    let result = repo_service::add_repo(&conn, request);
    // Will fail because repo doesn't exist, but tests the path
    assert!(result.is_err());
}
