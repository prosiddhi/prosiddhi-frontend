'use client'

import { useState } from 'react'
import Image from 'next/image'
import { resolveMediaUrl } from '@/lib/api'

// "Naga Lakshmi" → "NL", "Jhansi" → "JH", blank → "?". Local to the candidate screens.
function candidateInitials(name?: string | null): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? []
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

const SIZES = {
  sm: { box: 'w-11 h-11', text: 'text-sm', px: '44px' },
  card: { box: 'w-12 h-12', text: 'text-base', px: '48px' },
  md: { box: 'w-14 h-14', text: 'text-base', px: '56px' },
  lg: { box: 'w-20 h-20', text: 'text-2xl', px: '80px' },
}

// The seeker's photo, or their initials when there is none or it fails to load.
// A failure is remembered per URL, so a new photo is tried again without remounting.
export function CandidateAvatar({
  photo,
  name,
  size = 'md',
}: {
  photo?: string | null
  name?: string | null
  size?: keyof typeof SIZES
}) {
  const [failedSrc, setFailedSrc] = useState('')
  const src = photo?.trim() ? resolveMediaUrl(photo) : ''
  const s = SIZES[size]
  return (
    <div className={`relative ${s.box} rounded-full bg-[#a9e5ff] ring-2 ring-white shadow-sm overflow-hidden flex items-center justify-center flex-shrink-0`}>
      {src && src !== failedSrc ? (
        <Image src={src} alt="" fill sizes={s.px} unoptimized className="object-cover" onError={() => setFailedSrc(src)} />
      ) : (
        <span className={`${s.text} font-semibold text-[#236987]`}>{candidateInitials(name)}</span>
      )}
    </div>
  )
}
