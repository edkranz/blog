import Link from 'next/link';

export default function NotFound() {
  return (
    <div className='wp-aurora grain fixed inset-0 grid place-items-center p-4'>
      <div className='os-window-shadow-focused w-full max-w-md overflow-hidden rounded-[var(--win-radius)] bg-card text-card-foreground'>
        <div className='flex h-[38px] items-center gap-2 border-b bg-secondary/70 px-3'>
          <span className='h-3.5 w-3.5 rounded-full bg-[#ff5f57]' />
          <span className='h-3.5 w-3.5 rounded-full bg-[#febc2e]' />
          <span className='h-3.5 w-3.5 rounded-full bg-[#28c840]' />
          <span className='flex-1 text-center text-[13px] font-semibold opacity-70'>Error</span>
          <span className='w-10' />
        </div>
        <div className='px-7 py-9 text-center'>
          <div className='text-6xl'>🛸</div>
          <h1 className='mt-4 text-2xl font-bold'>404 — File not found</h1>
          <p className='mt-2 text-[15px] leading-relaxed text-muted-foreground'>
            This window drifted off into deep space. The file you&apos;re looking for isn&apos;t on this machine.
          </p>
          <Link
            href='/'
            className='btn-chunky mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground'
          >
            Return to Desktop
          </Link>
        </div>
      </div>
    </div>
  );
}
