import Link from "next/link";

export default function RootNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-10 text-center">
      <p className="text-lg font-semibold text-text-primary">Page not found</p>
      <p className="text-sm text-text-secondary">That page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link
        href="/dashboard"
        className="inline-flex h-9 items-center justify-center rounded-(--radius-token-sm) bg-accent px-4 text-sm font-medium text-accent-foreground hover:bg-accent/90"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
