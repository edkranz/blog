'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SEED_VERSION, type VDir, buildSeedRoot } from './filesystem';

type FSStore = {
  /** The live, mutable file-system tree (persisted to localStorage). */
  root: VDir;
  setRoot: (root: VDir) => void;
  /** Restore the factory seed (the `reset` command / Files menu). */
  reset: () => void;
};

export const useFsStore = create<FSStore>()(
  persist(
    (set) => ({
      root: buildSeedRoot(),
      setRoot: (root) => set({ root }),
      reset: () => set({ root: buildSeedRoot() }),
    }),
    {
      name: 'eddie-fs',
      version: SEED_VERSION,
      // Only the tree is persisted; the actions come from the initializer.
      partialize: (s) => ({ root: s.root }),
      // When the bundled seed changes (SEED_VERSION bump), start fresh.
      migrate: () => ({ root: buildSeedRoot() }),
    }
  )
);
