import { cn } from '@/lib/utils';
import type { IconId } from '@/lib/os/types';
import type * as React from 'react';

type SVG = React.SVGProps<SVGSVGElement>;

const base = (props: SVG) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
});

export const FaceIcon = (p: SVG) => (
  <svg {...base(p)}>
    <circle cx='12' cy='12' r='9' />
    <path d='M8.5 10.2h.01M15.5 10.2h.01' strokeWidth={2.4} />
    <path d='M8.5 14.5c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8' />
  </svg>
);

export const UserIcon = (p: SVG) => (
  <svg {...base(p)}>
    <circle cx='12' cy='8.5' r='3.6' />
    <path d='M5 19.5c.7-3.4 3.5-5.3 7-5.3s6.3 1.9 7 5.3' />
  </svg>
);

export const MonogramIcon = (p: SVG) => (
  <svg {...base(p)}>
    <rect x='3' y='3' width='18' height='18' rx='4' />
    <text x='12' y='15.5' textAnchor='middle' fontSize='8' fontWeight='700' fill='currentColor' stroke='none' fontFamily='monospace'>
      EK
    </text>
  </svg>
);

export const BookIcon = (p: SVG) => (
  <svg {...base(p)}>
    <path d='M5 4.5h8a2 2 0 0 1 2 2V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5Z' />
    <path d='M15 6.5h3a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1' />
    <path d='M8 8.5h4M8 11.5h4' />
  </svg>
);

export const GridIcon = (p: SVG) => (
  <svg {...base(p)}>
    <rect x='4' y='4' width='7' height='7' rx='1.6' />
    <rect x='13' y='4' width='7' height='7' rx='1.6' />
    <rect x='4' y='13' width='7' height='7' rx='1.6' />
    <rect x='13' y='13' width='7' height='7' rx='1.6' />
  </svg>
);

export const TerminalIcon = (p: SVG) => (
  <svg {...base(p)}>
    <rect x='3' y='4.5' width='18' height='15' rx='2.4' />
    <path d='M7 9.5l3 2.6-3 2.6M12.5 15h4' />
  </svg>
);

export const MineIcon = (p: SVG) => (
  <svg {...base(p)}>
    <circle cx='12' cy='13' r='6' />
    <path d='M12 4v3M12 7l1.6-1.6M18 7l1.6-1.6M6 7L4.4 5.4' />
    <path d='M9.5 11.5a3 3 0 0 1 2.5-1.5' strokeWidth={1.3} />
  </svg>
);

export const MailIcon = (p: SVG) => (
  <svg {...base(p)}>
    <rect x='3' y='5.5' width='18' height='13' rx='2.4' />
    <path d='M4 7.5l8 5.5 8-5.5' />
  </svg>
);

export const GearIcon = (p: SVG) => (
  <svg {...base(p)}>
    <circle cx='12' cy='12' r='3.2' />
    <path d='M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6' />
  </svg>
);

export const TrashIcon = (p: SVG) => (
  <svg {...base(p)}>
    <path d='M4.5 6.5h15M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5' />
    <path d='M6.5 6.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.5' />
    <path d='M10 10.5v6M14 10.5v6' />
  </svg>
);

export const TetrisIcon = (p: SVG) => (
  <svg {...base(p)}>
    <rect x='4.5' y='5' width='5.4' height='5.4' rx='1.2' />
    <rect x='9.9' y='5' width='5.4' height='5.4' rx='1.2' />
    <rect x='9.9' y='10.4' width='5.4' height='5.4' rx='1.2' />
    <rect x='15.3' y='10.4' width='5.4' height='5.4' rx='1.2' />
  </svg>
);

export const ICONS: Record<IconId, (p: SVG) => React.JSX.Element> = {
  tetris: TetrisIcon,
  face: FaceIcon,
  user: UserIcon,
  monogram: MonogramIcon,
  book: BookIcon,
  grid: GridIcon,
  terminal: TerminalIcon,
  mine: MineIcon,
  mail: MailIcon,
  gear: GearIcon,
  trash: TrashIcon,
};

/** A rounded retro app-icon tile rendered from a generated pixel-art PNG at /public/icons/<iconId>.png. */
export function AppIcon({
  iconId,
  accent,
  size = 44,
  className,
  rounded = 12,
}: {
  iconId: IconId;
  accent?: string;
  size?: number;
  className?: string;
  rounded?: number;
}) {
  return (
    <span
      className={cn('relative inline-block shrink-0 select-none overflow-hidden', className)}
      style={{ width: size, height: size, borderRadius: rounded, boxShadow: '0 1px 2px rgba(0,0,0,0.22), inset 0 0 0 1px rgba(0,0,0,0.16)' }}
    >
      <img src={`/icons/${iconId}.png`} alt='' width={size} height={size} draggable={false} className='h-full w-full object-cover' />
      <span
        aria-hidden
        className='pointer-events-none absolute inset-x-0 top-0 h-1/3'
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.16), transparent)' }}
      />
    </span>
  );
}
