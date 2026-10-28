/**
 * Generates the plugin.manifest.json that build-plugin.sh (ai-maestro-plugins)
 * reads. Format, as the builder expects it:
 *
 *   { name, version, output, plugin: {...}, sources: [
 *       { name, type: 'local', path: './src', map: { '<src>': '<dst>' } },
 *       { name, type: 'git', repo: 'https://...', ref: 'main', map: {...} } ] }
 *
 * The builder only accepts https git URLs and relative paths without '..', and
 * source names must match [A-Za-z0-9._-]+. Everything generated here complies;
 * assertManifestSafe() re-checks that so a bad edit to SKILL_SOURCES fails the
 * unit tests instead of a customer build.
 */

export interface ManifestSource {
  name: string
  description?: string
  type: 'local' | 'git'
  path?: string
  repo?: string
  ref?: string
  map: Record<string, string>
}

export interface PluginManifest {
  name: string
  version: string
  description: string
  output: string
  plugin: {
    name: string
    version: string
    description: string
    author: { name: string }
    license: string
  }
  sources: ManifestSource[]
}

type SkillSource = Omit<ManifestSource, 'name' | 'description'>

const PLUGINS_SRC = './src'

// Skill ids (see data/skills-catalog.json) -> where build-plugin.sh finds them.
// Local skills live in ai-maestro-plugins/src (skills/<dir> and scripts/*).
export const SKILL_SOURCES: Record<string, SkillSource> = {
  'agent-messaging': {
    type: 'git',
    repo: 'https://github.com/agentmessaging/claude-plugin.git',
    ref: 'main',
    map: {
      'skills/agent-messaging': 'skills/agent-messaging',
      'scripts/*.sh': 'scripts/',
    },
  },
  'agent-identity': {
    type: 'git',
    repo: 'https://github.com/agentmessaging/agent-identity.git',
    ref: 'main',
    map: {
      'skills/agent-identity': 'skills/agent-identity',
      'scripts/*.sh': 'scripts/',
    },
  },
  'memory-search': {
    type: 'local',
    path: PLUGINS_SRC,
    map: { 'skills/memory-search': 'skills/memory-search', 'scripts/memory-*.sh': 'scripts/' },
  },
  'graph-query': {
    type: 'local',
    path: PLUGINS_SRC,
    map: { 'skills/graph-query': 'skills/graph-query', 'scripts/graph-*.sh': 'scripts/' },
  },
  'docs-search': {
    type: 'local',
    path: PLUGINS_SRC,
    map: { 'skills/docs-search': 'skills/docs-search', 'scripts/docs-*.sh': 'scripts/' },
  },
  planning: {
    type: 'local',
    path: PLUGINS_SRC,
    map: { 'skills/planning': 'skills/planning' },
  },
  // The catalog id is 'agent-management'; the skill directory is
  // ai-maestro-agents-management.
  'agent-management': {
    type: 'local',
    path: PLUGINS_SRC,
    map: {
      'skills/ai-maestro-agents-management': 'skills/ai-maestro-agents-management',
      'scripts/agent-*.sh': 'scripts/',
      'scripts/aimaestro-agent.sh': 'scripts/aimaestro-agent.sh',
      'scripts/list-agents.sh': 'scripts/list-agents.sh',
      'scripts/export-agent.sh': 'scripts/export-agent.sh',
      'scripts/import-agent.sh': 'scripts/import-agent.sh',
    },
  },
}

export function generateManifest(
  personalityId: string,
  skills: string[],
  agentName: string
): PluginManifest {
  const wanted = Array.from(new Set(skills)).filter((id) => Object.hasOwn(SKILL_SOURCES, id))

  // The agent's own skill directory must not overwrite a bundled skill.
  const targets = new Set(wanted.flatMap((id) => Object.values(SKILL_SOURCES[id].map)))
  if ([...targets].some((t) => t === `skills/${agentName}` || t.startsWith(`skills/${agentName}/`))) {
    throw new Error(`agentName "${agentName}" collides with a bundled skill`)
  }

  const sources: ManifestSource[] = [
    {
      name: 'personality',
      description: 'Personality prompt, copied into src/personalities by the build Lambda',
      type: 'local',
      path: PLUGINS_SRC,
      map: { [`personalities/${personalityId}.md`]: `skills/${agentName}/SKILL.md` },
    },
  ]

  for (const id of wanted) {
    sources.push({ name: `skill-${id}`, ...SKILL_SOURCES[id], map: { ...SKILL_SOURCES[id].map } })
  }

  const manifest: PluginManifest = {
    name: agentName,
    version: '1.0.0',
    description: 'Custom agent built by Lolabot Factory',
    output: './plugins/ai-maestro',
    plugin: {
      name: agentName,
      version: '1.0.0',
      description: 'Custom agent built by Lolabot Factory',
      author: { name: 'Lolabot Factory' },
      license: 'MIT',
    },
    sources,
  }
  assertManifestSafe(manifest)
  return manifest
}

const SAFE_REL = (p: string) =>
  p !== '' && !p.startsWith('/') && !p.split('/').includes('..')

/** Mirrors the checks build-plugin.sh makes, so we fail before cloning anything. */
export function assertManifestSafe(m: PluginManifest): void {
  if (!SAFE_REL(m.output.replace(/^\.\//, ''))) throw new Error(`unsafe output: ${m.output}`)
  const names = new Set<string>()
  for (const s of m.sources) {
    if (!/^[A-Za-z0-9._-]+$/.test(s.name) || s.name === '.' || s.name === '..') {
      throw new Error(`invalid source name: ${s.name}`)
    }
    if (names.has(s.name)) throw new Error(`duplicate source name: ${s.name}`)
    names.add(s.name)
    if (s.type === 'local') {
      if (!s.path || !SAFE_REL(s.path.replace(/^\.\//, ''))) throw new Error(`unsafe path: ${s.path}`)
    } else if (s.type === 'git') {
      if (!s.repo?.startsWith('https://')) throw new Error(`git source must be https: ${s.repo}`)
      if (!s.ref || s.ref.startsWith('-')) throw new Error(`invalid ref: ${s.ref}`)
    } else {
      throw new Error(`unknown source type: ${s.type}`)
    }
    for (const [from, to] of Object.entries(s.map)) {
      if (!SAFE_REL(from) || !SAFE_REL(to)) throw new Error(`unsafe map entry: ${from} -> ${to}`)
    }
  }
}
