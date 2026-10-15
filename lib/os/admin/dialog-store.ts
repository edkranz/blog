'use client';

import { create } from 'zustand';

export type DialogRequest = {
  kind: 'prompt' | 'confirm';
  title: string;
  okLabel: string;
  initial: string;
  resolve: (value: string | boolean | null) => void;
};

export const useDialogStore = create<{ req: DialogRequest | null }>(() => ({ req: null }));

export function promptText(title: string, okLabel: string, initial = ''): Promise<string | null> {
  return new Promise((resolve) => useDialogStore.setState({ req: { kind: 'prompt', title, okLabel, initial, resolve: (v) => resolve(typeof v === 'string' ? v : null) } }));
}

export function confirmAction(title: string, okLabel: string): Promise<boolean> {
  return new Promise((resolve) => useDialogStore.setState({ req: { kind: 'confirm', title, okLabel, initial: '', resolve: (v) => resolve(v === true) } }));
}
