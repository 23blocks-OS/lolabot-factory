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

  const downloadUrl = `https://${BUILDS_BUCKET}.s3.amazonaws.com/builds/${buildId}.zip`

  const script = `#!/bin/bash
set -euo pipefail

BUILD_ID="${buildId}"
DOWNLOAD_URL="${downloadUrl}"
INSTALL_DIR="\${HOME}/.claude/plugins/ai-maestro"

echo ""
echo "  🤖 Lolabot Factory — Installing your AI agent..."
echo ""

# Download
echo "  Downloading agent package..."
if ! curl -fsSL "\$DOWNLOAD_URL" -o /tmp/lolabot-agent.zip; then
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
unzip -qo /tmp/lolabot-agent.zip -d "\${INSTALL_DIR%/*}"

# Cleanup
rm /tmp/lolabot-agent.zip

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
