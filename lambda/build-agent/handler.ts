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
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const s3 = new S3Client({})
const BUILDS_BUCKET = process.env.BUILDS_BUCKET || 'lolabot-builds'
const AGENTS_REPO = 'https://github.com/23blocks-OS/agency-agents.git'
const PLUGINS_REPO = 'https://github.com/23blocks-OS/ai-maestro-plugins.git'

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

  const { personalityId, skills, agentName } = body
  if (!personalityId || !agentName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'personalityId and agentName required' }),
    }
  }

  const buildId = randomUUID()
  const workDir = `/tmp/build-${buildId}`

  try {
    // 1. Clone plugin builder (shallow)
    execSync(`git clone --depth 1 ${PLUGINS_REPO} ${workDir}`, { stdio: 'pipe' })

    // 2. Clone agency-agents (shallow)
    const agentsDir = `${workDir}/.build-cache/agency-agents`
    execSync(`git clone --depth 1 ${AGENTS_REPO} ${agentsDir}`, { stdio: 'pipe' })

    // 3. Find the personality file
    const personalityFile = execSync(
      `find ${agentsDir} -name "${personalityId}.md" -type f | head -1`,
      { encoding: 'utf-8' }
    ).trim()

    if (!personalityFile) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Personality ${personalityId} not found` }),
      }
    }

    // 4. Copy personality to src/personalities/
    const srcDir = `${workDir}/src/personalities`
    mkdirSync(srcDir, { recursive: true })
    execSync(`cp "${personalityFile}" "${srcDir}/${personalityId}.md"`)

    // 5. Generate plugin.manifest.json
    const manifest = generateManifest(personalityId, skills, agentName)
    writeFileSync(`${workDir}/plugin.manifest.json`, JSON.stringify(manifest, null, 2))

    // 6. Run build-plugin.sh
    execSync(`cd ${workDir} && chmod +x build-plugin.sh && ./build-plugin.sh --clean`, {
      stdio: 'pipe',
      timeout: 45000,
    })

    // 7. Zip output
    const zipPath = `/tmp/${buildId}.zip`
    execSync(`cd ${workDir}/plugins && zip -r ${zipPath} ai-maestro/`, { stdio: 'pipe' })

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
    execSync(`rm -rf ${workDir} ${zipPath}`, { stdio: 'pipe' })

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
      execSync(`rm -rf ${workDir}`, { stdio: 'pipe' })
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
