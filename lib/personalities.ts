import type { Personality } from './types'

/**
 * Parse a single personality markdown file into a Personality object.
 * Expected format: YAML frontmatter (---) followed by markdown content.
 */
export function parsePersonality(
  filename: string,
  content: string,
  division: string
): Personality | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!frontmatterMatch) return null

  const frontmatter = frontmatterMatch[1]
  const body = frontmatterMatch[2].trim()

  const get = (key: string): string => {
    const match = frontmatter.match(new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, 'm'))
    return match ? match[1].trim() : ''
  }

  const id = filename.replace('.md', '')

  return {
    id,
    division,
    name: get('name') || id,
    description: get('description') || '',
    emoji: get('emoji') || '🤖',
    color: get('color') || 'blue',
    vibe: get('vibe') || '',
    content: body,
    tier: 'free',
  }
}

/**
 * Extract division name from directory path.
 * e.g., /path/to/agency-agents/engineering/ → "engineering"
 */
export function extractDivision(dirPath: string): string {
  return dirPath.split('/').filter(Boolean).pop() || 'unknown'
}

/**
 * Division display metadata
 */
export const DIVISIONS: Record<string, { label: string; emoji: string; color: string }> = {
  academic: { label: 'Academic', emoji: '🎓', color: '#a78bfa' },
  design: { label: 'Design', emoji: '🎨', color: '#f472b6' },
  engineering: { label: 'Engineering', emoji: '⚙️', color: '#60a5fa' },
  finance: { label: 'Finance', emoji: '💰', color: '#34d399' },
  'game-development': { label: 'Game Dev', emoji: '🎮', color: '#fb923c' },
  marketing: { label: 'Marketing', emoji: '📣', color: '#f87171' },
  'paid-media': { label: 'Paid Media', emoji: '📺', color: '#e879f9' },
  product: { label: 'Product', emoji: '📦', color: '#38bdf8' },
  'project-management': { label: 'Project Mgmt', emoji: '📋', color: '#4ade80' },
  sales: { label: 'Sales', emoji: '🤝', color: '#fbbf24' },
  'spatial-computing': { label: 'Spatial', emoji: '🥽', color: '#818cf8' },
  specialized: { label: 'Specialized', emoji: '🔧', color: '#94a3b8' },
  strategy: { label: 'Strategy', emoji: '♟️', color: '#c084fc' },
  support: { label: 'Support', emoji: '🎧', color: '#2dd4bf' },
  testing: { label: 'Testing', emoji: '🧪', color: '#a3e635' },
}

/**
 * Get division display info with fallback
 */
export function getDivisionInfo(division: string) {
  return DIVISIONS[division] || { label: division, emoji: '📁', color: '#94a3b8' }
}
