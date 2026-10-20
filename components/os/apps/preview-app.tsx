'use client';

import type { OSWindow } from '@/lib/os/types';
import { isLocalPdf } from '@/lib/os/viewers';

/** A PDF in the browser's own viewer. Only same-origin documents are shown. */
export function PreviewApp({ win }: { win: OSWindow }) {
  const src = win.props?.src as string | undefined;

  return (
    <div className='h-full w-full overflow-hidden bg-[#525659]'>
      {src && isLocalPdf(src) ? <iframe src={`${src}#view=FitH&navpanes=0`} title={win.title} className='h-full w-full border-0' /> : null}
    </div>
  );
}
