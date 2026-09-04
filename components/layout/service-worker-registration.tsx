"use client";

import { useEffect } from "react";

/** blueprint §C "PWA installable shell + partial offline read" (Phase 12).
 * Mounted once in the root layout so it registers on every route, auth
 * and app alike. Registration failure (unsupported browser, blocked by
 * an extension, etc.) is silently ignored — this is additive resilience,
 * never something the app depends on to function. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
