/**
 * Lambda: install-script
 *
 * Serves a tailored install script for a given build ID.
 * GET /install/<build-id> -> bash script that downloads, verifies and installs
 * the agent plugin.
 *
 * The builds bucket is private. This function reads builds/<id>.json (written
 * by the build Lambda: sha256 of the zip) and embeds a short-lived presigned
 * URL for builds/<id>.zip plus that sha256 in the script. The script refuses
 * to unzip anything whose sha256 does not match.
 */

const BUILDS_BUCKET = process.env.BUILDS_BUCKET || 'lolabot-builds'
const URL_TTL_SECONDS = 900

interface Event {
  pathParameters?: {
    id?: string
  }
}

export interface Deps {
  /** Contents of builds/<id>.json, or null if the build does not exist */
  getMetadata: (buildId: string) => Promise<string | null>
  /** Presigned GET URL for builds/<id>.zip */
  presignZip: (buildId: string, expiresIn: number) => Promise<string>
}

const textResponse = (statusCode: number, body: string) => ({
  statusCode,
  headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
  body,
})

const defaultDeps: Deps = {
  async getMetadata(buildId) {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
    try {
      const res = await new S3Client({}).send(
        new GetObjectCommand({ Bucket: BUILDS_BUCKET, Key: `builds/${buildId}.json` })
      )
      return (await res.Body?.transformToString()) ?? null
    } catch (err) {
      if ((err as { name?: string }).name === 'NoSuchKey') return null
      throw err
    }
  },
  async presignZip(buildId, expiresIn) {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
    return getSignedUrl(
      new S3Client({}),
      new GetObjectCommand({ Bucket: BUILDS_BUCKET, Key: `builds/${buildId}.zip` }),
      { expiresIn }
    )
  },
}

export async function handler(event: Event) {
  return handleInstall(event, defaultDeps)
}

export async function handleInstall(event: Event, deps: Deps) {
  const buildId = event.pathParameters?.id

  if (!buildId) {
    return textResponse(400, 'echo "Error: No build ID provided" >&2; exit 1')
  }

  // Build IDs are UUIDs. Anything else is refused: the ID is written into a
  // script that people pipe to bash.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(buildId)) {
    return textResponse(400, 'echo "Error: invalid build ID" >&2; exit 1')
  }

  let sha256: string
  try {
    const raw = await deps.getMetadata(buildId)
    if (raw === null) {
      return textResponse(404, 'echo "Error: build not found (builds expire after 30 days)" >&2; exit 1')
    }
    sha256 = String((JSON.parse(raw) as { sha256?: unknown }).sha256 ?? '')
  } catch {
    return textResponse(500, 'echo "Error: could not read build information" >&2; exit 1')
  }
  // The checksum is written into a bash script: hex only
  if (!/^[0-9a-f]{64}$/.test(sha256)) {
    return textResponse(500, 'echo "Error: build has no valid checksum" >&2; exit 1')
  }

  const downloadUrl = await deps.presignZip(buildId, URL_TTL_SECONDS)
  // A presigned URL is [A-Za-z0-9%/_.~:?=&+-]; refuse anything that could
  // break out of the double quotes in the script
  if (!/^https:\/\/[A-Za-z0-9%/_.~:?=&+*-]+$/.test(downloadUrl)) {
    return textResponse(500, 'echo "Error: could not create download link" >&2; exit 1')
  }

  const script = `#!/bin/bash
set -euo pipefail

BUILD_ID="${buildId}"
DOWNLOAD_URL="${downloadUrl}"
EXPECTED_SHA256="${sha256}"
INSTALL_DIR="\${HOME}/.claude/plugins/ai-maestro"

echo ""
echo "  🤖 Lolabot Factory — Installing your AI agent..."
echo ""

# Download to a private temp file
ZIP_FILE="\$(mktemp "\${TMPDIR:-/tmp}/lolabot-agent.XXXXXX")"
trap 'rm -f "\$ZIP_FILE"' EXIT
echo "  Downloading agent package..."
if ! curl -fsSL --proto '=https' --tlsv1.2 "\$DOWNLOAD_URL" -o "\$ZIP_FILE"; then
  echo "  ❌ Download failed. Build may have expired (30-day retention)."
  exit 1
fi

# Verify the download before touching anything on disk
if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL_SHA256="\$(sha256sum "\$ZIP_FILE" | cut -d' ' -f1)"
elif command -v shasum >/dev/null 2>&1; then
  ACTUAL_SHA256="\$(shasum -a 256 "\$ZIP_FILE" | cut -d' ' -f1)"
else
  echo "  ❌ Neither sha256sum nor shasum found; cannot verify the download."
  exit 1
fi
if [ "\$ACTUAL_SHA256" != "\$EXPECTED_SHA256" ]; then
  echo "  ❌ Checksum mismatch. Expected \$EXPECTED_SHA256, got \$ACTUAL_SHA256."
  echo "     Nothing was installed."
  exit 1
fi
echo "  Checksum OK"

# Backup existing
if [ -d "\$INSTALL_DIR" ]; then
  BACKUP="\${INSTALL_DIR}.backup-\$(date +%s)"
  echo "  Backing up existing plugin to \$BACKUP"
  mv "\$INSTALL_DIR" "\$BACKUP"
fi

# Extract
mkdir -p "\$INSTALL_DIR"
unzip -qo "\$ZIP_FILE" -d "\${INSTALL_DIR%/*}"


echo ""
echo "  ✅ Agent installed to \$INSTALL_DIR"
echo "  Restart Claude Code to activate your new agent."
echo ""
`

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `inline; filename="install-${buildId}.sh"`,
      'Cache-Control': 'no-store',
    },
    body: script,
  }
}
