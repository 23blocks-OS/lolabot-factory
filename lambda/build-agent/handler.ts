/**
 * Lambda: build-agent
 *
 * Receives a build request (personality + skills + name), clones repos,
 * runs build-plugin.sh, zips output, uploads to S3.
 *
 * Container image: needs git, jq, bash, zip, node 20.
 * Memory: 512MB, Timeout: 60s
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { execFileSync } from 'child_process'
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const s3 = new S3Client({})
const BUILDS_BUCKET = process.env.BUILDS_BUCKET || 'lolabot-builds'
const AGENTS_REPO = 'https://github.com/23blocks-OS/agency-agents.git'
const PLUGINS_REPO = 'https://github.com/23blocks-OS/ai-maestro-plugins.git'

// Values from the request end up in file names and in the generated manifest,
// so they are limited to a safe alphabet. Nothing from the request is ever
// passed through a shell.
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const MAX_SKILLS = 32

// Find <name>.md anywhere under dir without invoking a shell
function findFile(dir: string, fileName: string): string | null {
  for (const entry of readdirSync(dir)) {
    if (entry === '.git') continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      const hit = findFile(full, fileName)
      if (hit) return hit
    } else if (st.isFile() && entry === fileName) {
      return full
    }
  }
  return null
}

interface BuildEvent {
  body: string
}

interface BuildRequest {
  personalityId: string
  skills: string[]
  agentName: string
}

export async function handler(event: BuildEvent) {
  let body: BuildRequest
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { personalityId, agentName, skills } = (body ?? {}) as Partial<BuildRequest>
  if (!personalityId || !agentName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'personalityId and agentName required' }),
    }
  }
  if (
    typeof personalityId !== 'string' ||
    typeof agentName !== 'string' ||
    !SAFE_ID.test(personalityId) ||
    !SAFE_ID.test(agentName) ||
    (skills !== undefined &&
      (!Array.isArray(skills) ||
        skills.length > MAX_SKILLS ||
        skills.some((x) => typeof x !== 'string' || !SAFE_ID.test(x))))
  ) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error:
          'personalityId, agentName and skills may only contain letters, numbers, dashes and underscores (max 64 characters)',
      }),
    }
  }

  const buildId = randomUUID()
  const workDir = `/tmp/build-${buildId}`

  try {
    // 1. Clone plugin builder (shallow)
    execFileSync('git', ['clone', '--depth', '1', '--', PLUGINS_REPO, workDir], { stdio: 'pipe' })

    // 2. Clone agency-agents (shallow)
    const agentsDir = `${workDir}/.build-cache/agency-agents`
    execFileSync('git', ['clone', '--depth', '1', '--', AGENTS_REPO, agentsDir], { stdio: 'pipe' })

    // 3. Find the personality file
    const personalityFile = findFile(agentsDir, `${personalityId}.md`)

    if (!personalityFile) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Personality ${personalityId} not found` }),
      }
    }

    // 4. Copy personality to src/personalities/
    const srcDir = `${workDir}/src/personalities`
    mkdirSync(srcDir, { recursive: true })
    copyFileSync(personalityFile, join(srcDir, `${personalityId}.md`))

    // 5. Generate plugin.manifest.json
    const manifest = generateManifest(personalityId, skills ?? [], agentName)
    writeFileSync(`${workDir}/plugin.manifest.json`, JSON.stringify(manifest, null, 2))

    // 6. Run build-plugin.sh
    execFileSync('bash', ['./build-plugin.sh', '--clean'], {
      cwd: workDir,
      stdio: 'pipe',
      timeout: 45000,
    })

    // 7. Zip output
    const zipPath = `/tmp/${buildId}.zip`
    execFileSync('zip', ['-r', zipPath, 'ai-maestro/'], { cwd: `${workDir}/plugins`, stdio: 'pipe' })

    // 8. Upload to S3
    const zipContent = readFileSync(zipPath)
    await s3.send(
      new PutObjectCommand({
        Bucket: BUILDS_BUCKET,
        Key: `builds/${buildId}.zip`,
        Body: zipContent,
        ContentType: 'application/zip',
      })
    )

    // 9. Cleanup
    rmSync(workDir, { recursive: true, force: true })
    rmSync(zipPath, { force: true })

    return {
      statusCode: 200,
      body: JSON.stringify({
        buildId,
        status: 'complete',
        installUrl: `https://lolabots.com/api/install/${buildId}`,
        downloadUrl: `https://${BUILDS_BUCKET}.s3.amazonaws.com/builds/${buildId}.zip`,
      }),
    }
  } catch (err) {
    // Cleanup on error
    try {
      rmSync(workDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Build failed',
        details: err instanceof Error ? err.message : String(err),
      }),
    }
  }
}

function generateManifest(
  personalityId: string,
  skills: string[],
  agentName: string
) {
  const sources: Array<{
    type: string
    url?: string
    path?: string
    mappings: Array<{ from: string; to: string }>
  }> = []

  // Personality source
  sources.push({
    type: 'local',
    path: './src',
    mappings: [
      {
        from: `personalities/${personalityId}.md`,
        to: `skills/${agentName}/SKILL.md`,
      },
    ],
  })

  // Skill sources (map skill IDs to their git/local sources)
  const SKILL_SOURCES: Record<
    string,
    { type: string; url?: string; path?: string; targetDir: string }
  > = {
    'agent-messaging': {
      type: 'git',
      url: 'https://github.com/agentmessaging/claude-plugin.git',
      targetDir: 'skills/agent-messaging',
    },
    'agent-identity': {
      type: 'git',
      url: 'https://github.com/agentmessaging/agent-identity.git',
      targetDir: 'skills/agent-identity',
    },
    'memory-search': {
      type: 'local',
      path: './src',
      targetDir: 'skills/memory-search',
    },
    'graph-query': {
      type: 'local',
      path: './src',
      targetDir: 'skills/graph-query',
    },
    'docs-search': {
      type: 'local',
      path: './src',
      targetDir: 'skills/docs-search',
    },
    planning: {
      type: 'local',
      path: './src',
      targetDir: 'skills/planning',
    },
    'agent-management': {
      type: 'local',
      path: './src',
      targetDir: 'skills/agent-management',
    },
  }

  for (const skillId of skills) {
    const source = SKILL_SOURCES[skillId]
    if (!source) continue

    if (source.type === 'git') {
      sources.push({
        type: 'git',
        url: source.url,
        mappings: [{ from: '.', to: source.targetDir }],
      })
    } else {
      sources.push({
        type: 'local',
        path: source.path,
        mappings: [{ from: `skills/${skillId}`, to: source.targetDir }],
      })
    }
  }

  return {
    name: agentName,
    version: '1.0.0',
    description: `Custom agent built by Lolabot Factory`,
    sources,
  }
}
