import { parseInline } from './inline-markdown-parse';

export function InlineMarkdown({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((p, i) => (p.strong ? <strong key={i}>{p.text}</strong> : p.em ? <em key={i}>{p.text}</em> : <span key={i}>{p.text}</span>))}
    </>
  );
}
