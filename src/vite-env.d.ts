/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** PIN për hapjen e Dashboard / Financat (min. 4 karaktere). Nëse bosh, mbrojtja është e çaktivizuar. */
  readonly VITE_SENSITIVE_SCREEN_PIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
