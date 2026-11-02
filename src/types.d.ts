/**
 * Binding Cloudflare yang tersedia di runtime dideklarasikan oleh
 * `npx wrangler types` di worker-configuration.d.ts (hasil wrangler.jsonc
 * ditambah nama rahasia yang dipakai kode: SESSION_SECRET, FONNTE_TOKEN,
 * MAIL_API_KEY, MAIL_FROM, APP_BASE_URL).
 * OpenNext mengeksposnya lewat antarmuka global `CloudflareEnv`, jadi keduanya
 * disatukan di sini supaya `getCloudflareContext()` bertipe benar.
 */
declare global {
  interface CloudflareEnv extends Cloudflare.Env {}
}

export {};
