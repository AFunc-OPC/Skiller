declare global {
  interface Window {
    __TAURI_INVOKE__<T>(cmd: string, args?: Record<string, unknown>): Promise<T>
    __TAURI__?: {
      tauri: {
        invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
      }
    }
  }
}

export {}
