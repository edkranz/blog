export type InlinePart = { text: string; em?: boolean; strong?: boolean };

/** Just enough Markdown for one-paragraph copy: *em* and **strong**. */
export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push(m[1] !== undefined ? { text: m[1], strong: true } : { text: m[2], em: true });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
