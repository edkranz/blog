'use client';

import '@mdxeditor/editor/style.css';
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  type DirectiveDescriptor,
  DiffSourceToggleWrapper,
  GenericDirectiveEditor,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  directivesPlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from '@mdxeditor/editor';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

// `::sketch{name=particles height=320}` embeds a live canvas (components/os/sketches.tsx).
const SketchDirective: DirectiveDescriptor = {
  name: 'sketch',
  type: 'leafDirective',
  testNode: (node) => node.name === 'sketch',
  attributes: ['name', 'height'],
  hasChildren: false,
  Editor: GenericDirectiveEditor,
};

const CODE_LANGS: Record<string, string> = {
  '': 'Plain',
  txt: 'Text',
  ts: 'TypeScript',
  tsx: 'TSX',
  js: 'JavaScript',
  jsx: 'JSX',
  json: 'JSON',
  bash: 'Bash',
  sh: 'Shell',
  csharp: 'C#',
  cs: 'C#',
  python: 'Python',
  css: 'CSS',
  html: 'HTML',
  yaml: 'YAML',
  md: 'Markdown',
  mermaid: 'Mermaid',
  sql: 'SQL',
};

type Props = {
  markdown: string;
  original: string;
  dark: boolean;
  onChange: (markdown: string) => void;
  uploadImage: (file: File) => Promise<string>;
  previewImage: (src: string) => Promise<string>;
};

export default function MarkdownEditor({ markdown, original, dark, onChange, uploadImage, previewImage }: Props) {
  const plugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      tablePlugin(),
      imagePlugin({ imageUploadHandler: uploadImage, imagePreviewHandler: previewImage }),
      codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
      codeMirrorPlugin({ codeBlockLanguages: CODE_LANGS }),
      directivesPlugin({ directiveDescriptors: [SketchDirective] }),
      diffSourcePlugin({ viewMode: 'rich-text', diffMarkdown: original }),
      markdownShortcutPlugin(),
      toolbarPlugin({
        toolbarContents: () => (
          <DiffSourceToggleWrapper>
            <UndoRedo />
            <BlockTypeSelect />
            <BoldItalicUnderlineToggles />
            <CodeToggle />
            <ListsToggle />
            <CreateLink />
            <InsertImage />
            <InsertTable />
            <InsertCodeBlock />
            <InsertThematicBreak />
          </DiffSourceToggleWrapper>
        ),
      }),
    ],
    [original, uploadImage, previewImage]
  );

  return (
    <MDXEditor
      className={cn('eos-mdx', dark && 'dark-theme')}
      contentEditableClassName='prose prose-eddie max-w-none'
      markdown={markdown}
      onChange={(md, initialNormalize) => {
        if (!initialNormalize) onChange(md);
      }}
      onError={({ error }) => console.warn('[editor]', error)}
      plugins={plugins}
    />
  );
}
