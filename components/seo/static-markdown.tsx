import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// The OS blog reader renders interactive MDX (canvases, callouts, copy-able code).
// The static/SEO layer only needs readable, semantic HTML — so strip the custom
// block directives (::sketch{…}, :::callout{…} … :::) and render plain Markdown.
function stripDirectives(md: string): string {
  return md
    .replace(/^:{2,}.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Server-rendered Markdown → semantic HTML for crawlers (no client JS). */
export function StaticMarkdown({ body }: { body: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{stripDirectives(body)}</ReactMarkdown>;
}
