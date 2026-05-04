'use client'

import type { Personality } from '@/lib/types'
import { getDivisionInfo } from '@/lib/personalities'

interface PersonalityCardProps {
  personality: Personality
  onClick?: () => void
}

export default function PersonalityCard({ personality, onClick }: PersonalityCardProps) {
  const division = getDivisionInfo(personality.division)

  return (
    <div
      onClick={onClick}
      className="card-hover group cursor-pointer rounded-xl border border-slate-800 bg-slate-900/50 p-5"
    >
      <div className="mb-3 flex items-start justify-between">
        <span className="text-3xl">{personality.emoji}</span>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `${division.color}20`,
            color: division.color,
          }}
        >
          {division.label}
        </span>
      </div>
      <h3 className="mb-1 font-semibold text-white group-hover:text-brand-400 transition-colors">
        {personality.name}
      </h3>
      <p className="text-sm text-slate-400 line-clamp-2">{personality.vibe}</p>
      {personality.tier === 'pro' && (
        <span className="mt-3 inline-block rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
          PRO
        </span>
      )}
    </div>
  )
}
