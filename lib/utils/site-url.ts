/**
 * Base URL for links that leave the app and come back (email confirmation,
 * password reset). Each environment (dev/preview/prod) sets its own value —
 * see docs/ENVIRONMENT.md.
 */
export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
