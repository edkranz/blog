export const MENUBAR_H = 30;
export const TITLEBAR_H = 38;
export const DOCK_RESERVED = 104; // vertical space kept clear for the dock
export const WINDOW_MARGIN = 8;
export const MOBILE_BP = 760;

export type WorkArea = { x: number; y: number; w: number; h: number };

export function getWorkArea(vw: number, vh: number): WorkArea {
  return {
    x: WINDOW_MARGIN,
    y: MENUBAR_H + WINDOW_MARGIN,
    w: vw - WINDOW_MARGIN * 2,
    h: vh - MENUBAR_H - DOCK_RESERVED,
  };
}
