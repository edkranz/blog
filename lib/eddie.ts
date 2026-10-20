/**
 * Single source of truth for Eddie's profile, used across the OS apps.
 * Copy is content: edit `content/profile.json` (or /admin), not this file.
 */

import projectsData from '@/content/projects.json';
import siteData from '@/content/profile.json';

export type SiteContent = typeof siteData;
export const siteContent: SiteContent = siteData;

export const profile = {
  ...siteData.profile,
  /** The GitHub repo this site is built from; the Todo app lists its issues. */
  repo: 'edkranz/blog',
};

export type Social = {
  id: 'github' | 'linkedin' | 'youtube' | 'email' | 'ssw';
  label: string;
  handle: string;
  url: string;
  color: string; // brand color for hover
};

export const socials = siteData.socials as Social[];
export const technologies: string[] = siteData.technologies;

export type Skill = { title: string; body: string; accent: string };
export const skills: Skill[] = siteData.skills;
export const education: string[] = siteData.education;
export const hobbies: string[] = siteData.hobbies;
export const about = siteData.about;
export const contact = siteData.contact;

export type ProjectLink =
  | { kind: 'url'; href: string; label: string }
  | { kind: 'post'; slug: string; label: string }
  | { kind: 'app'; appId: string; label: string };

/** Projects are grouped under these headings, in this order. */
export const PROJECT_SECTIONS = [
  { id: 'work', label: 'Work' },
  { id: 'projects', label: 'Projects' },
  { id: 'uni', label: 'University' },
] as const;
export type ProjectSection = (typeof PROJECT_SECTIONS)[number]['id'];

export type Project = {
  id: string;
  section: ProjectSection;
  title: string;
  subtitle: string;
  description: string;
  tech: string[];
  emoji: string;
  accent: string;
  year: string;
  /** The buttons at the bottom of the card: source, demo videos, papers, posts. */
  links?: ProjectLink[];
};

/** Where a link points, as an absolute path or URL (posts resolve to their static route). */
export const projectLinkHref = (l: ProjectLink): string | null => (l.kind === 'url' ? l.href : l.kind === 'post' ? `/blog/${l.slug}` : null);

/** Projects are content: edit `content/projects.json`, not this file. */
export const projects: Project[] = projectsData as Project[];
