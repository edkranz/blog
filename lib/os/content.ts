'use client';

import { overlay } from '@/lib/admin/overlay';
import type { AdminPostMeta } from '@/lib/admin/types';
import { type Project, type SiteContent, siteContent, projects as staticProjects } from '@/lib/eddie';
import { useMemo } from 'react';
import { isEditing, useAdminStore } from './admin/store';

/** Build-time content for visitors; in /admin, the branch's content with unsaved edits applied. */
export function useContent(): { site: SiteContent; projects: Project[]; editing: boolean } {
  const editing = useAdminStore(isEditing);
  const remote = useAdminStore((s) => s.remote);
  const pending = useAdminStore((s) => s.pending);
  return useMemo(() => {
    if (!editing || !remote) return { site: siteContent, projects: staticProjects, editing: false };
    const o = overlay(remote, pending);
    return { site: o.profile as SiteContent, projects: o.projects as Project[], editing: true };
  }, [editing, remote, pending]);
}

/** Every post on the branch (hidden ones too) with unsaved edits applied, or null outside /admin. */
export function useEditablePosts(): AdminPostMeta[] | null {
  const editing = useAdminStore(isEditing);
  const remote = useAdminStore((s) => s.remote);
  const pending = useAdminStore((s) => s.pending);
  return useMemo(() => (editing && remote ? overlay(remote, pending).posts : null), [editing, remote, pending]);
}
