"use client";

import { Pencil, Copy, Trash2 } from "lucide-react";
import type { ContextPack } from "@/types/continuity";
import { cx } from "@/lib/cx";
import { ActivationBadge, KindBadge, MetaLine, Tag } from "@/components/continuity/atoms";

export function PackCard({
  pack,
  onEdit,
  onDuplicate,
  onDelete,
  className,
}: {
  pack: ContextPack;
  onEdit?: (pack: ContextPack) => void;
  onDuplicate?: (pack: ContextPack) => void;
  onDelete?: (pack: ContextPack) => void;
  className?: string;
}) {
  return (
    <article
      className={cx(
        "group card-lift flex flex-col rounded-md border border-rule bg-surface p-4 shadow-card",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <KindBadge pack={pack} />
          <ActivationBadge pack={pack} />
        </div>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {onEdit && (
            <IconBtn label="Edit pack" onClick={() => onEdit(pack)}>
              <Pencil size={14} />
            </IconBtn>
          )}
          {onDuplicate && (
            <IconBtn label="Duplicate pack" onClick={() => onDuplicate(pack)}>
              <Copy size={14} />
            </IconBtn>
          )}
          {onDelete && (
            <IconBtn label="Delete pack" danger onClick={() => onDelete(pack)}>
              <Trash2 size={14} />
            </IconBtn>
          )}
        </div>
      </div>

      <h3 className="mt-2.5 font-display text-[17px] leading-snug text-ink">{pack.name}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{pack.summary}</p>

      {pack.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {pack.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      )}

      <div className="mt-3 border-t border-rule pt-2.5">
        <MetaLine pack={pack} />
      </div>
    </article>
  );
}

function IconBtn({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cx(
        "rounded p-1.5 text-ink-muted transition-colors hover:bg-surface-sunk",
        danger ? "hover:text-rust" : "hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
