'use client'

import React, { useMemo, useState } from 'react'
import { cn } from './cn'
import { Users, Bot } from 'lucide-react'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  name?: string | null
  size?: AvatarSize
  isGroup?: boolean
  isBot?: boolean
  status?: 'online' | 'offline' | 'busy'
}

function getInitials(name?: string | null): string {
  if (!name) return '?'
  const clean = name.trim().split(/\s+/)
  if (clean.length === 1) return clean[0].substring(0, 2).toUpperCase()
  return (clean[0][0] + clean[clean.length - 1][0]).toUpperCase()
}

const avatarColors = [
  '#2563EB', '#0EA5E9', '#38BDF8', '#3B82F6', '#1D4ED8', '#60A5FA',
  '#10B981', '#22C55E', '#4ADE80', '#16A34A', '#86EFAC', '#65A30D',
  '#8B5CF6', '#A855F7', '#C084FC', '#9333EA', '#818CF8', '#6366F1',
  '#F43F5E', '#E11D48', '#FB7185', '#DC2626', '#F87171', '#BE123C',
  '#F97316', '#FB923C', '#EA580C', '#F59E0B', '#D97706', '#FBBF24',
  '#E879F9', '#D946EF', '#EC4899', '#F472B6', '#DB2777',
  '#3F3F46', '#6B7280', '#9CA3AF', '#111827'
]

function getColorFromName(name?: string | null): string {
  if (!name) return '#62748e'
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) {
    hash = (hash << 5) - hash + (name || '').charCodeAt(i)
    hash |= 0
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

export function Avatar({
  src,
  name = '',
  size = 'md',
  isGroup = false,
  isBot = false,
  status,
  className,
  ...props
}: AvatarProps) {
  const [imageError, setImageError] = useState(false)

  const sizeClasses: Record<AvatarSize, { box: string; text: string; icon: string; statusDot: string }> = {
    xs: { box: 'size-6', text: 'text-[10px]', icon: 'size-3.5', statusDot: 'size-1.5' },
    sm: { box: 'size-8', text: 'text-xs', icon: 'size-4', statusDot: 'size-2' },
    md: { box: 'size-10', text: 'text-sm', icon: 'size-5', statusDot: 'size-2.5' },
    lg: { box: 'size-12', text: 'text-base', icon: 'size-6', statusDot: 'size-3' },
    xl: { box: 'size-16', text: 'text-xl', icon: 'size-8', statusDot: 'size-3.5' }
  }

  const { box, text, icon, statusDot } = sizeClasses[size]
  const initials = getInitials(name)
  const colorHex = useMemo(() => getColorFromName(name), [name])

  const hasValidImage = Boolean(src) && !imageError

  return (
    <div className={cn('relative inline-block shrink-0', box, className)} {...props}>
      <div
        className={cn(
          'flex size-full items-center justify-center overflow-hidden rounded-full font-semibold shadow-xs select-none',
          isBot && !hasValidImage
            ? 'bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-600 text-white shadow-violet-500/25 ring-1 ring-violet-400/30'
            : !hasValidImage && (isGroup ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300' : 'font-semibold text-xs')
        )}
        style={!hasValidImage && !isGroup && !isBot ? {
          backgroundColor: `${colorHex}33`,
          color: `${colorHex}FF`,
          fontWeight: 'bold'
        } : undefined}
      >
        {hasValidImage ? (
          <img
            src={src!}
            alt={name || 'Avatar'}
            onError={() => setImageError(true)}
            className='size-full object-cover'
            loading='lazy'
          />
        ) : isBot ? (
          <Bot className={icon} />
        ) : isGroup ? (
          <Users className={icon} />
        ) : (
          <span className={cn('font-bold tracking-tight', text)}>{initials}</span>
        )}
      </div>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-neutral-900',
            statusDot,
            status === 'online' && 'bg-emerald-500',
            status === 'offline' && 'bg-neutral-400',
            status === 'busy' && 'bg-amber-500'
          )}
        />
      )}
    </div>
  )
}
