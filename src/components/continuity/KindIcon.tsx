import {
  AudioLines,
  Box,
  Users,
  Quote,
  ShieldAlert,
  GitCommitHorizontal,
  Palette,
  type LucideIcon,
} from "lucide-react";
import type { PackKind } from "@/types/continuity";

const ICONS: Record<PackKind, LucideIcon> = {
  voice: AudioLines,
  project: Box,
  audience: Users,
  reference: Quote,
  constraint: ShieldAlert,
  decision: GitCommitHorizontal,
  taste: Palette,
};

export function KindIcon({
  kind,
  size = 15,
  className,
}: {
  kind: PackKind;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[kind];
  return <Icon size={size} strokeWidth={1.75} className={className} aria-hidden="true" />;
}
