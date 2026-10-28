/**
 * Lambda: install-script
 *
 * Serves a tailored install script for a given build ID.
 * GET /install/<build-id> → bash script that downloads + installs the agent plugin.
 */

const BUILDS_BUCKET = process.env.BUILDS_BUCKET || 'lolabot-builds'

interface Event {
  pathParameters?: {
    id?: string
  }
}

export async function handler(event: Event) {
  const buildId = event.pathParameters?.id

  if (!buildId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'echo "Error: No build ID provided"',
    }
  }

  // Build IDs are UUIDs. Anything else is refused: the ID is written into a
  // script that people pipe to bash.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(buildId)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'echo "Error: invalid build ID"',
    }
  }

  const downloadUrl = `https://${BUILDS_BUCKET}.s3.amazonaws.com/builds/${buildId}.zip`

  const script = `#!/bin/bash
set -euo pipefail

BUILD_ID="${buildId}"
DOWNLOAD_URL="${downloadUrl}"
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
      'Cache-Control': 'public, max-age=3600',
    },
    body: script,
  }
}
