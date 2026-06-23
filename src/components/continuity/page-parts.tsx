import { cx } from "@/lib/cx";

export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-3xl leading-tight tracking-tight text-ink sm:text-[34px]">
          {title}
        </h1>
        {lede && <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{lede}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex items-center justify-between gap-3", className)}>
      <h2 className="eyebrow">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-rule bg-surface/50 px-5 py-8">
      <h3 className="font-display text-lg text-ink">{title}</h3>
      <p className="max-w-md text-[13px] leading-relaxed text-ink-muted">{body}</p>
      {action}
    </div>
  );
}

export function HydrateSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="h-9 w-72 rounded bg-surface-sunk" />
      <div className="h-4 w-96 max-w-full rounded bg-surface-sunk" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 rounded-md border border-rule bg-surface" />
        ))}
      </div>
    </div>
  );
}
