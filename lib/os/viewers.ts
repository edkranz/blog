import { useWindowStore } from './store';
import type { AppId, WindowProps } from './types';

/** Open a viewer window for one item, or bring its window forward if that item is already open. */
function openOnce(appId: AppId, key: string, value: string, title: string) {
  const { windows, focusWindow, openApp } = useWindowStore.getState();
  const open = windows.find((w) => w.appId === appId && w.props?.[key] === value);
  if (open) focusWindow(open.id);
  else openApp(appId, { title, props: { [key]: value } as WindowProps });
}

/** Play a YouTube video in its own window. */
export const openVideo = (videoId: string, title: string) => openOnce('video', 'videoId', videoId, title);

/** Show a same-origin PDF in a Preview window. */
export const openDocument = (src: string, title: string) => openOnce('preview', 'src', src, title);

/** True for a link Preview can show: a PDF served by this site. */
export const isLocalPdf = (href: string) => href.startsWith('/') && href.toLowerCase().endsWith('.pdf');
