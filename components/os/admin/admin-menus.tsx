'use client';

import { confirmAction, promptText } from '@/lib/os/admin/dialog-store';
import { useAdminStore } from '@/lib/os/admin/store';
import { GitBranch } from 'lucide-react';
import { Dropdown, type MenuEntry } from '../menu';

type MenuProps = { openId: string | null; setOpenId: (id: string | null) => void };

export function BranchMenu(menu: MenuProps) {
  const branch = useAdminStore((s) => s.branch);
  const branches = useAdminStore((s) => s.branches);
  const session = useAdminStore((s) => s.session);
  const dirty = useAdminStore((s) => Object.keys(s.pending).length > 0);
  if (!session) return null;

  const switchTo = async (b: string) => {
    const st = useAdminStore.getState();
    if (b === st.branch) return;
    if (Object.keys(st.pending).length > 0) {
      if (!(await confirmAction('Discard unsaved changes?', 'Discard'))) return;
      st.discard();
    }
    await st.load(b).catch(() => {});
  };

  const entries: MenuEntry[] = [
    ...branches.map<MenuEntry>((b) => ({ label: b, checked: b === branch, onSelect: () => void switchTo(b) })),
    'sep',
    {
      label: 'New Branch…',
      onSelect: async () => {
        const name = await promptText('New Branch', 'Create');
        if (name) await useAdminStore.getState().createBranch(name);
      },
    },
    {
      label: 'Discard Changes',
      disabled: !dirty,
      onSelect: async () => {
        if (await confirmAction('Discard unsaved changes?', 'Discard')) useAdminStore.getState().discard();
      },
    },
  ];

  return (
    <Dropdown
      id='branch'
      title={
        <span className='inline-flex items-center gap-1'>
          <GitBranch size={13} /> {branch}
        </span>
      }
      entries={entries}
      {...menu}
    />
  );
}

export function AccountMenu(menu: MenuProps) {
  const session = useAdminStore((s) => s.session);
  if (!session) return null;
  const entries: MenuEntry[] = [
    { label: session.login, disabled: true },
    'sep',
    { label: 'Sign Out', onSelect: () => void useAdminStore.getState().signOut() },
  ];
  return (
    <Dropdown
      id='account'
      align='right'
      title={<img src={session.avatarUrl} alt={session.login} className='h-[18px] w-[18px] rounded-full' />}
      titleClassName='grid h-[22px] place-items-center px-1 py-0'
      entries={entries}
      {...menu}
    />
  );
}
