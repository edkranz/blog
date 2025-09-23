'use client'
import Link from 'next/link'
import { tinaField } from 'tinacms/dist/react'
import { Icon } from '@/components/icon'
import type { GlobalQuery } from '@/tina/__generated__/types'

export default function HomeClient({ global }: { global: GlobalQuery['global'] }) {
  const header = global.header
  const footer = global.footer

  const blogLink = header?.nav?.find((n) => n?.label?.toLowerCase() === 'blog')?.href || '/blog'
  const aboutLink = header?.nav?.find((n) => n?.label?.toLowerCase() === 'about')?.href || '/about'

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="bg-white/90 dark:bg-zinc-900/80 border rounded-2xl px-8 py-10 shadow-md">
        <h1 className="text-3xl font-semibold text-center" data-tina-field={tinaField(header!, 'name')}>
          {header?.name || 'Eddie Kranz'}
        </h1>

        <div className="mt-6 flex items-center justify-center gap-6 text-sm">
          <Link href={blogLink} className="underline underline-offset-4 hover:no-underline">
            Blog
          </Link>
          <span aria-hidden>/</span>
          <Link href={aboutLink} className="underline underline-offset-4 hover:no-underline">
            About
          </Link>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4">
          {footer?.social?.map((link, index) => (
            <Link
              key={`${link!.icon?.name}-${index}`}
              href={link!.url!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link!.icon?.name || 'social link'}
            >
              <Icon data={{ ...(link!.icon as any), size: 'small' }} className="text-foreground/70 hover:text-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}


