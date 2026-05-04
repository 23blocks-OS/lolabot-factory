import type { Personality, Skill, PluginManifest, ManifestSource } from './types'

/**
 * Generate a plugin.manifest.json from selected personality and skills.
 * This manifest is consumed by build-plugin.sh to assemble the final plugin.
 */
export function buildManifest(
  personality: Personality,
  selectedSkills: Skill[],
  agentName: string
): PluginManifest {
  const sources: ManifestSource[] = []

  // Add personality as a local source (will be placed in build dir)
  sources.push({
    type: 'local',
    path: './src',
    mappings: [
      {
        from: `personalities/${personality.id}.md`,
        to: `skills/${agentName}/SKILL.md`,
      },
    ],
  })

  // Add each selected skill source
  for (const skill of selectedSkills) {
    if (skill.source.type === 'git' && skill.source.url) {
      sources.push({
        type: 'git',
        url: skill.source.url,
        mappings: [
          {
            from: '.',
            to: `skills/${skill.id}`,
          },
        ],
      })
    } else if (skill.source.type === 'local' && skill.source.path) {
      sources.push({
        type: 'local',
        path: './src',
        mappings: [
          {
            from: skill.source.path.replace('src/', ''),
            to: `skills/${skill.id}`,
          },
        ],
      })
    }
  }

  return {
    name: agentName,
    version: '1.0.0',
    description: `${personality.name} - ${personality.vibe}`,
    sources,
  }
}

/**
 * Generate the CLAUDE.md personality injection content.
 * This gets appended to the plugin's CLAUDE.md or used as the agent's skill file.
 */
export function buildPersonalitySkill(personality: Personality, agentName: string): string {
  return `# ${agentName} — ${personality.emoji} ${personality.name}

${personality.vibe}

---

${personality.content}
`
}
