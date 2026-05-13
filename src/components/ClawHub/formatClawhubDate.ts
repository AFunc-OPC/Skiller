export function formatClawhubDate(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const numericValue = Number(trimmed)
  const date = Number.isFinite(numericValue)
    ? new Date(trimmed.length <= 10 ? numericValue * 1000 : numericValue)
    : new Date(trimmed)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString().slice(0, 10)
}
