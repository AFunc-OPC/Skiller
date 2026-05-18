# Graph Report - /Users/akio/Akio/AFunc-OPC/Skiller  (2026-05-12)

## Corpus Check
- Large corpus: 288 files · ~281,662 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 1111 nodes · 2202 edges · 92 communities (81 shown, 11 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 207 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_NPX Skill Import|NPX Skill Import]]
- [[_COMMUNITY_Repository Management|Repository Management]]
- [[_COMMUNITY_Project Skills Management|Project Skills Management]]
- [[_COMMUNITY_ClawHub UI Components|ClawHub UI Components]]
- [[_COMMUNITY_Database Schema & Migrations|Database Schema & Migrations]]
- [[_COMMUNITY_Configuration & Proxy|Configuration & Proxy]]
- [[_COMMUNITY_Core Architecture|Core Architecture]]
- [[_COMMUNITY_Proxy Configuration Types|Proxy Configuration Types]]
- [[_COMMUNITY_ClawHub API|ClawHub API]]
- [[_COMMUNITY_Tag & Skill Store|Tag & Skill Store]]
- [[_COMMUNITY_Skill UI Components|Skill UI Components]]
- [[_COMMUNITY_Config API & UI|Config API & UI]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]

## God Nodes (most connected - your core abstractions)
1. `get_connection()` - 57 edges
2. `useAppStore` - 52 edges
3. `useTagTreeStore` - 36 edges
4. `t()` - 30 edges
5. `Skill` - 24 edges
6. `prepare_npx_skill_import_impl()` - 21 edges
7. `run_migrations()` - 19 edges
8. `useRepositoryStore` - 18 edges
9. `parse_npx_skill_command()` - 15 edges
10. `invoke()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `@tauri-apps/api` --implements--> `Tauri`  [INFERRED]
  package.json → README.md
- `@tauri-apps/plugin-dialog` --implements--> `Tauri`  [INFERRED]
  package.json → README.md
- `React Frontend` --uses--> `@dnd-kit/core`  [INFERRED]
  README.md → package.json
- `React Frontend` --uses--> `fuse.js`  [INFERRED]
  README.md → package.json
- `React Frontend` --uses--> `lucide-react`  [INFERRED]
  README.md → package.json

## Communities (92 total, 11 thin omitted)

### Community 0 - "NPX Skill Import"
Cohesion: 0.06
Nodes (84): cancel_npx_skill_import(), check_git_available(), check_npx_available(), confirm_npx_skill_import(), confirm_overwrite_and_sync(), confirms_import_and_cleans_up_session(), copy_directory_to_target(), copy_skill() (+76 more)

### Community 1 - "Repository Management"
Cohesion: 0.09
Nodes (43): create_test_connection(), add_repo(), build_git_auth_config(), create_repo(), delete_repo_skills(), find_all_skill_directories(), get_repo_by_id(), get_repo_skill_count() (+35 more)

### Community 2 - "Project Skills Management"
Cohesion: 0.09
Nodes (35): batch_remove_project_skills(), batch_toggle_project_skills_status(), check_project_skill_exists(), get_preset_skill_path(), get_project_skills(), get_project_skills_by_presets(), log_action(), remove_project_skill() (+27 more)

### Community 3 - "ClawHub UI Components"
Cohesion: 0.09
Nodes (31): ClawHubPage(), EmptyState(), EmptyStateProps, ImportButton(), ImportButtonProps, SkillDetailDrawer(), SkillDetailDrawerProps, SkillGrid() (+23 more)

### Community 4 - "Database Schema & Migrations"
Cohesion: 0.06
Nodes (27): create_tables(), run_migrations(), add_builtin_tags(), column_exists(), add_builtin_repos(), BuiltInRepo, column_exists(), fix_global_paths() (+19 more)

### Community 5 - "Configuration & Proxy"
Cohesion: 0.1
Nodes (31): create_tool_preset(), delete_tool_preset(), get_config(), get_effective_proxy(), get_proxy_config(), get_tool_presets(), set_config(), set_proxy_config() (+23 more)

### Community 6 - "Core Architecture"
Cohesion: 0.07
Nodes (35): React Frontend, Tauri Backend, Cross-Platform Desktop Application, Local Storage, Skill Management, project_skills table, projects table, repos table (+27 more)

### Community 7 - "Proxy Configuration Types"
Cohesion: 0.08
Nodes (14): Config, CreateToolPresetRequest, CustomProxyConfig, ProxyConfig, ProxyMode, SystemProxyConfig, ToolPreset, UpdateToolPresetRequest (+6 more)

### Community 8 - "ClawHub API"
Cohesion: 0.13
Nodes (27): clawhub_inspect(), clawhub_search(), clawhub_test_connection(), add_source(), decrypt_token(), download_skill_api(), encrypt_token(), explore() (+19 more)

### Community 9 - "Tag & Skill Store"
Cohesion: 0.12
Nodes (22): tagApi, SkillState, fileMetadata, metadata, npxMetadata, repoMetadata, CreateTagRequest, CustomProxyConfig (+14 more)

### Community 10 - "Skill UI Components"
Cohesion: 0.12
Nodes (17): useDebounce(), AddSkillButton(), AddSkillButtonProps, DroppableSkillArea(), DroppableSkillAreaProps, EmptyState(), EmptyStateProps, ImportDropdown() (+9 more)

### Community 11 - "Config API & UI"
Cohesion: 0.12
Nodes (17): configApi, PROXY_MODES, ProxySettingsProps, deleteButtons, editButtons, globalPathInput, mocks, openButtons (+9 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (17): distributionApi, useSort(), UseSortOptions, UseSortReturn, getProjectColor(), hashString(), isBase64Image(), LIGHT_COLORS (+9 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (18): commandInput, defaultProps, executeButton, mockResult, mocks, ImportMode, NpxImportDialog(), NpxImportDialogProps (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (16): add_repo(), delete_repo(), get_repo_skill_count(), get_repo_skill_counts(), get_repos(), ImportableSkill, list_repo_skills(), log_action() (+8 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (10): invoke(), isTauriEnvironment(), normalizeTauriError(), OverviewPageProps, FileImportDialog(), FileImportDialogProps, dropzone, mocks (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (13): SkillProvider(), OverviewPage(), App(), Icon, IconName, ModuleKey, modules, Sidebar (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (11): desktopApi, ProjectSkillCardProps, ProjectSkillListItemProps, CodeBlockEntry, CodeProps, FONT_FAMILIES, FONT_SIZES, Heading (+3 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (15): RepositorySelectDialog(), confirmModal, footerInfo, importButton, mockRepoApi, mockRepos, mocks, mockSkills (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.2
Nodes (13): build_tree(), calculate_depth(), calculate_materialized_path(), create_tag(), delete_tag_with_options(), get_tag_by_id(), get_tag_subtree(), get_tag_tree() (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.17
Nodes (12): NotificationContainer(), NotificationContainerProps, NotificationToastProps, ProjectSkillCard(), ProjectSkillList(), ProjectSkillListProps, ProjectSkillListItem(), useAppStore (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.2
Nodes (13): get_file_skill_tags(), update_file_skill_tags(), create_skill(), get_skill_by_id(), get_skill_tags(), get_skills(), get_skills_by_repo_id(), update_skill() (+5 more)

### Community 22 - "Community 22"
Cohesion: 0.21
Nodes (12): logApi, LogEntry, LogFilter, LogStats, LogPanel(), LogPanelProps, LogToolbar(), LogToolbarProps (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (17): Design Artifact, Proposal Artifact, Specs Artifact, Tasks Artifact, Spec-Driven Workflow Schema, OpenSpec Apply Change Skill, OpenSpec Archive Change Skill, OpenSpec Bulk Archive Change Skill (+9 more)

### Community 24 - "Community 24"
Cohesion: 0.15
Nodes (8): DroppableZone(), DroppableZoneProps, TreeView(), TreeViewProps, FlattenedNode, RowProps, VirtualizedTree(), VirtualizedTreeProps

### Community 25 - "Community 25"
Cohesion: 0.15
Nodes (8): skillApi, AuthMethod, RepositoryAddDialogProps, RepositoryState, CreateRepoRequest, CreateSkillRequest, UpdateRepoRequest, UpdateSkillRequest

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (7): TagTreeState, DraggableTagNode, DraggableTagNodeProps, TreeNode, TreeNodeProps, UseTagSearchResult, TreeNode

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (12): AgentsSkillInfo, ConfirmNpxSkillImportResponse, ManagedNpxImportSession, NativeNpxImportResponse, NativeNpxProgressEvent, NpxImportLogEntry, NpxImportProgressEvent, NpxImportToolStatus (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.24
Nodes (11): clawhubApi, ClawhubState, SortOption, ClawhubSkill, ClawhubSkillDetail, ClawhubSource, ConnectionTestResult, CreateClawhubSourceRequest (+3 more)

### Community 29 - "Community 29"
Cohesion: 0.18
Nodes (9): SkillContext, SkillContextValue, useSkillContext(), ProjectSkillImportDialog(), ProjectSkillImportDialogProps, AgentsSkillInfo, DistributeSkillResult, SkillCenterState (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.26
Nodes (9): expandTilde(), getSkillFolderName(), getSourceDisplay(), joinPath(), SkillDetailDrawer(), SkillDetailDrawerProps, SkillDistributionTarget, normalizeSkillSourceMetadata() (+1 more)

### Community 31 - "Community 31"
Cohesion: 0.19
Nodes (8): escapeRegExp(), HighlightText(), HighlightTextProps, SkillCardProps, STATUS_COLORS, SkillList(), SkillListProps, STATUS_COLORS

### Community 32 - "Community 32"
Cohesion: 0.15
Nodes (13): Executing Plans, Subagent-Driven Development, DRY Principle, Five Whys Technique, Jobs-to-be-Done Methodology, MoSCoW Prioritization, Test-Driven Development, Visual Companion (+5 more)

### Community 33 - "Community 33"
Cohesion: 0.24
Nodes (7): ImportableSkill, repoApi, RepoSkillCount, DialogStage, RepositorySelectDialogProps, RepoState, Repo

### Community 34 - "Community 34"
Cohesion: 0.18
Nodes (12): App Component, Icon Component, Sidebar Component, handleCreateProject, handleSelectProjectFolder, Module Routing System, renderContent Function, Theme and Language Management (+4 more)

### Community 35 - "Community 35"
Cohesion: 0.2
Nodes (10): clawhub_add_source(), clawhub_check_duplicates(), clawhub_delete_source(), clawhub_explore(), clawhub_import_skills(), clawhub_list_sources(), clawhub_update_source(), log_action() (+2 more)

### Community 36 - "Community 36"
Cohesion: 0.31
Nodes (8): RepositoryAddDialog(), RepositoryDetailDrawer(), RepositoryGrid(), RepositoryManagementPage(), RepositoryManagementPageProps, RepositoryToolbar(), RepositoryToolbarProps, useRepositoryStore

### Community 37 - "Community 37"
Cohesion: 0.24
Nodes (6): RepositoryCard(), RepositoryCardProps, RepositoryGridProps, RepositoryListItem(), RepositoryListItemProps, formatDate()

### Community 38 - "Community 38"
Cohesion: 0.18
Nodes (11): Cargo Build System, Vite Bundler, Tauri Framework, Git2 Library, Rusqlite Database Library, Tokio Async Runtime, Skiller Build Frontend Skill, Skiller Test Frontend Skill (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.2
Nodes (9): ClawhubSkill, ClawhubSkillDetail, ClawhubSource, ConnectionTestResult, CreateClawhubSourceRequest, DuplicateCheckResult, ImportSkillResult, ImportSkillsRequest (+1 more)

### Community 40 - "Community 40"
Cohesion: 0.2
Nodes (6): CodeProps, FONT_FAMILIES, FONT_SIZES, Heading, PreProps, UserGuideModalProps

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (7): confirmButton, defaultProps, mocks, mockSkills, mockToolPresets, overlay, user

### Community 42 - "Community 42"
Cohesion: 0.22
Nodes (5): SimpleTagTreeProps, TagTreeNode, DraggableTree(), DraggableTreeProps, Tag

### Community 43 - "Community 43"
Cohesion: 0.31
Nodes (7): TagGovernancePage(), DroppableSkillListItem(), DroppableSkillListItemProps, STATUS_COLORS, SkillCenter(), useTagTreeStore, useTagSearch()

### Community 44 - "Community 44"
Cohesion: 0.22
Nodes (6): FoundSkill, NpxFindDialog(), NpxFindDialogProps, NpxFindProgressEvent, NpxFindResponse, SearchMode

### Community 45 - "Community 45"
Cohesion: 0.25
Nodes (7): CreateTagRequest, DeleteTagOptions, MoveTagRequest, Tag, TagGroup, TreeNode, UpdateTagRequest

### Community 46 - "Community 46"
Cohesion: 0.39
Nodes (6): projectApi, projectSkillApi, ProjectState, CreateProjectRequest, Project, UpdateProjectRequest

### Community 47 - "Community 47"
Cohesion: 0.25
Nodes (6): mocks, projects, skill, toolPresets, user, writeTextMock

### Community 48 - "Community 48"
Cohesion: 0.25
Nodes (7): mockDrawer, mockFetchRepositories, mockGetFilteredRepositories, mockSelectRepository, onPendingRepositoryDetailHandled, repositories, storeState

### Community 49 - "Community 49"
Cohesion: 0.52
Nodes (6): get_custom_proxy_url(), get_effective_proxy_url(), get_no_proxy_list(), get_proxy_auth(), get_proxy_config_for_reqwest(), get_system_proxy_url()

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (4): HighlightText, HighlightTextProps, SearchResults(), SearchResultsProps

### Community 51 - "Community 51"
Cohesion: 0.38
Nodes (6): getSkillColor(), hashString(), SKILL_COLORS, SkillIcon(), SkillIconProps, Skill

### Community 54 - "Community 54"
Cohesion: 0.6
Nodes (4): copy_file(), ensure_dir(), read_file(), write_file()

### Community 55 - "Community 55"
Cohesion: 0.4
Nodes (4): DistributeSkillRequest, DistributeSkillResult, SkillDistributionMode, SkillDistributionTarget

### Community 56 - "Community 56"
Cohesion: 0.4
Nodes (4): CreateSkillRequest, Skill, SourceMetadata, UpdateSkillRequest

### Community 57 - "Community 57"
Cohesion: 0.4
Nodes (3): CreateProjectRequest, Project, UpdateProjectRequest

### Community 58 - "Community 58"
Cohesion: 0.4
Nodes (4): CreateRepoRequest, Repo, RepoSyncEvent, UpdateRepoRequest

### Community 60 - "Community 60"
Cohesion: 0.7
Nodes (4): decrypt(), derive_key(), encrypt(), rand_nonce()

### Community 61 - "Community 61"
Cohesion: 0.4
Nodes (4): SORT_OPTIONS, SortField, SortOption, SortOrder

### Community 62 - "Community 62"
Cohesion: 0.5
Nodes (3): LogEntry, LogFilter, LogStats

## Knowledge Gaps
- **299 isolated node(s):** `GitAuthConfig`, `SkillDistributionTarget`, `SkillDistributionMode`, `DistributeSkillRequest`, `DistributeSkillResult` (+294 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `metadata` connect `Tag & Skill Store` to `NPX Skill Import`, `Project Skills Management`?**
  _High betweenness centrality (0.349) - this node is a cross-community bridge._
- **Why does `get_file_skills()` connect `NPX Skill Import` to `Tag & Skill Store`, `Project Skills Management`, `Configuration & Proxy`?**
  _High betweenness centrality (0.288) - this node is a cross-community bridge._
- **Why does `get_connection()` connect `Configuration & Proxy` to `NPX Skill Import`, `Project Skills Management`, `Community 35`, `ClawHub API`, `Community 14`?**
  _High betweenness centrality (0.204) - this node is a cross-community bridge._
- **Are the 56 inferred relationships involving `get_connection()` (e.g. with `get_file_skills()` and `toggle_skill()`) actually correct?**
  _`get_connection()` has 56 INFERRED edges - model-reasoned connections that need verification._
- **What connects `GitAuthConfig`, `SkillDistributionTarget`, `SkillDistributionMode` to the rest of the system?**
  _299 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `NPX Skill Import` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Repository Management` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._