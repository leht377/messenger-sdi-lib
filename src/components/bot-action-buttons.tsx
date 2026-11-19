'use client'

import React from 'react'
import { cn } from '../ui'
import type { MessageActionButton } from '../types/message.types'

export interface BotActionButtonsProps {
  actions: MessageActionButton[]
  disabled?: boolean
  onActionClick?: (action: MessageActionButton) => void
}

export function BotActionButtons({
  actions,
  disabled = false,
  onActionClick
}: BotActionButtonsProps) {
  if (!actions || actions.length === 0) return null

  return (
    <div className='mt-2.5 pt-2 border-t border-violet-200/60 dark:border-violet-800/40 flex flex-wrap gap-1.5 animate-in fade-in duration-200'>
      {actions.map((btn) => (
        <button
          key={btn.id}
          type='button'
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              onActionClick?.(btn)
            }
          }}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition-all',
            disabled
              ? 'border-neutral-200 dark:border-neutral-700/50 bg-neutral-100/80 dark:bg-neutral-800/50 text-neutral-400 dark:text-neutral-500 cursor-not-allowed opacity-60'
              : 'border-violet-200 dark:border-violet-700/60 bg-white/95 dark:bg-neutral-800/90 hover:bg-violet-600 hover:text-white dark:hover:bg-violet-600 dark:hover:text-white hover:border-violet-600 dark:hover:border-violet-600 text-violet-700 dark:text-violet-300 active:scale-95 cursor-pointer'
          )}
        >
          <span>{btn.label}</span>
        </button>
      ))}
    </div>
  )
}
