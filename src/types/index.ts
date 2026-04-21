export interface FileSourceMetadata {
  type: 'file'
  original_path: string
}

export interface NpxSourceMetadata {
  type: 'npx'
  command: string
}

export interface RepoSourceMetadata {
  type: 'repository'
  repo_id: string
  repo_name?: string
  repo_url?: string
}

export type SourceMetadata = FileSourceMetadata | NpxSourceMetadata | RepoSourceMetadata

export interface Skill {
  id: string
  name: string
  description: string | null
  file_path: string
  source: string
  source_metadata: SourceMetadata | null
  repo_id: string | null
  tags: string[]
  status: 'available' | 'disabled'
  created_at: string
  updated_at: string
  is_symlink?: boolean
  symlink_valid?: boolean
  symlink_target_disabled?: boolean
}

export interface CreateSkillRequest {
  name: string
  description?: string
  file_path: string
  source: string
  source_metadata?: SourceMetadata
  repo_id?: string
  tags: string[]
}

export interface UpdateSkillRequest {
  id: string
  name?: string
  description?: string
  tags?: string[]
}

export interface Tag {
  id: string
  name: string
  group_id: string
  parent_id: string | null
  materialized_path: string
  depth: number
  is_builtin: boolean
  created_at: string
  updated_at: string
  skill_count?: number
}

export interface TagGroup {
  id: string
  name: string
  is_builtin: boolean
  created_at: string
}

export interface CreateTagRequest {
  name: string
  group_id: string
  parent_id?: string
}

export interface UpdateTagRequest {
  id: string
  name?: string
  parent_id?: string
}

export interface MoveTagRequest {
  tag_id: string
  new_parent_id?: string
}

export interface TreeNode {
  tag: Tag
  children: TreeNode[]
}

export interface DeleteTagOptions {
  delete_children: boolean
}

export interface Project {
  id: string
  name: string
  path: string
  skill_path: string
  tool_preset_id: string | null
  description: string | null
  icon: string | null
  is_builtin: boolean
  created_at: string
  updated_at: string
}

export interface CreateProjectRequest {
  name: string
  path: string
  skill_path: string
  tool_preset_id?: string
  description?: string
  icon?: string
}

export interface UpdateProjectRequest {
  name?: string
  description?: string | null
  icon?: string | null
}

export interface Repo {
  id: string
  name: string
  url: string
  local_path: string | null
  branch: string
  last_sync: string | null
  is_builtin: boolean
  created_at: string
  updated_at: string
  description?: string | null
  skill_relative_path?: string | null
  auth_method?: 'http' | 'ssh'
  username?: string | null
  token?: string | null
  ssh_key?: string | null
  sync_schedule?: string | null
}

export interface CreateRepoRequest {
  name: string
  url: string
  branch: string
  description?: string
  skill_relative_path?: string
  auth_method?: 'http' | 'ssh'
  username?: string
  token?: string
  ssh_key?: string
  sync_schedule?: string
}

export interface UpdateRepoRequest {
  id: string
  name?: string
  description?: string | null
  skill_relative_path?: string | null
  branch?: string
  auth_method?: 'http' | 'ssh'
  username?: string | null
  token?: string | null
  ssh_key?: string | null
}

export interface RepoSyncEvent {
  request_id: string
  repo_id: string
  status: 'success' | 'error'
  repo: Repo | null
  error: string | null
  recovery_action?: 'reclone' | null
}

export interface ToolPreset {
  id: string
  name: string
  skill_path: string
  global_path: string
  is_builtin: boolean
  created_at: string
  updated_at: string
}

export interface CreateToolPresetRequest {
  name: string
  skill_path: string
  global_path: string
}

export interface UpdateToolPresetRequest {
  id: string
  name?: string
  skill_path?: string
  global_path?: string
}

export type SkillDistributionTarget = 'global' | 'project'

export type SkillDistributionMode = 'copy' | 'symlink'

export interface DistributeSkillRequest {
  skill_id: string
  target: SkillDistributionTarget
  preset_id: string
  project_id?: string
  mode: SkillDistributionMode
}

export interface DistributeSkillResult {
  target_path: string
  target: SkillDistributionTarget
  mode: SkillDistributionMode
}

export interface SkillCenterState {
  skills: Skill[]
  tags: Tag[]
  selectedTagId: string | null
  searchKeyword: string
  sortOption: import('./sort').SortOption
  viewMode: 'card' | 'list'
  selectedSkillId: string | null
  isDrawerOpen: boolean
  loading: boolean
  error: string | null
}

export interface ImportMethod {
  type: 'file' | 'npx' | 'repository'
  label: string
  icon?: string
}

export interface ToolAvailability {
  git: boolean
  npx: boolean
}

export interface NpxImportLogEntry {
  stage: string
  message: string
}

export interface NpxImportProgressEvent {
  request_id: string
  entry: NpxImportLogEntry
}

export interface ParsedNpxSkillCommand {
  repo_url: string
  skill_name: string
  branch?: string | null
  skill_path?: string | null
}

export interface NpxSkillImportSummary {
  skill_name: string
  display_name: string
  repo_url: string
  branch?: string | null
  skill_path: string
  staged_path: string
  required_tools: string[]
  exists_in_skiller: boolean
}

export interface PrepareNpxSkillImportResponse {
  session_id: string
  command: string
  parsed: ParsedNpxSkillCommand
  tools: ToolAvailability
  logs: NpxImportLogEntry[]
  summary: NpxSkillImportSummary
}

export interface ConfirmNpxSkillImportResponse {
  skill_path: string
  imported_skill_name: string
  cleaned_up: boolean
  is_update: boolean
}

export interface NativeNpxProgressEvent {
  request_id: string
  line: string
  is_error: boolean
}

export type SyncResult =
  | { skill_name: string; skill_path: string }
  | { skill_name: string; existing_path: string }
  | { skill_name: string; existing_path: string; message: string }

export interface NativeNpxImportResponse {
  success: boolean
  skill_name: string
  exists_in_skiller: boolean
  logs: string[]
}

export interface SyncToSkillerResponse {
  skill_name: string
  skill_path: string
  is_update: boolean
}

export interface AgentsSkillInfo {
  name: string
  path: string
  has_skill_md: boolean
}

export * from './sort'
