import { describe, expect, it } from 'vitest'
import { formatClawhubDate } from './formatClawhubDate'

describe('formatClawhubDate', () => {
  it('formats ISO timestamps as YYYY-MM-DD', () => {
    expect(formatClawhubDate('2026-05-13T12:34:56Z')).toBe('2026-05-13')
  })

  it('formats unix timestamp strings in seconds or milliseconds', () => {
    expect(formatClawhubDate('1747139696')).toBe('2025-05-13')
    expect(formatClawhubDate('1747139696000')).toBe('2025-05-13')
  })

  it('returns null for invalid values', () => {
    expect(formatClawhubDate(null)).toBeNull()
    expect(formatClawhubDate('not-a-date')).toBeNull()
  })
})
