'use client';

import { useAdminStore } from '@/lib/os/admin/store';
import { useEffect } from 'react';
import { AdminDialog } from './dialog';
import { LoginScreen } from './login-screen';

export function AdminLayer() {
  const session = useAdminStore((s) => s.session);
  const dirty = useAdminStore((s) => Object.keys(s.pending).length > 0);

  useEffect(() => {
    void useAdminStore.getState().init();
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  if (session === undefined) return null;
  if (session === null) return <LoginScreen />;
  return <AdminDialog />;
}
