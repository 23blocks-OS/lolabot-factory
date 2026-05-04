import type { Skill, SkillsCatalog } from './types'
import catalogData from '@/data/skills-catalog.json'

export function getSkillsCatalog(): SkillsCatalog {
  return catalogData as SkillsCatalog
}

export function getSkillsByCategory(skills: Skill[]): Record<string, Skill[]> {
  return skills.reduce(
    (acc, skill) => {
      if (!acc[skill.category]) acc[skill.category] = []
      acc[skill.category].push(skill)
      return acc
    },
    {} as Record<string, Skill[]>
  )
}

export const CATEGORY_LABELS: Record<string, { label: string; description: string }> = {
  essential: {
    label: 'Essential',
    description: 'Core capabilities every agent should have',
  },
  intelligence: {
    label: 'Intelligence',
    description: 'Memory, search, and reasoning skills',
  },
  operations: {
    label: 'Operations',
    description: 'Planning, management, and automation',
  },
}
