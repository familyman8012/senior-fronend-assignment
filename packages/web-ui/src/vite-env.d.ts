/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_BASE?: string
  readonly VITE_CHAT_HISTORY_KEY?: string
  readonly VITE_DEBUG?: string
  readonly VITE_SW_UPDATE_INTERVAL?: string
  readonly VITE_ENABLE_SW?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}