import type { Skill, SourceMetadata } from '../types'

export function parseSourceMetadata(value: Skill['source_metadata'] | string | null): SourceMetadata | null {
  if (!value) return null
  if (typeof value !== 'string') return value

  try {
    return JSON.parse(value) as SourceMetadata
  } catch {
    return null
  }
}

export function normalizeSkillSourceMetadata(skill: Skill): Skill {
  return {
    ...skill,
    source_metadata: parseSourceMetadata(skill.source_metadata),
  }
}
