'use client'

import React from 'react'
import { BookOpen, ExternalLink } from 'lucide-react'
import type { BotWikiArticle } from '../types/message.types'
import { sanitizeUrl } from './message-rich-text'

export interface BotWikiCardProps {
  article: BotWikiArticle
}

export function BotWikiCard({ article }: BotWikiCardProps) {
  const safeHref = article.url ? sanitizeUrl(article.url) : null

  return (
    <div className='mb-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 bg-indigo-50/75 dark:bg-indigo-950/40 p-2.5 shadow-2xs animate-in fade-in duration-200 min-w-0'>
      <div className='flex items-start gap-2 min-w-0'>
        <div className='mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'>
          <BookOpen className='size-3.5' aria-hidden='true' />
        </div>

        <div className='min-w-0 flex-1'>
          <div className='flex items-center justify-between gap-2 min-w-0'>
            <span className='text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 truncate'>
              Solución sugerida • Wiki SDI
            </span>
            {safeHref && (
              <a
                href={safeHref}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 hover:underline shrink-0'
              >
                <span>Abrir</span>
                <ExternalLink className='size-2.5' aria-hidden='true' />
              </a>
            )}
          </div>

          <p className='mt-0.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100 leading-snug break-words'>
            {article.title}
          </p>

          {article.excerpt && (
            <p className='mt-0.5 text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed break-words'>
              {article.excerpt}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
