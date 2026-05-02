export type OpenSpecChangeStatus = 'in_progress' | 'archived'

export type OpenSpecStage = 'propose' | 'new' | 'continue' | 'apply' | 'verify' | 'archive'

export type OpenSpecArtifactType = 'proposal' | 'design' | 'tasks' | 'spec'

export interface OpenSpecArtifactInfo {
  name: string
  path: string
  type: OpenSpecArtifactType
}

export interface OpenSpecChangeInfo {
  id: string
  name: string
  status: OpenSpecChangeStatus
  currentStage: OpenSpecStage
  createdAt: string
  updatedAt: string
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
