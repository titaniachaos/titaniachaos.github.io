#!/usr/bin/env node
// Derives the published media in docs/public/images/media from the archives
// that sit outside this repository.
//
// It is not part of `npm run check` and no build runs it: the sources are not
// here, and the outputs are committed. It exists so the derivation is written
// down -- which frame came from which file, at what size, at what quality --
// rather than living in whoever's shell history produced the webp.
//
// One size per frame, because there is now only one way a frame is read: in
// the prose that surrounds it, and in the hero slider, which shows the same
// file at about the same size. The widest either slot ever gets is about
// 320px, so 520px is still better than 1.6x on a retina screen, and the two
// uses share a single fetch -- the browser caches it and
// scripts/check-page-weight.mjs counts it once.
//
// The number matters: every frame a page places is counted against that
// page's weight budget, so this quality setting is what decides how many
// pictures a page can afford. Four at ~50 KB is the working figure.
//
// Videos are transcoded to 720p H.264 with a poster frame. Nothing is fetched
// until someone presses play, so a clip costs a page nothing to carry.
//
// Only frames in which Titania is alone are here. See README.md in this
// directory: a fellow performer, a participant or a child in the frame needs
// that person's -- or a guardian's written -- agreement, and none of the
// archive has one. That is the whole of why the good workshop photographs are
// missing, and it is a consent gap, not an editing choice.
//
// The archives are not in this repository and are not going to be: they hold
// frames nobody has consent to publish, and originals far larger than any page
// needs. They sit beside the checkout by default -- `media-archive/` and
// `100 procenta budni/` in the directory above -- and `archiveRoot` says where
// else to look. A clone without them cannot re-derive, which is why the derived
// files are committed.
//
// Usage:  node media/make-media.mjs [archiveRoot]
//         archiveRoot defaults to the directory above this repository.

import { mkdir, stat } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { context, frames as catalogue, xmp } from '../scripts/lib/media-meta.mjs'

const run = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const root = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--only') ?? resolve(here, '..', '..')
// `--only <id>` derives one frame. Importing a single photograph should not
// re-encode forty megabytes of video to do it.
const ONLY = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null
const wanted = (id) => !ONLY || id === ONLY
const out = resolve(here, '..', 'docs/public/images/media')

const W = 520 // px, the widest a frame is shown in prose or in the hero
const H = 700 // px, the tallest -- portraits are the common case here
const Q = 66

// The category pages list a whole tag at once -- `performance` is a dozen
// frames -- and a dozen 50 KB pictures is twice the page budget on its own.
// So a listing gets its own square, small enough that the largest category
// still opens in well under half a megabyte.
// 160, not 240. A listing square is shown at about 120px and never larger, so
// 240 was two and a half times the pixels anyone sees. That did not matter at
// 26 frames and matters a great deal at 111: the `solitude` category alone
// lists 45 of them, and at the old size its tiles came to 495 KB against a
// 500 KB page budget. At this size the same page carries every frame it has
// and stays under 400 KB, with room for the archive to grow again.
const S = 160
const SQ = 62

/** id -> file in media-archive/originals. Frames Titania appears alone in. */
const PHOTOS = {
  'balloon-heart': 'd4fbacdb587f45c9.jpg',
  'balloon-garland': '2eae149b06a289db.webp',
  'balloon-chain': 'f8a521d26208ac1b.jpg',
  'traveller-kit': '7949bd0e9a79e49c.webp',
  'camera-portrait': 'ad04a06769a7d64b.jpg',
  'stage-balloon': '1f45dc7a09cecfd8.webp',
  'stage-gown': '8325b1883f6f37c4.jpg',
  'stage-collar': '6c231b430b6adac7.jpg',
  'wall-coat': '8db268c6d04351f9.webp',
  'beanie-portrait': '423fcf6319886b38.webp',
  'telephone': '539f051963d9ece1.webp',
  'radio-studio': '8ad411d87bcb4563.webp',
  'shadow': 'c648605878f9121d.jpg',
  'doorway-jump': 'e292705622ddb198.webp',
  'bench-balance': 'c8307f2235da445e.webp',
  'barrel-street': '2c1a4c61eeb87ff7.jpg',
  'statue-embrace': '6fc42ab5f57595f5.webp'
}

/**
 * id -> a path relative to the archive root, for sources that are not in the
 * WordPress archive: anything media/import-media.mjs brought in, from a URL or
 * from somewhere else on the disk. Written by `--write`, so this map grows on
 * its own and the paths in it are whole rather than bare filenames.
 */
const IMPORTED = {
  'a-06077ced0b10175c': 'media-archive/originals/06077ced0b10175c.webp',
  'a-0679147602f4d57d': 'media-archive/originals/0679147602f4d57d.webp',
  'a-06d135037c12fedf': 'media-archive/originals/06d135037c12fedf.webp',
  'a-3bae0779b80bc772': 'media-archive/originals/3bae0779b80bc772.png',
  'a-5214fe392c281774': 'media-archive/originals/5214fe392c281774.jpg',
  'a-597e6067aaf640d3': 'media-archive/originals/597e6067aaf640d3.webp',
  'a-6929cbe7e418b679': 'media-archive/originals/6929cbe7e418b679.webp',
  'a-6bd9c2d47300f293': 'media-archive/originals/6bd9c2d47300f293.webp',
  'a-8b30b47754adaae4': 'media-archive/originals/8b30b47754adaae4.webp',
  'a-9eedf775a25a7a47': 'media-archive/originals/9eedf775a25a7a47.webp',
  'a-aed9ec2ec09f7956': 'media-archive/originals/aed9ec2ec09f7956.webp',
  'a-bf2c4943610a52c9': 'media-archive/originals/bf2c4943610a52c9.webp',
  'a-dfc28077d265745f': 'media-archive/originals/dfc28077d265745f.jpg',
  'a-e4384cfe78cdc552': 'media-archive/originals/e4384cfe78cdc552.webp',
  'a-71d43133-c678-4ee5-af41-53856f37ffa3': '100 procenta budni/71D43133-C678-4EE5-AF41-53856F37FFA3.jpg',
  'a-c6ab823a-6d6e-48cd-8dba-d3c2f158e590': '100 procenta budni/C6AB823A-6D6E-48CD-8DBA-D3C2F158E590.jpg',
  'a-img-0013': '100 procenta budni/IMG_0013.jpeg',
  'a-img-0468': '100 procenta budni/IMG_0468.JPG',
  'a-img-0491': '100 procenta budni/IMG_0491.jpeg',
  'a-img-0494': '100 procenta budni/IMG_0494.jpeg',
  'a-img-0511': '100 procenta budni/IMG_0511.JPG',
  'a-img-0536': '100 procenta budni/IMG_0536.JPG',
  'a-img-0561': '100 procenta budni/IMG_0561.JPG',
  'a-img-0825': '100 procenta budni/IMG_0825.JPG',
  'a-img-1208': '100 procenta budni/IMG_1208.jpeg',
  'a-img-1272': '100 procenta budni/IMG_1272.jpg',
  'a-img-1275': '100 procenta budni/IMG_1275.jpg',
  'a-img-1320': '100 procenta budni/IMG_1320.jpeg',
  'a-img-1353': '100 procenta budni/IMG_1353.jpeg',
  'a-img-1355': '100 procenta budni/IMG_1355.jpg',
  'a-img-1366': '100 procenta budni/IMG_1366.JPG',
  'a-img-1406': '100 procenta budni/IMG_1406.jpg',
  'a-img-1414': '100 procenta budni/IMG_1414.JPG',
  'a-img-1419': '100 procenta budni/IMG_1419.jpg',
  'a-img-1474': '100 procenta budni/IMG_1474.JPG',
  'a-img-1610': '100 procenta budni/IMG_1610.jpg',
  'a-img-2173': '100 procenta budni/IMG_2173.jpeg',
  'a-img-2193': '100 procenta budni/IMG_2193.jpeg',
  'a-img-2634': '100 procenta budni/IMG_2634.JPG',
  'a-img-2709': '100 procenta budni/IMG_2709.jpg',
  'a-img-2712': '100 procenta budni/IMG_2712.JPG',
  'a-img-2845': '100 procenta budni/IMG_2845.jpeg',
  'a-img-2906': '100 procenta budni/IMG_2906.jpeg',
  'a-img-3341': '100 procenta budni/IMG_3341.jpeg',
  'a-img-3811': '100 procenta budni/IMG_3811.JPG',
  'a-img-3834': '100 procenta budni/IMG_3834.JPG',
  'a-img-4187': '100 procenta budni/IMG_4187.jpeg',
  'a-img-4367': '100 procenta budni/IMG_4367.JPG',
  'a-img-4503': '100 procenta budni/IMG_4503.jpeg',
  'a-img-4690': '100 procenta budni/IMG_4690.jpeg',
  'a-img-5951': '100 procenta budni/IMG_5951.jpeg',
  'a-img-6026': '100 procenta budni/IMG_6026.jpeg',
  'a-img-6371': '100 procenta budni/IMG_6371.jpeg',
  'a-img-6421': '100 procenta budni/IMG_6421.jpeg',
  'a-img-6763': '100 procenta budni/IMG_6763.jpeg',
  'a-img-7052': '100 procenta budni/IMG_7052.jpeg',
  'a-img-7288': '100 procenta budni/IMG_7288.JPG',
  'a-img-7300': '100 procenta budni/IMG_7300.jpeg',
  'a-img-8040': '100 procenta budni/IMG_8040.JPG',
  'a-img-8211': '100 procenta budni/IMG_8211.JPG',
  'a-img-8521': '100 procenta budni/IMG_8521.jpeg',
  'a-img-8528': '100 procenta budni/IMG_8528.jpeg',
  'a-img-8569': '100 procenta budni/IMG_8569.jpeg',
  'a-img-8628': '100 procenta budni/IMG_8628.jpeg',
  'a-img-8734': '100 procenta budni/IMG_8734.jpeg',
  'a-img-9003': '100 procenta budni/IMG_9003.jpeg',
  'a-img-9614': '100 procenta budni/IMG_9614.JPG',
  'a-img-9687': '100 procenta budni/IMG_9687.jpeg',
  'a-img-9785': '100 procenta budni/IMG_9785.jpeg',
  'a-margareten-2': '100 procenta budni/Margareten-2.jpg',
  'a-dsc4738': '100 procenta budni/_DSC4738.jpg',
  'a-dsc4950': '100 procenta budni/_DSC4950.jpg',
  'a-b3d70d9d-71eb-4a9b-b8f8-c53b0068727f': '100 procenta budni/b3d70d9d-71eb-4a9b-b8f8-c53b0068727f.jpg',
  'a-cd563ea5-553b-422b-9723-bbc102345524': '100 procenta budni/cd563ea5-553b-422b-9723-bbc102345524.jpg',
  'a-de658a10-335c-4aa8-adf1-6681df61c1e0': '100 procenta budni/de658a10-335c-4aa8-adf1-6681df61c1e0.jpg',
  'a-e9b2ae95-a64f-40d1-9bbc-25df2c9a67e3': '100 procenta budni/e9b2ae95-a64f-40d1-9bbc-25df2c9a67e3.jpg',
  'a-f2ed9844-1e7c-4d3f-8391-2e2627046173': '100 procenta budni/f2ed9844-1e7c-4d3f-8391-2e2627046173.jpg',
  'empty-room': '100 procenta budni/IMG_1349.JPG',
  'harbour-bollard': '100 procenta budni/IMG_2935.jpeg',
  'dressing-room': '100 procenta budni/IMG_0468.jpeg',
  'blue-corner': '100 procenta budni/IMG_2869.jpeg',
}

/**
 * id -> a jpg in media/posters. One is a photograph the site published before
 * any of this existed and still does. The five YouTube posters that used to
 * live here are gone: the films are served from this domain now, so their
 * poster is a frame taken from the file rather than a still fetched from
 * Google. They live outside docs/public because the site
 * now carries only the webp derivatives, and a jpg nothing links to is bytes
 * on GitHub Pages nobody asked for.
 */
const POSTERS = {
  'impact-hub': 'time-travelling-camera.jpg'
}

/**
 * The home page's hero portrait, which is not a frame -- no page places it and
 * no tag reaches it; the theme renders it from the front matter. It is here
 * because it is the heaviest image the site serves and nothing else recorded
 * where it came from.
 *
 * The slot is at most 320x420 CSS pixels, so 640x840 covers a 2x screen
 * exactly and anything larger is pixels no one sees. What was published was
 * 800x992 and had been through webp twice -- re-encoded from the master it is
 * both smaller and sharper.
 */
const HERO = {
  file: 'titania-chaos-hero.webp',
  from: '100 procenta budni/IMG_9577.jpeg',
  w: 640,
  h: 840,
  q: 76
}

/**
 * id -> a file still in docs/public/images, because something other than a
 * page needs it at that exact name and size. `titania-juggling.jpg` is the
 * schema.org Person image in seo.ts; the frame is derived from it rather than
 * replacing it.
 */
const PUBLISHED = {
  'juggling-pass': 'titania-juggling.jpg'
}

/**
 * id -> [source file, where the poster comes from].
 *
 * The first two are phone clips from the video archive. The other five are the
 * films from the @titaniachaosofficial346 channel, downloaded once into
 * media-archive/youtube and re-encoded here. Serving the bytes from this
 * domain is the point: the site no longer asks Google for anything, on load or
 * on click, so the privacy policy is true without a facade standing in front
 * of it.
 *
 * The poster is a number -- the second to freeze -- or the name of a jpg in
 * media/posters. The five films use the second, and the jpg is YouTube's own
 * thumbnail, because *she* chose that frame. Picking one here instead meant
 * choosing which workshop participant's face becomes a still on the website,
 * which is not a decision a timestamp should be making. The first attempt
 * froze two of them mid-blur, which is how the question came up.
 */
const VIDEOS = {
  'a-img-3608': ['100 procenta budni/IMG_3608.MOV', 1],
  'a-img-3630': ['100 procenta budni/IMG_3630.MOV', 1],
  'a-img-7217': ['100 procenta budni/IMG_7217.MOV', 1],
  'a-img-8092': ['100 procenta budni/IMG_8092.mov', 1],
  'park-dance': ['100 procenta budni/IMG_2246.MOV', 1.2],
  'square-cartwheel': ['100 procenta budni/IMG_8554.MOV', 2.0],
  'workshop-mini-art': ['media-archive/youtube/JG4Iar3Ax7k.mkv', 'yt-JG4Iar3Ax7k.jpg'],
  'workshop-sofia': ['media-archive/youtube/oh8HroecvrA.mp4', 'yt-oh8HroecvrA.jpg'],
  'showreel': ['media-archive/youtube/OL9f3qKXE1I.mkv', 'yt-OL9f3qKXE1I.jpg'],
  'django-tribute': ['media-archive/youtube/VJuf0huu2X4.mp4', 'yt-VJuf0huu2X4.jpg'],
  'banana-encore': ['media-archive/youtube/w3wkwyrTRiY.mp4', 'yt-w3wkwyrTRiY.jpg']
}

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`
const weigh = async (file) => kb((await stat(file)).size)

// Fail with a sentence rather than a stack trace from inside sharp: a missing
// archive is the ordinary case for anyone who has only cloned the repository.
for (const dir of ['media-archive/originals', 'media-archive/youtube', '100 procenta budni']) {
  try {
    await stat(join(root, dir))
  } catch {
    console.error(
      `make-media: no ${dir} under ${root}\n\n` +
        '  The source archives live beside the checkout, not in it. Pass their\n' +
        '  location if they are somewhere else:\n\n' +
        '    node media/make-media.mjs /path/to/archives\n\n' +
        '  Nothing has been written. The derived files in docs/public/images/media\n' +
        '  are committed, so a clone without the archives still builds and deploys.'
    )
    process.exit(1)
  }
}

await mkdir(out, { recursive: true })

// What each frame should say about itself, keyed by id. A frame being derived
// before it has a record in media.data.ts simply gets no packet.
const META = await context()
const RECORDS = new Map((await catalogue()).map((f) => [f.id, f]))

/**
 * The two derivatives a frame has: `<id>.webp` for prose and the hero, and
 * `<id>-s.webp`, a square, for the category listings.
 *
 * Both carry their XMP from this encode rather than being stamped afterwards.
 * Stamping later would mean decoding and re-encoding a lossy file, and that
 * does not come free -- three passes drifted pixels by a mean of 1.5 levels
 * and compounds from there.
 */
async function frame(source, id) {
  const record = RECORDS.get(id)
  const packet = record ? xmp(record, META) : null
  const stamp = (pipeline) => (packet ? pipeline.withXmp(packet) : pipeline)

  await stamp(sharp(source).resize(W, H, { fit: 'inside', withoutEnlargement: true }))
    .webp({ quality: Q }).toFile(join(out, `${id}.webp`))
  await stamp(sharp(source).resize(S, S, { fit: 'cover', position: record?.focus ?? 'attention' }))
    .webp({ quality: SQ }).toFile(join(out, `${id}-s.webp`))
}

for (const [id, file] of Object.entries(PHOTOS)) {
  if (!wanted(id)) continue
  const source = join(root, 'media-archive/originals', file)
  await frame(source, id)
  console.log(`${id.padEnd(18)} ${(await weigh(join(out, `${id}.webp`))).padStart(8)}   <- ${file}`)
}

for (const [id, file] of Object.entries(IMPORTED)) {
  if (!wanted(id)) continue
  await frame(join(root, file), id)
  console.log(`${id.padEnd(18)} ${(await weigh(join(out, `${id}.webp`))).padStart(8)}   <- ${file}`)
}

for (const [id, file] of Object.entries(PUBLISHED)) {
  if (!wanted(id)) continue
  await frame(resolve(here, '..', 'docs/public/images', file), id)
  console.log(`${id.padEnd(18)} ${(await weigh(join(out, `${id}.webp`))).padStart(8)}   <- images/${file}`)
}

if (wanted('hero')) {
  const dest = resolve(here, '..', 'docs/public/images', HERO.file)
  await sharp(join(root, HERO.from))
    // From the top: it is a portrait, and what a shorter frame loses is floor.
    .resize(HERO.w, HERO.h, { fit: 'cover', position: 'top' })
    .webp({ quality: HERO.q, effort: 6 })
    .toFile(dest)
  console.log(`${'hero'.padEnd(18)} ${(await weigh(dest)).padStart(8)}   <- ${HERO.from}`)
}

for (const [id, file] of Object.entries(POSTERS)) {
  if (!wanted(id)) continue
  await frame(join(here, 'posters', file), id)
  console.log(`${id.padEnd(18)} ${(await weigh(join(out, `${id}.webp`))).padStart(8)}   <- posters/${file}`)
}

for (const [id, [file, at]] of Object.entries(VIDEOS)) {
  if (!wanted(id)) continue
  const source = join(root, file)
  const mp4 = join(out, `${id}.mp4`)
  // 720p, constant quality, faststart so it plays before it has finished
  // arriving. Audio kept, but quietly: it is ambience, not a soundtrack.
  await run('ffmpeg', ['-v', 'error', '-y', '-i', source,
    // Fit inside 1280x720, then force both edges even: H.264 with yuv420p
    // cannot encode an odd dimension, and a portrait source lands on one
    // easily -- 1080x1920 scales to 405x720 and the encoder refuses to open,
    // leaving a zero-byte file behind.
    '-vf',
    "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease," +
      'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264', '-crf', '29', '-preset', 'slow', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '64k', '-ac', '1', '-movflags', '+faststart', mp4])

  if (typeof at === 'string') {
    await frame(join(here, 'posters', at), id)
  } else {
    const still = join(out, `${id}-still.png`)
    await run('ffmpeg', ['-v', 'error', '-y', '-ss', String(at), '-i', source, '-frames:v', '1', still])
    await frame(still, id)
    await run('rm', ['-f', still])
  }
  console.log(`${id.padEnd(18)} ${(await weigh(mp4)).padStart(8)} mp4` +
    `  ${(await weigh(join(out, `${id}.webp`))).padStart(8)} poster   <- ${file}`)
}

// The films are stamped and the index written here rather than by hand: sharp
// has already put the packet in every webp above, but an mp4's metadata lives
// in its container and docs/public/media.json has to be regenerated whenever
// the catalogue moves.
await run('node', [join(here, 'export-media.mjs')], { cwd: resolve(here, '..') })
  .then(({ stdout }) => process.stdout.write(stdout))
