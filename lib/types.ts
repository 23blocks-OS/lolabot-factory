export interface Personality {
  id: string
  division: string
  name: string
  description: string
  emoji: string
  color: string
  vibe: string
  content: string
  tier: 'free' | 'pro'
}

export interface Skill {
  id: string
  name: string
  description: string
  category: 'essential' | 'intelligence' | 'operations'
  tier: 'free' | 'pro'
  source: {
    type: 'git' | 'local'
    url?: string
    path?: string
  }
  recommended?: boolean
}

export interface SkillsCatalog {
  skills: Skill[]
}

export interface BuildRequest {
  personalityId: string
  skills: string[]
  agentName: string
}

export interface BuildResult {
  buildId: string
  status: 'pending' | 'building' | 'complete' | 'error'
  installUrl?: string
  downloadUrl?: string
  error?: string
  personality?: {
    name: string
    emoji: string
    division: string
  }
  skills?: string[]
  agentName?: string
}

export interface PluginManifest {
  name: string
  version: string
  description: string
  sources: ManifestSource[]
}

export interface ManifestSource {
  type: 'git' | 'local'
  url?: string
  path?: string
  mappings: {
    from: string
    to: string
  }[]
}
