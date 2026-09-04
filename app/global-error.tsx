"use client";

/**
 * Next.js's last-resort boundary — catches an error thrown by the root
 * layout itself, so it replaces the entire document (its own <html>/<body>,
 * no dependency on globals.css or design tokens, since those come from the
 * layout this file exists to work around).
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Something went wrong.</h1>
        <p style={{ color: "#666", marginTop: "0.5rem" }}>Please try again.</p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: "1.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
