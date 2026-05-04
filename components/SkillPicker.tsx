'use client'

import type { Skill } from '@/lib/types'
import { getSkillsByCategory, CATEGORY_LABELS } from '@/lib/skills'
import { Check, Star } from 'lucide-react'

interface SkillPickerProps {
  skills: Skill[]
  selected: Set<string>
  onToggle: (skillId: string) => void
}

export default function SkillPicker({ skills, selected, onToggle }: SkillPickerProps) {
  const byCategory = getSkillsByCategory(skills)

  return (
    <div className="space-y-6">
      {Object.entries(byCategory).map(([category, categorySkills]) => {
        const label = CATEGORY_LABELS[category] || { label: category, description: '' }
        return (
          <div key={category}>
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-slate-300">
              {label.label}
            </h3>
            <p className="mb-3 text-xs text-slate-500">{label.description}</p>
            <div className="space-y-2">
              {categorySkills.map((skill) => {
                const isSelected = selected.has(skill.id)
                return (
                  <div
                    key={skill.id}
                    onClick={() => onToggle(skill.id)}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      isSelected
                        ? 'border-brand-500/50 bg-brand-600/10'
                        : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? 'border-brand-500 bg-brand-600 text-white'
                          : 'border-slate-600'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{skill.name}</span>
                        {skill.recommended && (
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        )}
                        {skill.tier === 'pro' && (
                          <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                            PRO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{skill.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
