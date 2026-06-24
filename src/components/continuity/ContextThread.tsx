"use client";

import type { ContextPack } from "@/types/continuity";
import { ACCENT } from "@/lib/accent";
import { kindMeta } from "@/lib/packKinds";
import { cx } from "@/lib/cx";
import { KindIcon } from "@/components/continuity/KindIcon";

export type ThreadItem = { pack: ContextPack; reason?: string };

const ROW = 56;
const GUTTER = 56;
const SPINE_X = 18;

/**
 * The Context Thread, Continuity's signature. A single spine gathers each
 * active pack (a bead in its kind color) and carries them down into one output
 * terminal. It is decorative only in the sense that the *data* is real: every
 * bead is a pack the compiler is actually using.
 */
export function ContextThread({
  items,
  outputLabel = "Compiled prompt",
  outputMeta,
  className,
}: {
  items: ThreadItem[];
  outputLabel?: string;
  outputMeta?: string;
  className?: string;
}) {
  const rows = items.length;
  const totalRows = rows + 1; // + output terminal
  const height = totalRows * ROW;
  const firstY = ROW / 2;
  const outputY = rows * ROW + ROW / 2;

  return (
    <div className={cx("relative", className)}>
      <svg
        width={GUTTER}
        height={height}
        viewBox={`0 0 ${GUTTER} ${height}`}
        className="absolute left-0 top-0"
        aria-hidden="true"
      >
        {rows > 0 && (
          <>
            <line
              x1={SPINE_X}
              y1={firstY}
              x2={SPINE_X}
              y2={outputY}
              stroke="var(--rule)"
              strokeWidth={1.5}
            />
            <line
              x1={SPINE_X}
              y1={firstY}
              x2={SPINE_X}
              y2={outputY}
              stroke="var(--signal)"
              strokeWidth={1.5}
              strokeOpacity={0.45}
              className="thread-path"
            />
          </>
        )}
        {items.map((item, i) => {
          const y = i * ROW + ROW / 2;
          const accent = ACCENT[kindMeta(item.pack.kind).accent];
          return (
            <g key={item.pack.id}>
              <line x1={SPINE_X} y1={y} x2={GUTTER - 8} y2={y} stroke="var(--rule)" strokeWidth={1} />
              <circle cx={SPINE_X} cy={y} r={5.5} fill="var(--surface)" stroke={accent.stroke} strokeWidth={2} />
              <circle cx={SPINE_X} cy={y} r={2} fill={accent.stroke} />
            </g>
          );
        })}
        {/* Output terminal */}
        <g>
          <rect
            x={SPINE_X - 6}
            y={outputY - 6}
            width={12}
            height={12}
            rx={2}
            transform={`rotate(45 ${SPINE_X} ${outputY})`}
            fill="var(--ink)"
          />
        </g>
      </svg>

      <div className="relative" style={{ paddingLeft: GUTTER }}>
        {items.map((item) => {
          const meta = kindMeta(item.pack.kind);
          const accent = ACCENT[meta.accent];
          return (
            <div key={item.pack.id} className="flex items-center" style={{ height: ROW }}>
              <div className="min-w-0 pl-1">
                <div className="flex items-center gap-1.5">
                  <KindIcon kind={item.pack.kind} size={13} className={accent.text} />
                  <span className="truncate text-[13px] font-medium text-ink">{item.pack.name}</span>
                </div>
                {item.reason && (
                  <p className="mt-0.5 truncate text-2xs text-ink-faint">{item.reason}</p>
                )}
              </div>
            </div>
          );
        })}
        {rows === 0 && (
          <div className="flex items-center text-[13px] text-ink-faint" style={{ height: ROW }}>
            <span className="pl-1">No context is active yet.</span>
          </div>
        )}
        <div className="flex items-center" style={{ height: ROW }}>
          <div className="pl-1">
            <div className="font-display text-[15px] text-ink">{outputLabel}</div>
            {outputMeta && <p className="mt-0.5 font-mono text-2xs text-ink-faint">{outputMeta}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
