import { invoke as tauriInvoke } from '@tauri-apps/api/core'

export function isTauriEnvironment() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function normalizeTauriError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>

    for (const key of ['message', 'error', 'details']) {
      const value = candidate[key]
      if (typeof value === 'string' && value.trim()) {
        return value
      }
    }

    try {
      const serialized = JSON.stringify(error)
      if (serialized && serialized !== '{}') {
        return serialized
      }
    } catch {
      // Ignore serialization failure and fall through to default message.
    }
  }

  return '未知错误（未返回可读的错误消息）'
}

export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriEnvironment()) {
    throw new Error('Tauri API unavailable. Start the app with `npm run tauri:dev`.')
  }

  try {
    return await tauriInvoke<T>(command, args)
  } catch (error) {
    throw new Error(`调用 ${command} 失败: ${normalizeTauriError(error)}`)
  }
}
