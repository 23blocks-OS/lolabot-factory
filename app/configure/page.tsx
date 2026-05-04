'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { Personality, Skill, BuildResult } from '@/lib/types'
import AgentConfigurator from '@/components/AgentConfigurator'
import BuildProgress from '@/components/BuildProgress'
import InstallInstructions from '@/components/InstallInstructions'
import personalities from '@/data/personalities.json'
import skillsCatalog from '@/data/skills-catalog.json'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

function ConfigureContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const personalityId = searchParams.get('id')

  const personality = useMemo(
    () => (personalities as Personality[]).find((p) => p.id === personalityId) || null,
    [personalityId]
  )

  const [buildResult, setBuildResult] = useState<BuildResult | null>(null)

  if (!personality) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-slate-400">
          No personality selected.{' '}
          <a href="/browse" className="text-brand-400 hover:underline">
            Browse agents
          </a>
        </p>
      </div>
    )
  }

  const handleBuild = async (config: {
    personalityId: string
    skills: string[]
    agentName: string
  }) => {
    setBuildResult({
      buildId: '',
      status: 'building',
      personality: {
        name: personality.name,
        emoji: personality.emoji,
        division: personality.division,
      },
      skills: config.skills,
      agentName: config.agentName,
    })

    try {
      const res = await fetch(`${API_BASE}/api/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()

      if (!res.ok) {
        setBuildResult((prev) => prev && { ...prev, status: 'error', error: data.error })
        return
      }

      setBuildResult((prev) =>
        prev && {
          ...prev,
          buildId: data.buildId,
          status: 'complete',
          installUrl: data.installUrl,
          downloadUrl: data.downloadUrl,
        }
      )
    } catch {
      setBuildResult((prev) =>
        prev && { ...prev, status: 'error', error: 'Network error. Please try again.' }
      )
    }
  }

  // Show build result or install instructions
  if (buildResult) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <BuildProgress result={buildResult} />
        {buildResult.status === 'complete' && <InstallInstructions result={buildResult} />}
        {buildResult.status === 'error' && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setBuildResult(null)}
              className="text-sm text-brand-400 hover:underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <button
        onClick={() => router.push('/browse')}
        className="mb-6 flex items-center gap-1 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to browse
      </button>
      <AgentConfigurator
        personality={personality}
        skills={skillsCatalog.skills as Skill[]}
        onBuild={handleBuild}
      />
    </div>
  )
}

export default function ConfigurePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-6 py-10 text-slate-400">Loading...</div>
      }
    >
      <ConfigureContent />
    </Suspense>
  )
}
