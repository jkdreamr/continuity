"use client";

/**
 * Recoverable route-level error boundary. A client exception (often a browser
 * extension or translator mutating the DOM) used to white-screen the whole app;
 * now it lands here with a way back.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <p className="eyebrow">Something interrupted</p>
      <h1 className="font-display text-2xl text-ink">This page hit a snag</h1>
      <p className="text-[14px] leading-relaxed text-ink-muted">
        Your work is saved locally and is safe. A browser extension like Grammarly or an auto-translator can
        interfere with the editor. Reloading usually clears it; a private window rules it out.
      </p>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-signal px-3.5 py-2 text-[13px] font-medium text-white hover:bg-signal-ink"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md border border-rule bg-surface px-3.5 py-2 text-[13px] font-medium text-ink-muted hover:text-ink"
        >
          Reload the page
        </button>
      </div>
    </div>
  );
}
