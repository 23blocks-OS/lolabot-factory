/**
 * Lambda: build-agent
 *
 * Receives a build request (personality + skills + name), clones repos,
 * runs build-plugin.sh, zips output, uploads to S3.
 *
 * Container image: needs git, jq, bash, zip, node 22.
 * Memory: 512MB, Timeout: 60s
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createHash, randomUUID } from 'crypto'
import { execFileSync } from 'child_process'
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { generateManifest } from './manifest'

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

  // A skill id that duplicates the agent name would overwrite a bundled skill
  try {
    generateManifest(personalityId, skills ?? [], agentName)
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: err instanceof Error ? err.message : 'Invalid request' }),
    }
  }

  const buildId = randomUUID()
  const workDir = `/tmp/build-${buildId}`
  const agentsDir = `/tmp/agents-${buildId}`
  const zipPath = `/tmp/${buildId}.zip`
  // Lambda has no writable HOME; git and npm want one
  const env = { ...process.env, HOME: '/tmp', GIT_TERMINAL_PROMPT: '0' }

  const cleanup = () => {
    for (const p of [workDir, agentsDir, zipPath]) {
      try {
        rmSync(p, { recursive: true, force: true })
      } catch {
        // ignore cleanup errors
      }
    }
  }

  try {
    // 1. Clone plugin builder (shallow)
    execFileSync('git', ['clone', '--depth', '1', '--', PLUGINS_REPO, workDir], { stdio: 'pipe', env, timeout: 20000 })

    // 2. Clone agency-agents (shallow), outside workDir: build-plugin.sh --clean
    //    deletes workDir/.build-cache
    execFileSync('git', ['clone', '--depth', '1', '--', AGENTS_REPO, agentsDir], { stdio: 'pipe', env, timeout: 20000 })

    // 3. Find the personality file
    const personalityFile = findFile(agentsDir, `${personalityId}.md`)

    if (!personalityFile) {
      cleanup()
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
      env,
      timeout: 45000,
    })

    // 7. Zip output
    execFileSync('zip', ['-r', zipPath, 'ai-maestro/'], { cwd: `${workDir}/plugins`, stdio: 'pipe' })

    // 8. Upload to S3
    const zipContent = readFileSync(zipPath)
    const sha256 = createHash('sha256').update(zipContent).digest('hex')
    await s3.send(
      new PutObjectCommand({
        Bucket: BUILDS_BUCKET,
        Key: `builds/${buildId}.zip`,
        Body: zipContent,
        ContentType: 'application/zip',
        ChecksumSHA256: createHash('sha256').update(zipContent).digest('base64'),
      })
    )
    // Build metadata read by the install-script Lambda. Written after the zip,
    // so a build is only installable once its checksum exists.
    await s3.send(
      new PutObjectCommand({
        Bucket: BUILDS_BUCKET,
        Key: `builds/${buildId}.json`,
        Body: JSON.stringify({
          buildId,
          sha256,
          size: zipContent.length,
          createdAt: new Date().toISOString(),
        }),
        ContentType: 'application/json',
      })
    )

    // 9. Cleanup
    cleanup()

    return {
      statusCode: 200,
      body: JSON.stringify({
        buildId,
        status: 'complete',
        installUrl: `https://lolabots.com/api/install/${buildId}`,
        sha256,
      }),
    }
  } catch (err) {
    cleanup()

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Build failed',
        details: err instanceof Error ? err.message : String(err),
      }),
    }
  }
}
