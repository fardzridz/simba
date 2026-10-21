/**
 * Binding Cloudflare yang tersedia di runtime (DB, BUCKET, SESSION_SECRET, APP_ENV)
 * dideklarasikan oleh `npx wrangler types` di worker-configuration.d.ts.
 * OpenNext mengeksposnya lewat antarmuka global `CloudflareEnv`, jadi keduanya
 * disatukan di sini supaya `getCloudflareContext()` bertipe benar.
 */
declare global {
  interface CloudflareEnv extends Cloudflare.Env {
    /** Rahasia kanal eksternal (§9.11); tidak punya nilai default di kode. */
    FONNTE_TOKEN?: string;
    MAIL_API_KEY?: string;
    MAIL_FROM?: string;
    APP_BASE_URL?: string;
    /** `"true"` membuka kanal luar di lingkungan non-produksi; default tertutup. */
    EXTERNAL_CHANNELS_ENABLED?: string;
  }
}

export {};
