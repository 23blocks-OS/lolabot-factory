#!/bin/bash
set -euo pipefail

# Seed the personality catalog from the agency-agents repo.
# Clones (or updates) agency-agents and converts all markdown files to a single JSON catalog.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CACHE_DIR="${PROJECT_DIR}/.build-cache"
AGENTS_REPO="https://github.com/23blocks-OS/agency-agents.git"
AGENTS_DIR="${CACHE_DIR}/agency-agents"
OUTPUT_FILE="${PROJECT_DIR}/data/personalities.json"

echo "==> Seeding personality catalog..."

# Clone or update
if [ -d "$AGENTS_DIR" ]; then
  echo "    Updating agency-agents..."
  cd "$AGENTS_DIR" && git pull --quiet
else
  echo "    Cloning agency-agents..."
  mkdir -p "$CACHE_DIR"
  git clone --depth 1 "$AGENTS_REPO" "$AGENTS_DIR"
fi

# Divisions to scan (directories containing agent markdown files)
DIVISIONS=(
  academic design engineering finance game-development
  marketing paid-media product project-management sales
  spatial-computing specialized strategy support testing
)

echo "    Parsing personalities..."

# Build JSON array using node for reliable YAML/markdown parsing
node -e "
const fs = require('fs');
const path = require('path');

const agentsDir = '${AGENTS_DIR}';
const divisions = ${DIVISIONS[@]+"'${DIVISIONS[*]}'".replace(/ /g, "','")};

// Simple frontmatter parser (no dependencies needed)
function parseFrontmatter(content) {
  const match = content.match(/^---\\n([\\s\\S]*?)\\n---\\n([\\s\\S]*)$/);
  if (!match) return null;
  const meta = {};
  match[1].split('\\n').forEach(line => {
    const kv = line.match(/^(\\w+):\\s*[\"']?(.*?)[\"']?\\s*$/);
    if (kv) meta[kv[1]] = kv[2];
  });
  return { meta, body: match[2].trim() };
}

const personalities = [];
const divList = '${DIVISIONS[*]}'.split(' ');

for (const div of divList) {
  const divDir = path.join(agentsDir, div);
  if (!fs.existsSync(divDir)) continue;

  const files = fs.readdirSync(divDir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(divDir, file), 'utf-8');
    const parsed = parseFrontmatter(content);
    if (!parsed) continue;

    personalities.push({
      id: file.replace('.md', ''),
      division: div,
      name: parsed.meta.name || file.replace('.md', ''),
      description: parsed.meta.description || '',
      emoji: parsed.meta.emoji || '🤖',
      color: parsed.meta.color || 'blue',
      vibe: parsed.meta.vibe || '',
      tier: 'free'
    });
  }
}

// Sort by division, then name
personalities.sort((a, b) => a.division.localeCompare(b.division) || a.name.localeCompare(b.name));

fs.writeFileSync('${OUTPUT_FILE}', JSON.stringify(personalities, null, 2));
console.log('    Generated ' + personalities.length + ' personalities → ${OUTPUT_FILE}');
"

echo "==> Done!"
