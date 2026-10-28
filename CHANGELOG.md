# Changelog

## [0.1.1] - 2026-10-28

### Security: review and updates, 2026-10-28
- `lambda/build-agent/handler.ts`: `personalityId`, `agentName` and each skill from the request body were pasted into shell commands (`find`, `cp`, `git clone`, `cd`), so a crafted value could run commands in the build container and write outside the work folder. Values must now match `[A-Za-z0-9][A-Za-z0-9_-]{0,63}` (at most 32 skills), and every external command runs through `execFileSync` with an argument list. File search, copy and cleanup use Node file functions instead of `find`, `cp` and `rm`.
- `lambda/install-script/handler.ts`: the build ID from the URL was written into a bash script that people pipe to `bash`. It must now be a UUID. The generated script downloads into a `mktemp` file (it used the fixed path `/tmp/lolabot-agent.zip`), removes it on exit and fetches over HTTPS with TLS 1.2 or later.
- Node 20 is end of life: the Lambda container image is now `nodejs:22` and the SAM runtime `nodejs22.x`.
- `infrastructure/template.yaml`: the API gets default throttling (burst 20, rate 10 per second) because the build endpoint is public.
- Dependencies: `next` 14.2.21 to 14.2.35 (fixes the remote code execution, image optimizer and server action advisories that apply to 14.2.21), plus in-range updates of the lock file (postcss, source-map-js, postcss-selector-parser, and others). `npm audit`: 1 critical, 5 high, 2 moderate before; 1 critical, 1 high after.
- Still open: the remaining `next` advisories and the `postcss` copy bundled inside `next` are only fixed in Next 15/16 (a major upgrade, not done here). The site is a static export (`output: 'export'`), so the server-side Next features named in those advisories (image optimizer, middleware, rewrites, server components) are not served in production.
