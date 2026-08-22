"use client";

/**
 * Replaces the root layout when it is the layout itself that failed, so this
 * file cannot rely on the app's fonts, tokens or providers — everything it
 * needs is inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#08090b",
          color: "#e9ebee",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 500 }}>
            The application failed to start.
          </h1>
          <p style={{ color: "#9aa3af", fontSize: "0.875rem", marginTop: "0.75rem" }}>
            {error.digest ? `Digest ${error.digest}.` : "No further detail is available."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1.25rem",
              borderRadius: 3,
              border: "1px solid #262c36",
              background: "#b8481d",
              color: "#fff",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
