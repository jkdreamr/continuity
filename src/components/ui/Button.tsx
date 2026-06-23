import { forwardRef } from "react";
import { cx } from "@/lib/cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none select-none focus-visible:outline-2 focus-visible:outline-signal";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-signal text-white hover:bg-signal-ink",
  secondary: "bg-surface text-ink border border-rule hover:bg-surface-sunk",
  ghost: "text-ink-muted hover:text-ink hover:bg-surface-sunk",
  danger: "bg-rust text-white hover:bg-rust-ink",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
};

export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md"): string {
  return cx(base, variants[variant], sizes[size]);
}

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "secondary", size = "md", className, type = "button", ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cx(buttonClasses(variant, size), className)} {...props} />
  );
});
