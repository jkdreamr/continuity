"use client";

/**
 * Root-level fallback. Replaces the whole document when an error escapes the
 * layout (e.g. a hydration crash from an extension/translator). Self-contained
 * inline styles, since the app's CSS/layout may not be mounted here.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" translate="no">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f8f9",
          color: "#101419",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <p
            style={{
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#5a6472",
              margin: "0 0 10px",
            }}
          >
            Something interrupted
          </p>
          <h1 style={{ fontSize: "22px", fontWeight: 600, margin: "0 0 10px" }}>This page hit a snag</h1>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#5a6472", margin: "0 0 18px" }}>
            Your work is saved locally and is safe. A browser extension like Grammarly or an auto-translator can
            interfere with the page. Reloading usually clears it.
          </p>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                border: "none",
                borderRadius: "6px",
                background: "#3157e8",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 500,
                padding: "9px 14px",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                borderRadius: "6px",
                border: "1px solid #d9dee4",
                background: "#fff",
                color: "#5a6472",
                fontSize: "13px",
                fontWeight: 500,
                padding: "9px 14px",
                cursor: "pointer",
              }}
            >
              Reload the page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
