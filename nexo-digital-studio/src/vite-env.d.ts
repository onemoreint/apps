/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_WHATSAPP_NUMBER?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_AI_ENDPOINT?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
