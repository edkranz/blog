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
