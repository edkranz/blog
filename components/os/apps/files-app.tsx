'use client';

import { AppIcon } from '@/components/os/icons';
import { getAppMeta } from '@/lib/os/apps-meta';
import { HOME, type VFile, type VNode, dirAt, fsMkdir, fsRemove, fsWrite, kindGlyph, listChildren } from '@/lib/os/filesystem';
import { useFsStore } from '@/lib/os/fs-store';
import { useWindowStore } from '@/lib/os/store';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { Dropdown } from '../menu';
import type { AppContentProps } from './types';

const FAVORITES: { label: string; path: string[]; glyph: string }[] = [
  { label: 'Home', path: HOME, glyph: '🏠' },
  { label: 'Projects', path: [...HOME, 'projects'], glyph: '📁' },
  { label: 'Photos', path: [...HOME, 'photos'], glyph: '🖼️' },
  { label: 'Games', path: [...HOME, 'games'], glyph: '🎮' },
  { label: 'Applications', path: ['Applications'], glyph: '🚀' },
];

const samePath = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

const nextUntitled = (existing: Set<string>, base: string) => {
  if (!existing.has(base)) return base;
  for (let i = 2; ; i++) if (!existing.has(`${base} ${i}`)) return `${base} ${i}`;
};

export function FilesApp({ win }: AppContentProps) {
  const openApp = useWindowStore((s) => s.openApp);
  const root = useFsStore((s) => s.root);
  const setRoot = useFsStore((s) => s.setRoot);
  const initial = (win.props?.path as string[] | undefined) ?? HOME;
  const [path, setPath] = useState<string[]>(initial);
  const [preview, setPreview] = useState<VFile | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // The terminal re-opening Files (`open <dir>`) bumps the window nonce — jump there.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const next = win.props?.path as string[] | undefined;
    if (next) {
      setPreview(null);
      setPath(next);
    }
  }, [win.nonce]);

  const currentDir = dirAt(root, path) ?? dirAt(root, HOME);
  const items = useMemo(() => (currentDir ? listChildren(currentDir, showHidden) : []), [currentDir, showHidden]);

  const go = (parts: string[]) => {
    setPreview(null);
    setPath(parts);
  };

  const open = (node: VNode) => {
    if (node.type === 'dir') return go([...path, node.name]);
    if (node.kind === 'app' && node.app) return openApp(node.app);
    if (node.kind === 'link' && node.href) return void window.open(node.href, '_blank', 'noopener,noreferrer');
    setPreview(node);
  };

  const newFolder = () => {
    const name = nextUntitled(new Set((currentDir?.children ?? []).map((c) => c.name)), 'untitled folder');
    const res = fsMkdir(root, path, name);
    if (res.ok) setRoot(res.root);
  };

  const newFile = () => {
    const name = nextUntitled(new Set((currentDir?.children ?? []).map((c) => c.name)), 'untitled.txt');
    const res = fsWrite(root, path, name, '');
    if (res.ok) setRoot(res.root);
  };

  const del = (node: VNode) => {
    if (node.type === 'dir' && node.children.length > 0 && !window.confirm(`Delete "${node.name}" and everything inside it?`)) return;
    const res = fsRemove(root, path, node.name, true);
    if (res.ok) {
      setRoot(res.root);
      if (preview && node.type === 'file' && preview.name === node.name) setPreview(null);
    }
  };

  // Breadcrumb segments (collapsing /home/ed → ~).
  const crumbs: { label: string; parts: string[] }[] = [];
  if (path[0] === 'home' && path[1] === 'ed') {
    crumbs.push({ label: '~', parts: HOME });
    for (let i = 2; i < path.length; i++) crumbs.push({ label: path[i], parts: path.slice(0, i + 1) });
  } else {
    crumbs.push({ label: 'Macintosh HD', parts: [] });
    for (let i = 0; i < path.length; i++) crumbs.push({ label: path[i], parts: path.slice(0, i + 1) });
  }

  return (
    <div className='@container flex h-full w-full bg-card text-foreground'>
      {/* sidebar */}
      <aside className='hidden w-36 shrink-0 flex-col gap-0.5 border-r bg-secondary/40 p-2 @[440px]:flex'>
        <div className='px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>Favourites</div>
        {FAVORITES.map((f) => (
          <button
            key={f.label}
            type='button'
            onClick={() => go(f.path)}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition hover:bg-foreground/10',
              samePath(path, f.path) && 'bg-foreground/10 font-semibold'
            )}
          >
            <span className='text-[15px]'>{f.glyph}</span>
            <span className='truncate'>{f.label}</span>
          </button>
        ))}
      </aside>

      {/* main */}
      <div className='flex min-w-0 flex-1 flex-col'>
        {/* toolbar */}
        <div className='flex items-center gap-1.5 border-b bg-secondary/30 px-2.5 py-1.5'>
          <button
            type='button'
            onClick={() => (preview ? setPreview(null) : path.length > 0 && go(path.slice(0, -1)))}
            disabled={!preview && path.length === 0}
            title='Back'
            className='grid h-7 w-7 place-items-center rounded-md text-[15px] transition enabled:hover:bg-foreground/10 disabled:opacity-30'
          >
            ‹
          </button>
          <div className='os-scroll flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto text-[13px] text-muted-foreground'>
            {crumbs.map((c, i) => (
              <span key={c.parts.join('/')} className='flex items-center gap-0.5'>
                {i > 0 && <span className='opacity-40'>/</span>}
                <button
                  type='button'
                  onClick={() => go(c.parts)}
                  className={cn(
                    'shrink-0 rounded px-1 py-0.5 transition hover:bg-foreground/10',
                    i === crumbs.length - 1 && !preview && 'font-semibold text-foreground'
                  )}
                >
                  {c.label}
                </button>
              </span>
            ))}
            {preview && (
              <span className='flex items-center gap-0.5'>
                <span className='opacity-40'>/</span>
                <span className='px-1 font-semibold text-foreground'>{preview.name}</span>
              </span>
            )}
          </div>
          {!preview && (
            <Dropdown
              id='new'
              title='New ▾'
              entries={[
                { label: 'Folder', onSelect: newFolder },
                { label: 'Text File', onSelect: newFile },
              ]}
              openId={menuOpen}
              setOpenId={setMenuOpen}
              align='right'
              titleClassName='h-7 px-2 text-[13px] font-medium'
            />
          )}
          <button
            type='button'
            onClick={() => setShowHidden((v) => !v)}
            title={showHidden ? 'Hide hidden files' : 'Show hidden files'}
            className={cn('grid h-7 w-7 place-items-center rounded-md text-[13px] transition hover:bg-foreground/10', showHidden && 'bg-foreground/10')}
          >
            👁
          </button>
        </div>

        {/* body */}
        {preview ? (
          <FilePreview file={preview} />
        ) : (
          <div className='os-scroll flex-1 overflow-y-auto p-3'>
            {items.length === 0 ? (
              <div className='grid h-full place-items-center text-sm text-muted-foreground'>This folder is empty.</div>
            ) : (
              <div className='grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-1'>
                {items.map((node) => (
                  <div key={node.name} className='group relative'>
                    <button
                      type='button'
                      onClick={() => open(node)}
                      title={node.name}
                      className='flex w-full flex-col items-center gap-1.5 rounded-lg p-2.5 text-center transition hover:bg-foreground/10'
                    >
                      <NodeGlyph node={node} />
                      <span className='line-clamp-2 w-full break-words text-[11.5px] leading-tight'>{node.name}</span>
                    </button>
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        del(node);
                      }}
                      title={`Delete ${node.name}`}
                      className='absolute right-1 top-1 hidden h-5 w-5 place-items-center rounded-full border border-border bg-card text-[11px] text-muted-foreground shadow-sm transition hover:bg-[var(--brand-red)] hover:text-white group-hover:grid'
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* status bar */}
        <div className='flex items-center justify-between border-t bg-secondary/30 px-3 py-1 text-[11px] text-muted-foreground'>
          <span>{preview ? preview.name : `${items.length} item${items.length === 1 ? '' : 's'}`}</span>
          {!preview && currentDir?.info && <span className='truncate pl-2'>{currentDir.info}</span>}
        </div>
      </div>
    </div>
  );
}

function NodeGlyph({ node }: { node: VNode }) {
  if (node.type === 'file' && node.kind === 'app' && node.app) {
    return <AppIcon iconId={getAppMeta(node.app).iconId} size={40} />;
  }
  if (node.type === 'file' && node.kind === 'image' && node.src) {
    return (
      <span className='grid h-10 w-10 place-items-center overflow-hidden rounded-md border bg-background'>
        <img src={node.src} alt='' width={40} height={40} className='h-full w-full object-cover' style={{ imageRendering: 'pixelated' }} />
      </span>
    );
  }
  const glyph = node.type === 'dir' ? kindGlyph.dir : kindGlyph[node.kind];
  return <span className='text-[34px] leading-none'>{glyph}</span>;
}

function FilePreview({ file }: { file: VFile }) {
  if (file.kind === 'image' && file.src) {
    return (
      <div
        className='os-scroll grid flex-1 place-items-center overflow-auto p-4'
        style={{ background: 'repeating-conic-gradient(rgba(0,0,0,0.06) 0 25%, transparent 0 50%) 0 / 20px 20px' }}
      >
        <img src={file.src} alt={file.name} className='max-h-full max-w-full rounded-md object-contain shadow-lg' style={{ imageRendering: 'pixelated' }} />
      </div>
    );
  }
  return (
    <div className='os-scroll flex-1 overflow-auto bg-background/40 p-4'>
      <pre className='whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-foreground/90'>{file.content ?? '(empty file)'}</pre>
    </div>
  );
}
