import { describe, it, expect } from 'vitest'
import type { FileSourceMetadata, NpxSourceMetadata, RepoSourceMetadata, SourceMetadata } from '..'

describe('SourceMetadata Types', () => {
  it('FileSourceMetadata should have correct structure', () => {
    const metadata: FileSourceMetadata = {
      type: 'file',
      original_path: '/path/to/file.zip'
    }
    
    expect(metadata.type).toBe('file')
    expect(metadata.original_path).toBe('/path/to/file.zip')
  })
  
  it('NpxSourceMetadata should have correct structure', () => {
    const metadata: NpxSourceMetadata = {
      type: 'npx',
      command: 'npx skills @scope/package'
    }
    
    expect(metadata.type).toBe('npx')
    expect(metadata.command).toBe('npx skills @scope/package')
  })
  
  it('RepoSourceMetadata should have correct structure', () => {
    const metadata: RepoSourceMetadata = {
      type: 'repository',
      repo_id: 'repo-123',
      repo_name: 'Test Repo',
      repo_url: 'https://github.com/test/repo'
    }
    
    expect(metadata.type).toBe('repository')
    expect(metadata.repo_id).toBe('repo-123')
    expect(metadata.repo_name).toBe('Test Repo')
    expect(metadata.repo_url).toBe('https://github.com/test/repo')
  })
  
  it('RepoSourceMetadata should work with minimal fields', () => {
    const metadata: RepoSourceMetadata = {
      type: 'repository',
      repo_id: 'repo-123'
    }
    
    expect(metadata.type).toBe('repository')
    expect(metadata.repo_id).toBe('repo-123')
    expect(metadata.repo_name).toBeUndefined()
    expect(metadata.repo_url).toBeUndefined()
  })
  
  it('SourceMetadata union type should accept all variants', () => {
    const fileMetadata: SourceMetadata = {
      type: 'file',
      original_path: '/path/to/file.zip'
    }
    
    const npxMetadata: SourceMetadata = {
      type: 'npx',
      command: 'npx skills @scope/package'
    }
    
    const repoMetadata: SourceMetadata = {
      type: 'repository',
      repo_id: 'repo-123'
    }
    
    expect(fileMetadata.type).toBe('file')
    expect(npxMetadata.type).toBe('npx')
    expect(repoMetadata.type).toBe('repository')
  })
  
  it('Type guard for FileSourceMetadata should work', () => {
    const metadata: SourceMetadata = {
      type: 'file',
      original_path: '/path/to/file.zip'
    }
    
    if (metadata.type === 'file') {
      expect(metadata.original_path).toBe('/path/to/file.zip')
    }
  })
  
  it('Type guard for NpxSourceMetadata should work', () => {
    const metadata: SourceMetadata = {
      type: 'npx',
      command: 'npx skills @scope/package'
    }
    
    if (metadata.type === 'npx') {
      expect(metadata.command).toBe('npx skills @scope/package')
    }
  })
  
  it('Type guard for RepoSourceMetadata should work', () => {
    const metadata: SourceMetadata = {
      type: 'repository',
      repo_id: 'repo-123'
    }
    
    if (metadata.type === 'repository') {
      expect(metadata.repo_id).toBe('repo-123')
    }
  })
})
