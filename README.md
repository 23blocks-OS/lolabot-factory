# Lolabot Factory

Build your AI employee in 60 seconds. Pick a personality from 170+ specialists, choose skills, and get an installable Claude Code plugin.

Part of the [AI Maestro](https://github.com/23blocks-OS/ai-maestro) ecosystem — the OS for AI-first organizations.

## Quick Start

```bash
# Install dependencies
npm install

# Seed personality catalog from agency-agents
npm run seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

1. **Browse** — Pick from 170+ AI personalities across 15 divisions
2. **Configure** — Add skills (messaging, memory, code analysis, planning)
3. **Build** — Lambda assembles a Claude Code plugin using `build-plugin.sh`
4. **Install** — One-liner command installs the plugin locally

## Architecture

- **Frontend**: Next.js 14 (static export) → S3 + CloudFront
- **API**: AWS Lambda functions via API Gateway
- **Build**: Clones repos, runs `build-plugin.sh`, zips output → S3
- **Install**: `curl -fsSL https://lolabots.com/install/<id> | bash`

## Deploy

```bash
# Deploy to AWS (requires SAM CLI + Docker)
./infrastructure/deploy.sh
```

## Repos

| Repo | Purpose |
|------|---------|
| [lolabot-factory](https://github.com/23blocks-OS/lolabot-factory) | This repo — web app + Lambda + infra |
| [agency-agents](https://github.com/23blocks-OS/agency-agents) | 170+ personality library |
| [ai-maestro-plugins](https://github.com/23blocks-OS/ai-maestro-plugins) | Plugin builder engine |

## License

MIT
