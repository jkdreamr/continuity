/** Extract a JSON object/array from a model response that may be fenced or chatty. */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1] ?? text;
  const start = body.search(/[[{]/);
  if (start === -1) return body.trim();
  const end = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
  return end > start ? body.slice(start, end + 1) : body.trim();
}

/** Parse a conservative completion response into a bounded string or null. */
export function parseCompletion(text: string, maxChars = 90): string | null {
  try {
    const obj = JSON.parse(extractJson(text)) as { completion?: unknown };
    const c = obj?.completion;
    if (typeof c !== "string" || !c.trim()) return null;
    return c.slice(0, maxChars);
  } catch {
    return null;
  }
}
