#!/usr/bin/env node
// Rebuild this approved batch from the private originals; never imports a folder wholesale.
// Usage: node media/prepare-school-photos.mjs /path/to/originals [school-YYYY-MM-DD.json]
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
if (!sourceDir) throw new Error('Pass the private directory containing the approved original files.')
const root = fileURLToPath(new URL('..', import.meta.url))
const manifest = process.argv[3] ?? 'school-2026-10-21.json'
const batch = JSON.parse(await readFile(resolve(root, 'media', manifest), 'utf8'))
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
    let decoded = resolve(sourceDir, source.sourceFile)
    const frame = catalogue.get(source.id)
    if (frame.seconds) {
      // Only the selected video stream and optional audio: no location/data tracks.
      await run('ffmpeg', ['-v', 'error', '-y', '-i', decoded,
        '-map', '0:v:0', '-map', '0:a:0?', '-map_metadata', '-1', '-map_chapters', '-1',
        '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart',
        '-metadata', `title=${frame.caption.en}`,
        '-metadata', `description=${frame.alt.en}`,
        '-metadata', `artist=${frame.creator ?? meta.credit}`,
        '-metadata', `copyright=${meta.rights}`,
        join(out, `${source.id}.mp4`)])
      const poster = join(temp, `${source.id}.png`)
      await run('ffmpeg', ['-v', 'error', '-y', '-ss', '1', '-i',
        join(out, `${source.id}.mp4`), '-frames:v', '1', poster])
      decoded = poster
    }
    if (/\.heic$/i.test(source.sourceFile)) {
      await run('qlmanage', ['-t', '-s', '1200', '-o', temp, decoded])
      decoded = join(temp, `${source.sourceFile}.png`)
    }
    const packet = xmp(catalogue.get(source.id), meta)
    await sharp(decoded).rotate().resize({ width: 960, height: 960, fit: 'inside', withoutEnlargement: true }).withXmp(packet)
      .webp({ quality: 78 }).toFile(join(out, `${source.id}.webp`))
    await sharp(decoded).rotate().resize(160, 160, { fit: 'cover' }).withXmp(packet)
      .webp({ quality: 65 }).toFile(join(out, `${source.id}-s.webp`))
    if (source.socialCard) {
      const upright = await sharp(decoded).rotate().png().toBuffer()
      const { width, height } = await sharp(upright).metadata()
      const cropHeight = Math.round(width * 2 / 3)
      const top = Math.min(Math.round(height * 0.11), height - cropHeight)
      await sharp(upright).extract({ left: 0, top, width, height: cropHeight }).resize(1200, 800)
        .withXmp(packet).jpeg({ quality: 85 }).toFile(join(out, `${source.id}-social.jpg`))
    }
    console.log(`Prepared ${source.id}`)
  }
} finally {
  await rm(temp, { recursive: true, force: true })
}

// Keep the central public catalogue in sync without touching unrelated media.
const exported = await run(process.execPath, [join(root, 'media/export-media.mjs'), '--index-only'])
console.log(exported.stdout.trim())
