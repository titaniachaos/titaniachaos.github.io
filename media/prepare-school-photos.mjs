#!/usr/bin/env node
// Rebuild this approved batch from the private originals; never imports a folder wholesale.
// Usage on macOS: node media/prepare-school-photos.mjs /path/to/originals
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { frames, context, xmp } from '../scripts/lib/media-meta.mjs'

const run = promisify(execFile)
const sourceDir = process.argv[2]
if (!sourceDir) throw new Error('Pass the private directory containing the two original HEIC files.')
const root = fileURLToPath(new URL('..', import.meta.url))
const batch = JSON.parse(await readFile(new URL('./school-2026-10-21.json', import.meta.url), 'utf8'))
const catalogue = new Map((await frames()).map(frame => [frame.id, frame]))
const meta = await context()
meta.rights = JSON.parse(await readFile(join(root, 'docs/public/media.json'), 'utf8')).rights
// Verify the entire batch before writing any public asset.
for (const source of batch.sources) {
  const bytes = await readFile(resolve(sourceDir, source.sourceFile))
  if (createHash('sha256').update(bytes).digest('hex') !== source.sha256) throw new Error(`Original differs: ${source.sourceFile}`)
  if (!catalogue.has(source.id)) throw new Error(`Unknown media id: ${source.id}`)
}
const temp = await mkdtemp(join(tmpdir(), 'school-heic-'))
const out = join(root, 'docs/public/images/media')
try {
  await mkdir(out, { recursive: true })
  for (const source of batch.sources) {
    // Quick Look decodes HEVC using macOS; Sharp's HEIF build may lack that codec.
    await run('qlmanage', ['-t', '-s', '1200', '-o', temp, resolve(sourceDir, source.sourceFile)])
    const decoded = join(temp, `${source.sourceFile}.png`)
    const packet = xmp(catalogue.get(source.id), meta)
    await sharp(decoded).resize({ width: 960, height: 960, fit: 'inside', withoutEnlargement: true }).withXmp(packet)
      .webp({ quality: 78 }).toFile(join(out, `${source.id}.webp`))
    await sharp(decoded).resize(160, 160, { fit: 'cover' }).withXmp(packet)
      .webp({ quality: 65 }).toFile(join(out, `${source.id}-s.webp`))
    console.log(`Prepared ${source.id}`)
  }
} finally {
  await rm(temp, { recursive: true, force: true })
}

// Keep the central public catalogue in sync without touching unrelated media.
const exported = await run(process.execPath, [join(root, 'media/export-media.mjs'), '--index-only'])
console.log(exported.stdout.trim())
