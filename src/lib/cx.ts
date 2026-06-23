export type ClassValue = string | false | null | undefined;

/** Tiny classnames helper. */
export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
