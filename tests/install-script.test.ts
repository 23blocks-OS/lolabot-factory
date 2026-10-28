import { describe, it, expect } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { handleInstall, type Deps } from '../lambda/install-script/handler'

const ID = '123e4567-e89b-42d3-a456-426614174000'
const SHA = 'a'.repeat(64)
const URL = 'https://b.s3.amazonaws.com/builds/x.zip?X-Amz-Signature=abc&X-Amz-Expires=900'

const deps = (over: Partial<Deps> = {}): Deps => ({
  getMetadata: async () => JSON.stringify({ sha256: SHA }),
  presignZip: async () => URL,
  ...over,
})

describe('install-script handler', () => {
  it('embeds the presigned URL and checksum, and is not cacheable', async () => {
    const r = await handleInstall({ pathParameters: { id: ID } }, deps())
    expect(r.statusCode).toBe(200)
    expect(r.body).toContain(`EXPECTED_SHA256="${SHA}"`)
    expect(r.body).toContain(`DOWNLOAD_URL="${URL}"`)
    expect(r.body).not.toContain('s3.amazonaws.com/builds/' + ID)
    expect(r.headers['Cache-Control']).toBe('no-store')
    // verification happens before the existing install is moved or unzipped
    const b = r.body
    expect(b.indexOf('Checksum mismatch')).toBeGreaterThan(-1)
    expect(b.indexOf('Checksum mismatch')).toBeLessThan(b.indexOf('unzip'))
    expect(b.indexOf('Checksum mismatch')).toBeLessThan(b.indexOf('Backing up'))
  })

  it('refuses bad ids, unknown builds and bad checksums', async () => {
    expect((await handleInstall({}, deps())).statusCode).toBe(400)
    expect((await handleInstall({ pathParameters: { id: '../x"; rm -rf ~' } }, deps())).statusCode).toBe(400)
    expect((await handleInstall({ pathParameters: { id: ID } }, deps({ getMetadata: async () => null }))).statusCode).toBe(404)
    expect((await handleInstall({ pathParameters: { id: ID } }, deps({ getMetadata: async () => '{}' }))).statusCode).toBe(500)
    expect((await handleInstall({ pathParameters: { id: ID } }, deps({ getMetadata: async () => '{"sha256":"x\\";id;\\""}' }))).statusCode).toBe(500)
    expect((await handleInstall({ pathParameters: { id: ID } }, deps({ getMetadata: async () => 'not json' }))).statusCode).toBe(500)
    expect((await handleInstall({ pathParameters: { id: ID } }, deps({ presignZip: async () => 'https://x/";id;"' }))).statusCode).toBe(500)
    const r = await handleInstall({ pathParameters: { id: ID } }, deps({ getMetadata: async () => null }))
    expect(r.body).toContain('exit 1')
  })

  // Run the generated script for real, with a fake curl that copies a local zip.
  describe('generated script, executed', () => {
    const run = async (zipFor: (zip: string) => string, sha: (zip: string) => string) => {
      const dir = mkdtempSync(join(tmpdir(), 'lolabot-inst-'))
      const src = join(dir, 'src/ai-maestro')
      execFileSync('mkdir', ['-p', src])
      writeFileSync(join(src, 'marker.txt'), 'hello')
      const zip = join(dir, 'good.zip')
      execFileSync('zip', ['-qr', zip, 'ai-maestro'], { cwd: join(dir, 'src') })
      const served = zipFor(zip)
      const bin = join(dir, 'bin')
      execFileSync('mkdir', ['-p', bin])
      writeFileSync(join(bin, 'curl'), `#!/bin/bash\nwhile [ $# -gt 0 ]; do [ "$1" = "-o" ] && out="$2"; shift; done\ncp "${served}" "$out"\n`, { mode: 0o755 })
      const r = await handleInstall({ pathParameters: { id: ID } }, deps({ getMetadata: async () => JSON.stringify({ sha256: sha(zip) }) }))
      const script = join(dir, 'install.sh')
      writeFileSync(script, r.body)
      const home = join(dir, 'home')
      execFileSync('mkdir', ['-p', join(home, '.claude/plugins/ai-maestro')])
      writeFileSync(join(home, '.claude/plugins/ai-maestro/old.txt'), 'old')
      const p = spawnSync('bash', [script], { env: { ...process.env, HOME: home, PATH: `${bin}:${process.env.PATH}` }, encoding: 'utf8' })
      return { p, home }
    }
    const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex')

    it('installs when the checksum matches', async () => {
      const { p, home } = await run((z) => z, sha)
      expect(p.status).toBe(0)
      expect(p.stdout).toContain('Checksum OK')
      expect(readFileSync(join(home, '.claude/plugins/ai-maestro/marker.txt'), 'utf8')).toBe('hello')
    })

    it('installs nothing and keeps the existing plugin when the zip was tampered with', async () => {
      const { p, home } = await run((z) => {
        const t = z + '.evil'
        writeFileSync(t, Buffer.concat([readFileSync(z), Buffer.from('x')]))
        return t
      }, sha)
      expect(p.status).not.toBe(0)
      expect(p.stdout).toContain('Checksum mismatch')
      expect(existsSync(join(home, '.claude/plugins/ai-maestro/old.txt'))).toBe(true)
      expect(existsSync(join(home, '.claude/plugins/ai-maestro/marker.txt'))).toBe(false)
    })
  })
})
