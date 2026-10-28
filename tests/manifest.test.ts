import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateManifest, SKILL_SOURCES, assertManifestSafe } from '../lambda/build-agent/manifest'

describe('generateManifest', () => {
  it('uses the current build-plugin.sh format', () => {
    const m = generateManifest('engineering-backend', ['agent-messaging', 'planning'], 'my-agent')
    expect(m.output).toBe('./plugins/ai-maestro')
    expect(m.plugin.name).toBe('my-agent')
    expect(m.sources.map((s) => s.name)).toEqual(['personality', 'skill-agent-messaging', 'skill-planning'])
    for (const s of m.sources) {
      expect(s).not.toHaveProperty('mappings')
      expect(s).not.toHaveProperty('url')
      expect(typeof s.map).toBe('object')
    }
    expect(m.sources[0]).toMatchObject({
      type: 'local',
      path: './src',
      map: { 'personalities/engineering-backend.md': 'skills/my-agent/SKILL.md' },
    })
    expect(m.sources[1]).toMatchObject({
      type: 'git',
      repo: 'https://github.com/agentmessaging/claude-plugin.git',
      ref: 'main',
    })
  })

  it('skips unknown and duplicate skills', () => {
    const m = generateManifest('p', ['planning', 'planning', 'nope', '__proto__', 'constructor'], 'a')
    expect(m.sources.map((s) => s.name)).toEqual(['personality', 'skill-planning'])
  })

  it('rejects an agent name that would overwrite a bundled skill', () => {
    expect(() => generateManifest('p', ['planning'], 'planning')).toThrow(/collides/)
    expect(() => generateManifest('p', ['agent-management'], 'agent-x')).not.toThrow()
  })

  it('every catalog skill resolves, and every bundled source passes the builder rules', () => {
    const catalog = JSON.parse(readFileSync('data/skills-catalog.json', 'utf8')).skills as { id: string }[]
    for (const { id } of catalog) expect(SKILL_SOURCES).toHaveProperty(id)
    expect(() => assertManifestSafe(generateManifest('p', Object.keys(SKILL_SOURCES), 'a'))).not.toThrow()
  })

  it('assertManifestSafe rejects what build-plugin.sh rejects', () => {
    const base = generateManifest('p', ['agent-messaging'], 'a')
    const mut = (f: (m: ReturnType<typeof generateManifest>) => void) => {
      const m = JSON.parse(JSON.stringify(base))
      f(m)
      return m
    }
    expect(() => assertManifestSafe(mut((m) => (m.sources[1].repo = 'http://x/y.git')))).toThrow()
    expect(() => assertManifestSafe(mut((m) => (m.sources[1].repo = 'git@github.com:x/y.git')))).toThrow()
    expect(() => assertManifestSafe(mut((m) => (m.sources[0].path = '../etc')))).toThrow()
    expect(() => assertManifestSafe(mut((m) => (m.sources[0].map = { 'a/../b': 'c' })))).toThrow()
    expect(() => assertManifestSafe(mut((m) => (m.sources[0].map = { a: '/abs' })))).toThrow()
    expect(() => assertManifestSafe(mut((m) => (m.sources[1].name = 'bad name')))).toThrow()
    expect(() => assertManifestSafe(mut((m) => (m.sources[1].ref = '--upload-pack=x')))).toThrow()
  })
})

// End to end against the real builder, if a checkout of ai-maestro-plugins is
// given: LOLABOT_PLUGINS_DIR=/path/to/ai-maestro-plugins (local sources only,
// so no network is needed).
const pluginsDir = process.env.LOLABOT_PLUGINS_DIR
describe.skipIf(!pluginsDir)('manifest against the real build-plugin.sh', () => {
  it('builds a plugin with the personality and local skills', () => {
    const work = mkdtempSync(join(tmpdir(), 'lolabot-build-'))
    cpSync(pluginsDir!, work, { recursive: true, filter: (p) => !p.includes('/.git') && !p.includes('/plugins/ai-maestro') })
    mkdirSync(join(work, 'src/personalities'), { recursive: true })
    writeFileSync(join(work, 'src/personalities/p1.md'), '# persona\n')
    const m = generateManifest('p1', ['planning', 'memory-search', 'graph-query', 'docs-search', 'agent-management'], 'my-agent')
    writeFileSync(join(work, 'plugin.manifest.json'), JSON.stringify(m, null, 2))
    execFileSync('bash', ['./build-plugin.sh', '--clean'], { cwd: work, stdio: 'pipe' })
    const out = join(work, 'plugins/ai-maestro')
    expect(readFileSync(join(out, 'skills/my-agent/SKILL.md'), 'utf8')).toBe('# persona\n')
    for (const d of ['planning', 'memory-search', 'graph-query', 'docs-search', 'ai-maestro-agents-management']) {
      expect(existsSync(join(out, 'skills', d, 'SKILL.md'))).toBe(true)
    }
    expect(existsSync(join(out, 'scripts/memory-search.sh'))).toBe(true)
    expect(existsSync(join(out, 'scripts/aimaestro-agent.sh'))).toBe(true)
    expect(JSON.parse(readFileSync(join(out, '.claude-plugin/plugin.json'), 'utf8')).name).toBe('my-agent')
  })
})
