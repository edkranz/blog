'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Wallpaper = 'retro' | 'cream' | 'sunrise' | 'grid' | 'retro-night' | 'midnight' | 'aurora';

export const WALLPAPERS: { id: Wallpaper; label: string; className: string; dark: boolean }[] = [
  { id: 'retro', label: 'Pixel Sunrise', className: 'wp-retro', dark: false },
  { id: 'cream', label: 'Cream', className: 'wp-cream', dark: false },
  { id: 'sunrise', label: 'Sunrise', className: 'wp-sunrise', dark: false },
  { id: 'grid', label: 'Graph Paper', className: 'wp-grid', dark: false },
  { id: 'retro-night', label: 'Pixel Night', className: 'wp-retro-night', dark: true },
  { id: 'midnight', label: 'Midnight', className: 'wp-midnight', dark: true },
  { id: 'aurora', label: 'Aurora', className: 'wp-aurora', dark: true },
];

type PrefsStore = {
  wallpaperLight: Wallpaper;
  wallpaperDark: Wallpaper;
  reduceMotion: boolean;
  setWallpaper: (theme: 'light' | 'dark', wp: Wallpaper) => void;
  setReduceMotion: (v: boolean) => void;
};

export const usePrefs = create<PrefsStore>()(
  persist(
    (set) => ({
      wallpaperLight: 'retro',
      wallpaperDark: 'retro-night',
      reduceMotion: false,
      setWallpaper: (theme, wp) => set(theme === 'light' ? { wallpaperLight: wp } : { wallpaperDark: wp }),
      setReduceMotion: (v) => set({ reduceMotion: v }),
    }),
    { name: 'eddie-os-prefs' },
  ),
);

export function wallpaperClass(id: Wallpaper): string {
  return WALLPAPERS.find((w) => w.id === id)?.className ?? 'wp-cream';
}
