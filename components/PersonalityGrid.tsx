'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import type { Personality } from '@/lib/types'
import { DIVISIONS, getDivisionInfo } from '@/lib/personalities'
import PersonalityCard from './PersonalityCard'

interface PersonalityGridProps {
  personalities: Personality[]
  onSelect: (personality: Personality) => void
}

export default function PersonalityGrid({ personalities, onSelect }: PersonalityGridProps) {
  const [search, setSearch] = useState('')
  const [activeDivision, setActiveDivision] = useState<string | null>(null)

  const divisions = useMemo(() => {
    const divs = new Set(personalities.map((p) => p.division))
    return Array.from(divs).sort()
  }, [personalities])

  const filtered = useMemo(() => {
    let result = personalities
    if (activeDivision) {
      result = result.filter((p) => p.division === activeDivision)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.vibe.toLowerCase().includes(q) ||
          p.division.toLowerCase().includes(q)
      )
    }
    return result
  }, [personalities, activeDivision, search])

  return (
    <div>
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search personalities..."
          className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {/* Division filters */}
      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveDivision(null)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            !activeDivision
              ? 'bg-brand-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          All ({personalities.length})
        </button>
        {divisions.map((div) => {
          const info = getDivisionInfo(div)
          const count = personalities.filter((p) => p.division === div).length
          return (
            <button
              key={div}
              onClick={() => setActiveDivision(activeDivision === div ? null : div)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeDivision === div
                  ? 'text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              style={
                activeDivision === div
                  ? { backgroundColor: info.color }
                  : undefined
              }
            >
              {info.emoji} {info.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((p) => (
          <PersonalityCard key={p.id} personality={p} onClick={() => onSelect(p)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-slate-500">
          No personalities match your search.
        </div>
      )}
    </div>
  )
}
