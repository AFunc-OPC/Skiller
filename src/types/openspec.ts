export type OpenSpecChangeStatus = 'complete' | 'in-progress' | 'no-tasks'

export type OpenSpecStage = 'proposal' | 'apply' | 'archive'

export type OpenSpecArtifactType = 'proposal' | 'design' | 'tasks' | 'spec'

export interface OpenSpecArtifactInfo {
  name: string
  path: string
  type: OpenSpecArtifactType
}

export interface OpenSpecChangeInfo {
  name: string
  completedTasks: number
  totalTasks: number
  lastModified: string
  status: OpenSpecChangeStatus
  currentStage: OpenSpecStage
  artifacts: OpenSpecArtifactInfo[]
}

export interface OpenSpecCliStatus {
  installed: boolean
  version: string | null
}

export interface OpenSpecCommandResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number
}

export interface OpenSpecExecuteRequest {
  projectPath: string
  command: string
  args: string[]
}

export interface OpenSpecListChangesRequest {
  projectPath: string
}

export interface OpenSpecReadArtifactRequest {
  projectPath: string
  changeId: string
  fileName: string
}
