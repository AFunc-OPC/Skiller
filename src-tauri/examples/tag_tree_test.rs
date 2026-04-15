use skiller::db::connection::init_database;
use skiller::models::tag::{CreateTagRequest, DeleteTagOptions, MoveTagRequest, UpdateTagRequest};
use skiller::services::tag_service;

fn main() {
    let db_path = "./test_db";
    std::fs::create_dir_all(db_path).expect("Failed to create test db dir");

    let conn = init_database(db_path).expect("Failed to initialize database");

    println!("=== 测试1: 创建根级标签 ===");
    let tag1 = tag_service::create_tag(
        &conn,
        CreateTagRequest {
            name: "Programming".to_string(),
            group_id: "group-build".to_string(),
            parent_id: None,
        },
    )
    .expect("Failed to create tag1");
    println!("创建标签: {:?}", tag1);

    println!("\n=== 测试2: 创建子标签 ===");
    let tag2 = tag_service::create_tag(
        &conn,
        CreateTagRequest {
            name: "Frontend".to_string(),
            group_id: "group-build".to_string(),
            parent_id: Some(tag1.id.clone()),
        },
    )
    .expect("Failed to create tag2");
    println!("创建标签: {:?}", tag2);

    println!("\n=== 测试3: 创建嵌套子标签 ===");
    let tag3 = tag_service::create_tag(
        &conn,
        CreateTagRequest {
            name: "React".to_string(),
            group_id: "group-build".to_string(),
            parent_id: Some(tag2.id.clone()),
        },
    )
    .expect("Failed to create tag3");
    println!("创建标签: {:?}", tag3);

    println!("\n=== 测试4: 获取完整树结构 ===");
    let tree = tag_service::get_tag_tree(&conn).expect("Failed to get tree");
    print_tree(&tree, 0);

    println!("\n=== 测试5: 重命名标签（应更新materialized_path） ===");
    let updated = tag_service::update_tag(
        &conn,
        UpdateTagRequest {
            id: tag1.id.clone(),
            name: Some("Development".to_string()),
            parent_id: None,
        },
    )
    .expect("Failed to update tag");
    println!("更新后的标签: {:?}", updated);

    println!("\n=== 测试6: 再次获取树结构，验证路径更新 ===");
    let tree = tag_service::get_tag_tree(&conn).expect("Failed to get tree");
    print_tree(&tree, 0);

    println!("\n=== 测试7: 移动标签 ===");
    let moved = tag_service::move_tag(
        &conn,
        MoveTagRequest {
            tag_id: tag3.id.clone(),
            new_parent_id: None,
        },
    )
    .expect("Failed to move tag");
    println!("移动后的标签: {:?}", moved);

    println!("\n=== 测试8: 验证移动后的树结构 ===");
    let tree = tag_service::get_tag_tree(&conn).expect("Failed to get tree");
    print_tree(&tree, 0);

    println!("\n=== 测试9: 创建新的嵌套结构用于循环引用测试 ===");
    let backend_tag = tag_service::create_tag(
        &conn,
        CreateTagRequest {
            name: "Backend".to_string(),
            group_id: "group-build".to_string(),
            parent_id: None,
        },
    )
    .expect("Failed to create backend tag");

    let nodejs_tag = tag_service::create_tag(
        &conn,
        CreateTagRequest {
            name: "NodeJS".to_string(),
            group_id: "group-build".to_string(),
            parent_id: Some(backend_tag.id.clone()),
        },
    )
    .expect("Failed to create nodejs tag");

    println!("当前树结构:");
    let tree = tag_service::get_tag_tree(&conn).expect("Failed to get tree");
    print_tree(&tree, 0);

    println!("\n=== 测试10: 尝试将父节点移动到子节点下（应检测到循环引用） ===");
    let result = tag_service::move_tag(
        &conn,
        MoveTagRequest {
            tag_id: backend_tag.id.clone(),
            new_parent_id: Some(nodejs_tag.id.clone()),
        },
    );
    match result {
        Err(e) => println!("✓ 正确拦截循环引用: {:?}", e),
        Ok(_) => println!("✗ 错误: 未检测到循环引用!"),
    }

    println!("\n=== 测试11: 删除标签（移动子标签到父级） ===");
    tag_service::delete_tag_with_options(
        &conn,
        &tag2.id,
        DeleteTagOptions {
            delete_children: false,
        },
    )
    .expect("Failed to delete tag");

    println!("\n=== 测试12: 验证删除后的树结构 ===");
    let tree = tag_service::get_tag_tree(&conn).expect("Failed to get tree");
    print_tree(&tree, 0);

    println!("\n=== 测试13: 测试最大深度限制 ===");
    let mut current_parent = Some(tag1.id.clone());
    for i in 0..12 {
        let result = tag_service::create_tag(
            &conn,
            CreateTagRequest {
                name: format!("Level{}", i),
                group_id: "group-build".to_string(),
                parent_id: current_parent.clone(),
            },
        );
        match result {
            Ok(tag) => {
                println!("成功创建第{}层标签: {:?}", i + 2, tag.name);
                current_parent = Some(tag.id);
            }
            Err(e) => {
                println!("第{}层创建失败（预期）: {:?}", i + 2, e);
                break;
            }
        }
    }

    println!("\n=== 测试14: 删除所有标签 ===");
    let all_tags = tag_service::get_tags(&conn).expect("Failed to get tags");
    for tag in all_tags {
        tag_service::delete_tag(&conn, &tag.id).expect("Failed to delete tag");
    }

    let final_count = tag_service::get_tags(&conn)
        .expect("Failed to get tags")
        .len();
    println!("最终标签数量: {}", final_count);

    println!("\n✅ 所有测试完成!");
}

fn print_tree(nodes: &[skiller::models::tag::TreeNode], depth: usize) {
    for node in nodes {
        let indent = "  ".repeat(depth);
        println!(
            "{}- {} (depth: {}, path: {})",
            indent, node.tag.name, node.tag.depth, node.tag.materialized_path
        );
        if !node.children.is_empty() {
            print_tree(&node.children, depth + 1);
        }
    }
}
