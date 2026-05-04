'use client'

import { useRouter } from 'next/navigation'
import type { Personality } from '@/lib/types'
import PersonalityGrid from '@/components/PersonalityGrid'
import personalities from '@/data/personalities.json'

export default function BrowsePage() {
  const router = useRouter()

  const handleSelect = (personality: Personality) => {
    router.push(`/configure?id=${personality.id}`)
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Browse AI Agents</h1>
        <p className="text-slate-400">
          {personalities.length} personalities across{' '}
          {new Set((personalities as Personality[]).map((p) => p.division)).size} divisions.
          Pick one to get started.
        </p>
      </div>
      <PersonalityGrid
        personalities={personalities as Personality[]}
        onSelect={handleSelect}
      />
    </div>
  )
}
