import { cx } from "@/lib/cx";

/** The mark echoes the Context Thread: beads on a spine converging to an output. */
export function ThreadMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <line x1="6" y1="3.5" x2="6" y2="16" stroke="var(--rule)" strokeWidth="1.5" />
      <circle cx="6" cy="4.5" r="2.4" fill="var(--surface)" stroke="var(--green)" strokeWidth="1.5" />
      <circle cx="6" cy="9.5" r="2.4" fill="var(--surface)" stroke="var(--signal)" strokeWidth="1.5" />
      <rect x="3.9" y="14" width="4.2" height="4.2" rx="1" transform="rotate(45 6 16.1)" fill="var(--ink)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <ThreadMark />
      <span className="font-display text-[19px] font-medium tracking-tight text-ink">Continuity</span>
    </span>
  );
}
