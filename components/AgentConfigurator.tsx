'use client'

import { useState, useCallback } from 'react'
import { Rocket } from 'lucide-react'
import type { Personality, Skill } from '@/lib/types'
import { getDivisionInfo } from '@/lib/personalities'
import SkillPicker from './SkillPicker'

interface AgentConfiguratorProps {
  personality: Personality
  skills: Skill[]
  onBuild: (config: { personalityId: string; skills: string[]; agentName: string }) => void
  building?: boolean
}

export default function AgentConfigurator({
  personality,
  skills,
  onBuild,
  building,
}: AgentConfiguratorProps) {
  const division = getDivisionInfo(personality.division)
  const defaultName = personality.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const [agentName, setAgentName] = useState(defaultName)
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    skills.filter((s) => s.recommended).forEach((s) => initial.add(s.id))
    return initial
  })

  const toggleSkill = useCallback((id: string) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleBuild = () => {
    if (!agentName.trim()) return
    onBuild({
      personalityId: personality.id,
      skills: Array.from(selectedSkills),
      agentName: agentName.trim(),
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      {/* Left: Personality preview */}
      <div className="lg:col-span-2">
        <div className="sticky top-24 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 text-center">
            <span className="text-5xl">{personality.emoji}</span>
          </div>
          <h2 className="mb-1 text-center text-xl font-bold">{personality.name}</h2>
          <p
            className="mb-4 text-center text-sm font-medium"
            style={{ color: division.color }}
          >
            {division.emoji} {division.label}
          </p>
          <p className="mb-6 text-sm text-slate-400">{personality.vibe}</p>

          {/* Agent name input */}
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-slate-400">Agent Name</label>
            <input
              type="text"
              value={agentName}
              onChange={(e) =>
                setAgentName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              }
              placeholder="my-agent-name"
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-slate-600">Lowercase, hyphens only</p>
          </div>

          {/* Build button */}
          <button
            onClick={handleBuild}
            disabled={building || !agentName.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {building ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Building...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Build My Agent
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right: Skill picker */}
      <div className="lg:col-span-3">
        <h2 className="mb-4 text-lg font-semibold">Choose Skills</h2>
        <SkillPicker skills={skills} selected={selectedSkills} onToggle={toggleSkill} />
      </div>
    </div>
  )
}
