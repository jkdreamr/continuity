"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/cx";
import { Logo } from "@/components/continuity/Logo";

const NAV = [
  { href: "/", label: "Workspace" },
  { href: "/packs", label: "Context Packs" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/" || pathname.startsWith("/compose");
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-canvas items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="rounded focus-visible:outline-2 focus-visible:outline-signal">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cx(
                  "relative rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors sm:text-sm",
                  isActive(item.href)
                    ? "text-ink"
                    : "text-ink-muted hover:text-ink hover:bg-surface-sunk",
                )}
              >
                {item.label}
                {isActive(item.href) && (
                  <span className="absolute inset-x-2.5 -bottom-[5px] h-0.5 rounded-full bg-signal" />
                )}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-canvas px-4 py-7 sm:px-6 sm:py-9">{children}</main>
    </div>
  );
}
