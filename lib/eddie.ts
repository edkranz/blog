/**
 * Single source of truth for Eddie's profile, used across the OS apps.
 * Grounded in content/posts/about.mdx and content/global — kept honest.
 */

import projectsData from '@/content/projects.json';

export const profile = {
  name: 'Eddie Kranz',
  firstName: 'Eddie',
  role: 'Software Engineer',
  company: { name: 'SSW', url: 'https://www.ssw.com.au/people/eddie-kranz/' },
  /** The GitHub repo this site is built from; the Todo app lists its issues. */
  repo: 'edkranz/blog',
  location: 'Sydney, Australia',
  email: 'ed@kranz.au',
  avatar: '/uploads/authors/eddie.jpg',
  tagline: 'Building high-quality, efficient software with a keen eye for detail.',
  intro: "Hi, I'm Eddie",
  blurb:
    "I'm a Software Engineer at SSW with a passion for crafting precise, high-quality solutions. I work across .NET, TypeScript and AI, and I once fixed a bug on this very site from my motorbike.",
} as const;

export type Social = {
  id: 'github' | 'linkedin' | 'youtube' | 'email' | 'ssw';
  label: string;
  handle: string;
  url: string;
  color: string; // brand color for hover
};

export const socials: Social[] = [
  { id: 'github', label: 'GitHub', handle: '@edkranz', url: 'https://github.com/edkranz', color: '#1d1f27' },
  { id: 'linkedin', label: 'LinkedIn', handle: 'in/kranz', url: 'https://www.linkedin.com/in/kranz', color: '#0a66c2' },
  { id: 'youtube', label: 'YouTube', handle: '@eddiekranz', url: 'https://www.youtube.com/@eddiekranz', color: '#ff0033' },
  { id: 'email', label: 'Email', handle: 'ed@kranz.au', url: 'mailto:ed@kranz.au', color: '#f54e00' },
  { id: 'ssw', label: 'SSW Profile', handle: 'ssw.com.au', url: 'https://www.ssw.com.au/people/eddie-kranz/', color: '#cc4141' },
];

export const technologies = [
  '.NET',
  'C#',
  'Web APIs',
  'TypeScript',
  'JavaScript',
  'Angular',
  'Next.js',
  'React',
  'Python',
  'FastAPI',
  'Azure',
  'Azure OpenAI',
  'SQL',
  'EF Core',
  'Docker',
  'GitHub Actions',
];

export type Skill = { title: string; body: string; accent: string };

export const skills: Skill[] = [
  {
    title: 'Frontend Development',
    body: 'Responsive, accessible UIs in Angular, React and Next.js with a focus on UX design principles.',
    accent: 'var(--brand-blue)',
  },
  {
    title: 'Backend Development',
    body: 'Robust, secure services across the .NET ecosystem: Web APIs, EF Core, SQL and IdentityServer.',
    accent: 'var(--brand-red)',
  },
  {
    title: 'AI & Machine Learning',
    body: 'Shipping AI features with Azure OpenAI and the OpenAI API, plus LLM application fundamentals.',
    accent: 'var(--brand-purple)',
  },
  {
    title: 'Cloud & DevOps',
    body: 'Azure services, Docker containerisation and CI/CD pipelines via GitHub Actions.',
    accent: 'var(--brand-green)',
  },
];

export const education = [
  'Bachelor of Advanced Computing (Software Development), The University of Sydney',
  'Thesis: “Portal Redirection in Virtual Reality using Impossible Spaces”',
  'SSW FireBootCamp graduate (Scrum · .NET · Angular · Azure · OpenAI)',
];

export const hobbies = [
  'Fixing, building & maintaining motorcycles 🏍️',
  'Tinkering with bicycles 🚲',
  '3D printing & woodworking 🪚',
  'Reading & crossword puzzles 🧩',
  'Cycling & bouldering 🧗',
];

export type Project = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tech: string[];
  emoji: string;
  accent: string;
  year: string;
  /** Where the "open" button leads. */
  link?: { kind: 'url'; href: string; label: string } | { kind: 'post'; slug: string; label: string } | { kind: 'app'; appId: string; label: string };
};

/** Projects are content: edit `content/projects.json`, not this file. */
export const projects: Project[] = projectsData as Project[];
