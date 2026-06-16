'use client';

import { cn } from '@/lib/utils';
import { Highlight, themes } from 'prism-react-renderer';
import { type ReactNode, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import { SketchFrame } from './sketches';

// remark-directive emits directive nodes; turn them into elements react-markdown can map.
function remarkDirectiveProps() {
  return (tree: any) => {
    const walk = (node: any) => {
      if (node && (node.type === 'containerDirective' || node.type === 'leafDirective' || node.type === 'textDirective')) {
        node.data = node.data || {};
        node.data.hName = node.name;
        node.data.hProperties = { ...(node.attributes || {}) };
      }
      if (node?.children) for (const c of node.children) walk(c);
    };
    walk(tree);
  };
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className='not-prose my-5 overflow-hidden rounded-xl border border-white/10 bg-[#0b1021]'>
      <div className='flex items-center justify-between border-b border-white/10 px-3 py-1.5'>
        <span className='font-mono text-[11px] uppercase tracking-wider text-white/45'>{lang}</span>
        <button type='button' onClick={copy} className='text-[11px] font-semibold text-white/55 transition hover:text-white'>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <Highlight code={code} language={lang} theme={themes.nightOwl}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={cn(className, 'os-scroll overflow-x-auto p-3.5 text-[12.5px] leading-relaxed')} style={{ ...style, background: 'transparent' }}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, k) => (
                  <span key={k} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

function CodePre({ children }: { children?: ReactNode }) {
  const el = Array.isArray(children) ? children[0] : children;
  const props = (el && typeof el === 'object' && 'props' in el ? (el as any).props : {}) ?? {};
  const lang = /language-(\w+)/.exec(props.className || '')?.[1] ?? 'text';
  const code = String(props.children ?? '').replace(/\n$/, '');
  return <CodeBlock code={code} lang={lang} />;
}

const CALLOUTS: Record<string, { c: string; icon: string; label: string }> = {
  tip: { c: 'var(--brand-green)', icon: '💡', label: 'Tip' },
  info: { c: 'var(--brand-blue)', icon: 'ℹ️', label: 'Note' },
  note: { c: 'var(--brand-blue)', icon: 'ℹ️', label: 'Note' },
  warn: { c: 'var(--brand-red)', icon: '⚠️', label: 'Heads up' },
};

function Callout({ type = 'info', children }: { type?: string; children?: ReactNode }) {
  const cfg = CALLOUTS[type] ?? CALLOUTS.info;
  return (
    <div className='not-prose my-5 rounded-xl border border-l-4 p-4' style={{ borderLeftColor: cfg.c, background: `color-mix(in oklab, ${cfg.c} 7%, var(--card))` }}>
      <div className='mb-1 flex items-center gap-1.5 text-sm font-bold' style={{ color: cfg.c }}>
        <span>{cfg.icon}</span> {cfg.label}
      </div>
      <div className='text-[14px] leading-relaxed text-foreground/85 [&_a]:font-semibold [&_a]:text-primary [&_p]:my-1'>{children}</div>
    </div>
  );
}

function VideoEmbed({ src, poster }: { src?: string; poster?: string }) {
  if (!src) return null;
  return <video controls preload='metadata' poster={poster} src={src} className='not-prose my-6 w-full rounded-xl border' />;
}

function YouTubeEmbed({ id }: { id?: string }) {
  if (!id) return null;
  return (
    <div className='not-prose my-6 aspect-video overflow-hidden rounded-xl border'>
      <iframe
        className='h-full w-full'
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title='YouTube video'
        loading='lazy'
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        allowFullScreen
      />
    </div>
  );
}

const COMPONENTS = {
  a: ({ href, children }: { href?: string; children?: ReactNode }) => {
    const external = !!href && /^https?:/.test(href);
    return (
      <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  },
  img: ({ src, alt, title }: { src?: string; alt?: string; title?: string }) => (
    <figure>
      <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} loading='lazy' />
      {title ? <figcaption>{title}</figcaption> : null}
    </figure>
  ),
  pre: CodePre,
  callout: Callout,
  video: VideoEmbed,
  youtube: YouTubeEmbed,
  sketch: ({ name, height, caption }: { name?: string; height?: string; caption?: string }) => (
    <SketchFrame name={name} height={height} caption={caption} />
  ),
};

export function MarkdownContent({ body }: { body: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkDirective, remarkDirectiveProps]} components={COMPONENTS as unknown as Components}>
      {body}
    </ReactMarkdown>
  );
}
