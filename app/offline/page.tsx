/**
 * blueprint §O.9 — the service worker's navigation fallback when a page
 * that was never visited (so isn't in the cache) is requested while
 * offline. Static, no data fetching — this must render with zero network
 * access by construction.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-10 text-center">
      <p className="text-lg font-semibold text-text-primary">You&apos;re offline</p>
      <p className="max-w-sm text-sm text-text-secondary">
        This page hasn&apos;t been loaded before, so it isn&apos;t available offline yet. Pages you&apos;ve already
        visited will still work — reconnect to see anything new.
      </p>
    </div>
  );
}
