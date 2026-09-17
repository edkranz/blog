import { C, type Line, out } from './types';

export const NEOFETCH: Line[] = [
  [
    { t: '       ___          ', c: C.red },
    { t: 'ed', c: C.ok },
    { t: '@', c: C.dim },
    { t: 'kranz.au', c: 'text-sky-400' },
  ],
  [
    { t: '      (• ◡ •)         ', c: C.red },
    { t: '----------------', c: C.dimmer },
  ],
  [
    { t: '      /|   |\\         ', c: C.red },
    { t: 'OS', c: C.head },
    { t: ': Eddie OS 1.0', c: C.text },
  ],
  [
    { t: '       \\___/          ', c: C.red },
    { t: 'Host', c: C.head },
    { t: ': kranz.au', c: C.text },
  ],
  [
    { t: '   ╔══════════════╗   ', c: 'text-fuchsia-400' },
    { t: 'Kernel', c: C.head },
    { t: ': React 19 + Next 16', c: C.text },
  ],
  [
    { t: '   ║  E D D I E    ║   ', c: 'text-fuchsia-400' },
    { t: 'Shell', c: C.head },
    { t: ': eksh 2.0', c: C.text },
  ],
  [
    { t: '   ║  K R A N Z    ║   ', c: 'text-fuchsia-400' },
    { t: 'WM', c: C.head },
    { t: ': zustand-wm', c: C.text },
  ],
  [
    { t: '   ╚══════════════╝   ', c: 'text-fuchsia-400' },
    { t: 'CPU', c: C.head },
    { t: ': Caffeine ×8', c: C.text },
  ],
  [
    { t: '                      ', c: 'text-fuchsia-400' },
    { t: 'Memory', c: C.head },
    { t: ': 42 half-baked ideas', c: C.text },
  ],
  [
    { t: '                      ', c: 'text-fuchsia-400' },
    { t: 'Dog', c: C.head },
    { t: ': Zeppelin (good boy)', c: C.text },
  ],
];

export const MOTORBIKE: Line[] = [out('      __o', C.head), out('    _ \\<_   vroom vroom 🏍️', C.head), out('   (_)/(_)', C.head)];

export const TRAIN: Line[] = [
  '      ====        ________                ___________ ',
  '  _D _|  |_______/        \\__I_I_____===__|_________| ',
  '   |(_)---  |   H\\________/ |   |        =|___ ___|   ',
  '   /     |  |   H  |  |     |   |         ||_| |_||   ',
  '  |      |  |   H  |__--------------------| [___] |   ',
  '  | ________|___H__/__|_____/[][]~\\_______|       |   ',
  '  |/ |   |-----------I_____I [][] []  D   |=======|__ ',
  '__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__ ',
  ' |/-=|___|=    ||    ||    ||    |_____/~\\___/        ',
  '  \\_/      \\O=====O=====O=====O_/      \\_/            ',
].map((l) => out(l, C.head));

/** Wrap text into a speech bubble, cowsay-style. */
export function bubble(text: string, width = 40): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const rows: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && `${cur} ${w}`.length > width) {
      rows.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) rows.push(cur);
  if (rows.length === 0) rows.push('...');
  const w = Math.max(...rows.map((r) => r.length));
  const pad = (r: string) => r.padEnd(w);
  const lines = [` ${'_'.repeat(w + 2)}`];
  if (rows.length === 1) lines.push(`< ${pad(rows[0])} >`);
  else
    rows.forEach((r, i) => {
      const [l, rr] = i === 0 ? ['/', '\\'] : i === rows.length - 1 ? ['\\', '/'] : ['|', '|'];
      lines.push(`${l} ${pad(r)} ${rr}`);
    });
  lines.push(` ${'-'.repeat(w + 2)}`);
  return lines;
}

export const COW = [
  '        \\   ^__^',
  '         \\  (oo)\\_______',
  '            (__)\\       )\\/\\',
  '                ||----w |',
  '                ||     ||',
];

export const DOG = [
  '        \\   __',
  '         \\ /  \\~~~/  \\',
  '           (    ..    )',
  '            \\__  __/',
  '               ) (   woof',
  '              (___)',
];

export const TUX = [
  '        \\',
  '         \\   .--.',
  '            |o_o |',
  '            |:_/ |',
  '           //   \\ \\',
  '          (|     | )',
  "         /'\\_   _/`\\",
  '         \\___)=(___/',
];

export const FORTUNES = [
  'There are only two hard things in computer science: cache invalidation, naming things, and off-by-one errors.',
  'It works on my machine. -- everyone, always',
  'A good programmer is someone who looks both ways before crossing a one-way street.',
  'Weeks of coding can save you hours of planning.',
  'The best code is no code at all.',
  "Programming is 10% writing code and 90% understanding why it doesn't work.",
  'In theory, theory and practice are the same. In practice, they are not.',
  'Any sufficiently advanced bug is indistinguishable from a feature.',
  'Deleted code is debugged code.',
  "The cloud is just someone else's computer. This OS is just your browser.",
  'A dog will never rm -rf your home directory. Be more like a dog.',
  'Real programmers count from 0.',
  'Talk is cheap. Show me the code. -- Linus Torvalds',
  'First, solve the problem. Then, write the code. -- John Johnson',
  'Simplicity is prerequisite for reliability. -- Edsger Dijkstra',
  '99 little bugs in the code, 99 little bugs. Take one down, patch it around… 127 little bugs in the code.',
  "You have not lived until you've merged a 3-week-old branch on a Friday afternoon.",
  'The motorbike is the original hot-reload.',
];

export const BARKS = ['woof', 'woof woof', 'awoooo~', 'woof! 🐾', 'borf', '*tail wag intensifies*', 'woof woof woof!'];
