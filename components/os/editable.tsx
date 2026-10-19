'use client';

import type { JsonFile } from '@/lib/admin/types';
import { isEditing, useAdminStore } from '@/lib/os/admin/store';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import type { ElementType, ReactNode } from 'react';

type EditableProps = {
  file: JsonFile;
  path: string;
  value: string;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
  /** Committing an empty value removes the array item at `path`. */
  removable?: boolean;
  parse?: (text: string) => unknown;
  /** What visitors see; defaults to `value`. */
  children?: ReactNode;
};

export function Editable({ file, path, value, as: Tag = 'span', className, multiline, removable, parse, children }: EditableProps) {
  const editing = useAdminStore(isEditing);
  if (!editing) return <Tag className={className}>{children ?? value}</Tag>;
  return (
    <Tag
      key={value}
      contentEditable='plaintext-only'
      suppressContentEditableWarning
      spellCheck
      data-editable={path}
      className={cn(className, 'eos-editable', multiline && 'whitespace-pre-wrap')}
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Escape') {
          e.currentTarget.textContent = value;
          e.currentTarget.blur();
        } else if (e.key === 'Enter' && !multiline) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const text = (e.currentTarget.textContent ?? '').trim();
        if (text === value) return;
        const store = useAdminStore.getState();
        if (!text && removable) store.removeJsonItem(file, path);
        else store.editJson(file, path, parse ? parse(text) : text);
      }}
    >
      {value}
    </Tag>
  );
}

export function AddItem({ file, path, value, label }: { file: JsonFile; path: string; value: unknown; label: string }) {
  const editing = useAdminStore(isEditing);
  if (!editing) return null;
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      onClick={() => useAdminStore.getState().appendJsonItem(file, path, value)}
      className='inline-grid h-7 w-7 place-items-center rounded-full border border-dashed text-muted-foreground transition hover:border-primary hover:text-primary'
    >
      <Plus size={14} />
    </button>
  );
}
