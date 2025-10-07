'use client';
import * as React from 'react';
import type { Template } from 'tinacms';
import { tinaField } from 'tinacms/dist/react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Github, Linkedin, Youtube } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';

type BusinessCardProps = {
  data: {
    initials?: string;
    name?: string;
    title?: string;
    companyLogo?: string;
    companyUrl?: string;
    companyLogoScale?: number;
    phone?: string;
    email?: string;
    githubUrl?: string;
    linkedinUrl?: string;
    youtubeUrl?: string;
    blogUrl?: string;
    blogColor?: string;
    nameSize?: number;
    nameColor?: string;
    titleSize?: number;
    titleColor?: string;
    tagline?: string;
    photo?: string;
  };
};

export const BusinessCard: React.FC<BusinessCardProps> = ({ data }) => {
  const [spinCount, setSpinCount] = React.useState(0);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [isExiting, setIsExiting] = React.useState(false);
  
  const initials = data.initials || 'EK';
  const name = data.name || 'Eddie Kranz';
  const title = data.title || 'Software Engineer';
  const companyLogo = data.companyLogo;
  const companyUrl = data.companyUrl;
  const companyLogoScale = data.companyLogoScale || 1;
  const phone = data.phone || '';
  const email = data.email || '';
  const githubUrl = data.githubUrl || '';
  const linkedinUrl = data.linkedinUrl || '';
  const youtubeUrl = data.youtubeUrl || '';
  const blogUrl = data.blogUrl || '';
  const blogColor = data.blogColor || '#8b5cf6';
  const nameSize = data.nameSize || 2;
  const nameColor = data.nameColor || '';
  const titleSize = data.titleSize || 1;
  const titleColor = data.titleColor || '';
  const tagline = data.tagline || 'Building digital experiences with precision';
  const photo = data.photo;

  const handlePhotoClick = () => {
    setSpinCount(prev => prev + 1);
    setIsAnimating(true);
    
    // Clear any existing timeout
    setTimeout(() => {
      setIsAnimating(false);
      setSpinCount(0);
    }, 800);
  };

  // Calculate text sizes
  const getNameSize = () => {
    const sizeMap = {
      1: 'text-xl',
      2: 'text-4xl',
      3: 'text-5xl',
      4: 'text-6xl'
    };
    return sizeMap[nameSize as keyof typeof sizeMap] || 'text-4xl';
  };

  const getTitleSize = () => {
    const sizeMap = {
      1: 'text-sm',
      2: 'text-base',
      3: 'text-lg',
      4: 'text-xl'
    };
    return sizeMap[titleSize as keyof typeof sizeMap] || 'text-base';
  };

  return (
    <section className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        className="relative w-full max-w-md overflow-hidden rounded-3xl p-6 sm:p-8 bg-white/35 dark:bg-slate-900/30 backdrop-blur-xl ring-1 ring-white/20 shadow-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: 80 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        style={{ translateX: isExiting ? 80 : 0, opacity: isExiting ? 0 : 1, transition: 'transform 0.25s ease, opacity 0.25s ease' }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute top-3 right-3 w-20 h-20 sm:w-32 sm:h-32 bg-gradient-to-br from-cyan-200 to-blue-300 dark:from-cyan-800 dark:to-blue-900 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-6 left-6 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-teal-200 to-cyan-300 dark:from-teal-800 dark:to-cyan-900 rounded-full blur-2xl animate-pulse [animation-delay:1000ms]" />
        </div>

        <div className="relative z-10 text-left">
          <div className={`mb-6 flex ${photo ? 'flex-col-reverse sm:flex-row' : 'flex-row'} items-start gap-4`}>
            <div className="flex-1 flex flex-col justify-between">
              <div className="flex-[2]">
                <h1
                  className={`${getNameSize()} font-bold text-balance leading-tight`}
                  style={{ color: nameColor || undefined }}
                  data-tina-field={tinaField(data as any, 'name')}
                >
                  {name}
                </h1>
              </div>
              
              <div className="flex-1 flex items-end mt-1">
                <div 
                  className={`flex items-center gap-2 ${getTitleSize()} font-medium`}
                  style={{ color: titleColor || undefined }}
                  data-tina-field={tinaField(data as any, 'title')}
                >
                  <span>{title}</span>
                  {companyLogo && (
                    <>
                      <span>@</span>
                      {companyUrl ? (
                        <a href={companyUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                          <Image 
                            src={companyLogo} 
                            alt="Company logo" 
                            width={20 * companyLogoScale} 
                            height={20 * companyLogoScale} 
                            className="object-contain" 
                            style={{ width: `${20 * companyLogoScale}px`, height: `${20 * companyLogoScale}px` }}
                            data-tina-field={tinaField(data as any, 'companyLogo')} 
                          />
                        </a>
                      ) : (
                        <Image 
                          src={companyLogo} 
                          alt="Company logo" 
                          width={20 * companyLogoScale} 
                          height={20 * companyLogoScale} 
                          className="object-contain" 
                          style={{ width: `${20 * companyLogoScale}px`, height: `${20 * companyLogoScale}px` }}
                          data-tina-field={tinaField(data as any, 'companyLogo')} 
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {photo && (
              <div 
                className="w-20 h-20 rounded-2xl overflow-hidden ring-1 ring-white/30 shadow-lg cursor-pointer hover:ring-2 hover:ring-white/50 hover:scale-105 transition-all duration-200"
                style={{
                  transform: isAnimating ? `rotate(${360 * spinCount}deg)` : 'rotate(0deg)',
                  transition: isAnimating ? `transform ${Math.max(0.4, 0.8 / spinCount)}s cubic-bezier(0.25, 0.46, 0.45, 0.94)` : 'transform 0.2s ease-out'
                }}
                onClick={handlePhotoClick}
                data-tina-field={tinaField(data as any, 'photo')}
              >
                <Image src={photo} alt={name} width={160} height={160} className="w-20 h-20 object-cover" />
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {phone && (
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-medium text-foreground bg-white/30 dark:bg-slate-900/30 backdrop-blur-lg ring-1 ring-white/25 hover:text-primary transition-colors group w-full sm:flex-1"
                data-tina-field={tinaField(data as any, 'phone')}
              >
                <Phone className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                {phone}
              </a>
            )}

            {email && (
              <a
                href={`mailto:${email}`}
                className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-medium text-foreground bg-white/30 dark:bg-slate-900/30 backdrop-blur-lg ring-1 ring-white/25 hover:text-primary transition-colors group w-full sm:flex-1"
                data-tina-field={tinaField(data as any, 'email')}
              >
                <Mail className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                {email}
              </a>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            {blogUrl && (
              <Button
                variant="ghost"
                className="rounded-xl px-4 h-12 bg-white/30 dark:bg-slate-900/30 backdrop-blur-lg hover:text-white text-sm font-medium transition-all duration-150 ease-in-out w-full sm:w-auto"
                style={{
                  '--hover-bg': blogColor,
                } as React.CSSProperties & { '--hover-bg': string }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = blogColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                }}
                asChild
                data-tina-field={tinaField(data as any, 'blogUrl')}
              >
                <Link href={blogUrl} prefetch>
                  Blog
                </Link>
              </Button>
            )}

            <div className="flex gap-3 justify-center sm:justify-end">
              {githubUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl w-12 h-12 bg-white/30 dark:bg-slate-900/30 backdrop-blur-lg hover:bg-slate-600 hover:text-white transition-all duration-150 ease-in-out"
                  asChild
                  data-tina-field={tinaField(data as any, 'githubUrl')}
                >
                  <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                    <Github className="w-5 h-5" />
                    <span className="sr-only">GitHub</span>
                  </a>
                </Button>
              )}

              {linkedinUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl w-12 h-12 bg-white/30 dark:bg-slate-900/30 backdrop-blur-lg hover:bg-blue-600 hover:text-white transition-all duration-150 ease-in-out"
                  asChild
                  data-tina-field={tinaField(data as any, 'linkedinUrl')}
                >
                  <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="w-5 h-5" />
                    <span className="sr-only">LinkedIn</span>
                  </a>
                </Button>
              )}

              {youtubeUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl w-12 h-12 bg-white/30 dark:bg-slate-900/30 backdrop-blur-lg hover:bg-red-500 hover:text-white transition-all duration-150 ease-in-out"
                  asChild
                  data-tina-field={tinaField(data as any, 'youtubeUrl')}
                >
                  <a href={youtubeUrl} target="_blank" rel="noopener noreferrer">
                    <Youtube className="w-5 h-5" />
                    <span className="sr-only">YouTube</span>
                  </a>
                </Button>
              )}
            </div>
          </div>

          {tagline && (
            <div className="mt-6 pt-4 border-t border-white/20 dark:border-white/10">
              <p className="text-xs text-foreground" data-tina-field={tinaField(data as any, 'tagline')}>{tagline}</p>
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
};

// Custom Slider Components
const NameSizeSlider = ({ input, field }) => {
  const sizeLabels = {
    1: 'Small (XL)',
    2: 'Medium (4XL)',
    3: 'Large (5XL)', 
    4: 'Extra Large (6XL)'
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium">{field.label}</label>
        <span className="text-xs text-gray-500">{sizeLabels[input.value as keyof typeof sizeLabels] || sizeLabels[2]}</span>
      </div>
      <input
        type="range"
        min="1"
        max="4"
        step="1"
        className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer hover:bg-blue-300 transition-colors"
        value={input.value || 2}
        onChange={(e) => input.onChange(Number(e.target.value))}
        onBlur={input.onBlur}
        onFocus={input.onFocus}
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>Small</span>
        <span>Medium</span>
        <span>Large</span>
        <span>XL</span>
      </div>
    </div>
  );
};

const TitleSizeSlider = ({ input, field }) => {
  const sizeLabels = {
    1: 'Small (SM)',
    2: 'Medium (Base)',
    3: 'Large (LG)',
    4: 'Extra Large (XL)'
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium">{field.label}</label>
        <span className="text-xs text-gray-500">{sizeLabels[input.value as keyof typeof sizeLabels] || sizeLabels[2]}</span>
      </div>
      <input
        type="range"
        min="1"
        max="4"
        step="1"
        className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer hover:bg-green-300 transition-colors"
        value={input.value || 2}
        onChange={(e) => input.onChange(Number(e.target.value))}
        onBlur={input.onBlur}
        onFocus={input.onFocus}
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>Small</span>
        <span>Medium</span>
        <span>Large</span>
        <span>XL</span>
      </div>
    </div>
  );
};

const LogoScaleSlider = ({ input, field }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium">{field.label}</label>
        <span className="text-xs text-gray-500">{(input.value || 1).toFixed(1)}x</span>
      </div>
      <input
        type="range"
        min="0.5"
        max="3"
        step="0.1"
        className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer hover:bg-purple-300 transition-colors"
        value={input.value || 1}
        onChange={(e) => input.onChange(Number(e.target.value))}
        onBlur={input.onBlur}
        onFocus={input.onFocus}
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>0.5x</span>
        <span>1x</span>
        <span>2x</span>
        <span>3x</span>
      </div>
    </div>
  );
};

export const businessCardBlockSchema: Template = {
  name: 'businessCard',
  label: 'Business Card',
  ui: {
    previewSrc: '/blocks/content.png',
    defaultItem: {
      initials: 'EK',
      name: 'Eddie Kranz',
      title: 'Software Engineer',
      companyLogo: '',
      companyUrl: '',
      companyLogoScale: 1,
      phone: '0432 269 313',
      email: 'ed@kranz.au',
      githubUrl: 'https://github.com/edkranz',
      linkedinUrl: 'https://www.linkedin.com/in/kranz',
      youtubeUrl: '',
      blogUrl: '',
      blogColor: '#8b5cf6',
      nameSize: 2,
      nameColor: '',
      titleSize: 2,
      titleColor: '',
      tagline: 'Building digital experiences with precision',
      photo: '/uploads/authors/eddie.jpg',
    },
  },
  fields: [
    { type: 'string', name: 'initials', label: 'Initials' },
    { type: 'string', name: 'name', label: 'Name' },
    { 
      type: 'number', 
      name: 'nameSize', 
      label: 'Name Size',
      ui: {
        component: NameSizeSlider
      }
    },
    { type: 'string', name: 'nameColor', label: 'Name Color (optional)', ui: { component: 'color' } },
    { type: 'string', name: 'title', label: 'Title' },
    { 
      type: 'number', 
      name: 'titleSize', 
      label: 'Title Size',
      ui: {
        component: TitleSizeSlider
      }
    },
    { type: 'string', name: 'titleColor', label: 'Title Color (optional)', ui: { component: 'color' } },
    { type: 'image', name: 'companyLogo', label: 'Company Logo (optional)' },
    { type: 'string', name: 'companyUrl', label: 'Company URL (optional)' },
    { 
      type: 'number', 
      name: 'companyLogoScale', 
      label: 'Company Logo Scale',
      ui: {
        component: LogoScaleSlider
      }
    },
    { type: 'string', name: 'phone', label: 'Phone' },
    { type: 'string', name: 'email', label: 'Email' },
    { type: 'string', name: 'githubUrl', label: 'GitHub URL' },
    { type: 'string', name: 'linkedinUrl', label: 'LinkedIn URL' },
    { type: 'string', name: 'youtubeUrl', label: 'YouTube URL' },
    { type: 'string', name: 'blogUrl', label: 'Blog URL' },
    { type: 'string', name: 'blogColor', label: 'Blog Button Color', ui: { component: 'color' } },
    { type: 'string', name: 'tagline', label: 'Tagline' },
    { type: 'image', name: 'photo', label: 'Photo (optional)' },
  ],
};


