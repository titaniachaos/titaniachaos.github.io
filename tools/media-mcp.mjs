#!/usr/bin/env node
// An MCP server over the media pipeline, so the site can be worked on by tool
// call instead of by remembering which script does what.
//
// Everything here already existed as a script. What did not exist was a
// surface: to add a photograph you had to know that make-media.mjs derives it,
// that media.data.ts is where the record goes, that the record needs alt text
// in three languages, that a page places it by tags rather than by filename,
// and that check-ecosystem.mjs will fail if the three locales disagree. That
// is five files of knowledge to add one picture.
//
// So these tools do not reimplement any of it -- they shell out to the same
// scripts and edit the same files. The point is that the sequence is now
// discoverable and the invariants are enforced at the door.
//
// Speaks MCP over stdio: newline-delimited JSON-RPC 2.0. No dependencies, on
// purpose -- this repository has two, sharp and vitepress, and a server that
// exists to describe the repository should not be the thing that triples that.
//
// Registered for this project in .mcp.json, and registerable from any other
// project the same way -- point `args` at this file by absolute path and the
// server works, because it resolves its own repository from its own location
// rather than from the caller's working directory. `media_use` is the tool a
// consumer wants: this site is the origin for the published media, and other
// projects link to it rather than keeping copies.

import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'
import { frames as readFrames, vocabulary } from '../scripts/lib/media-meta.mjs'

const run = promisify(execFile)
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'docs/.vitepress/media.data.ts')
const SEO = join(ROOT, 'docs/.vitepress/seo.ts')
// The vocabulary lives here, not in media.data.ts: the loader, the three
// [category].paths.ts files, the navigation and the components all import it.
const TAXONOMY = join(ROOT, 'docs/.vitepress/categories.ts')
const LOCALES = { en: 'docs', bg: 'docs/bg', de: 'docs/de' }

const sh = async (cmd, args, opts = {}) => {
  try {
    const { stdout, stderr } = await run(cmd, args, { cwd: ROOT, maxBuffer: 32 * 1024 * 1024, ...opts })
    return { ok: true, out: (stdout + stderr).trim() }
  } catch (err) {
    return { ok: false, out: ((err.stdout ?? '') + (err.stderr ?? '') + (err.message ?? '')).trim() }
  }
}

/**
 * Where the media is served from, read from the same place the site reads it,
 * so a move to a custom domain moves the URLs this hands out as well. Honours
 * SITE_ORIGIN for the same reason.
 */
async function origin() {
  if (process.env.SITE_ORIGIN) return process.env.SITE_ORIGIN.replace(/\/$/, '')
  const src = await readFile(SEO, 'utf8').catch(() => '')
  return (src.match(/SITE_ORIGIN \?\? '([^']+)'/)?.[1] ?? 'https://titaniachaos.github.io').replace(/\/$/, '')
}

// ---- reading the catalogue -------------------------------------------------

// One reader for the archive, shared with the checks and the derivation.
//
// This carried its own parser, and its caption regex required the brace and
// the `en:` on separate lines -- so the day the ledger gained entries written
// on one line, this tool began reporting `caption: undefined` for 80 of 139
// frames and said nothing. A parser per tool is a bug per tool.
async function catalogue() {
  const tags = await vocabulary()
  if (tags.length === 0) throw new Error(`could not read the tag vocabulary from ${TAXONOMY}`)
  const frames = (await readFrames()).map((f) => ({
    id: f.id,
    kind: f.kind,
    tags: f.tags,
    seconds: f.seconds,
    source: f.source ?? 'archive',
    draft: f.draft,
    othersInFrame: f.othersInFrame,
    caption: f.caption?.en
  }))
  return { tags, frames }
}

/** Which frames the built site actually renders, and which are only shipped. */
async function placed() {
  const dist = join(ROOT, 'docs/.vitepress/dist')
  const out = new Set()
  const walk = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const full = join(dir, e.name)
      if (e.isDirectory()) await walk(full)
      else if (e.name.endsWith('.html')) {
        const html = await readFile(full, 'utf8')
        for (const m of html.matchAll(/images\/media\/([a-z0-9-]+)\.(?:webp|mp4)/g)) out.add(m[1])
      }
    }
  }
  await walk(dist)
  return out
}

// ---- the tools -------------------------------------------------------------

const TOOLS = {
  media_list: {
    description:
      'The picture and film archive: every frame, its tags, where it came from, whether any page renders it, ' +
      'and whether it still owes consent. Start here — it answers "what do we have" and "what is going unused".',
    inputSchema: {
      type: 'object',
      properties: {
        tag: { type: 'string', description: 'Only frames carrying this tag.' },
        unplaced: { type: 'boolean', description: 'Only frames no page renders (needs a build first).' }
      }
    },
    async run({ tag, unplaced }) {
      const { tags, frames } = await catalogue()
      const shown = await placed()
      let list = frames.map((f) => ({ ...f, placed: shown.has(f.id) }))
      if (tag) list = list.filter((f) => f.tags.includes(tag))
      if (unplaced) list = list.filter((f) => !f.placed)
      const lines = list.map(
        (f) =>
          `${f.placed ? ' ' : '·'} ${f.id.padEnd(20)} ${f.kind.padEnd(5)} ${(f.source ?? '').padEnd(10)}` +
          `${f.tags.join(' ').padEnd(34)}${f.othersInFrame ? ' ⚠ consent owed' : ''}`
      )
      return (
        `vocabulary: ${tags.join(', ')}\n\n` +
        `${list.length} frame(s)  ("·" = shipped but no page renders it)\n` +
        lines.join('\n') +
        `\n\n${list.filter((f) => f.othersInFrame).length} owe consent; see media/README.md`
      )
    }
  },

  media_derive: {
    description:
      'Re-derive the published files from the archives outside the repository — every photograph, every clip, ' +
      'the home hero. Run after adding a source or changing a size or quality setting.',
    inputSchema: { type: 'object', properties: {} },
    async run() {
      const r = await sh('node', ['media/make-media.mjs'])
      return r.out || (r.ok ? 'done' : 'failed')
    }
  },

  media_place: {
    description:
      'Put a figure under a heading, in all three languages at once — the edit that is easy to do in one ' +
      'locale and forget in the other two. Takes the heading text per language; the tags are the same everywhere ' +
      'because a tag is a property of the photograph, not a word on the page.',
    inputSchema: {
      type: 'object',
      required: ['page', 'tags', 'headings'],
      properties: {
        page: { type: 'string', description: 'Page slug, e.g. "events" or "about-titania".' },
        tags: { type: 'string', description: 'Space-separated tags from the vocabulary.' },
        headings: {
          type: 'object',
          description: 'The heading to place under, exactly as written, per language.',
          properties: { en: { type: 'string' }, bg: { type: 'string' }, de: { type: 'string' } },
          required: ['en', 'bg', 'de']
        }
      }
    },
    async run({ page, tags, headings }) {
      const { tags: vocab } = await catalogue()
      const unknown = tags.split(/\s+/).filter((t) => t && !vocab.includes(t))
      if (unknown.length) return `refused: ${unknown.join(', ')} is not in the vocabulary (${vocab.join(', ')})`

      const done = []
      for (const [lang, dir] of Object.entries(LOCALES)) {
        const path = join(ROOT, dir, `${page}.md`)
        let src
        try { src = await readFile(path, 'utf8') } catch { return `refused: ${dir}/${page}.md does not exist` }
        const heading = headings[lang]
        if (!src.includes(heading)) return `refused: ${dir}/${page}.md has no heading "${heading}" — nothing was written`
        if (src.includes(`tags="${tags}"`)) return `refused: ${dir}/${page}.md already asks for "${tags}"`
        done.push([path, src, heading])
      }
      // Only once every locale is known to be writable does anything change.
      for (const [path, src, heading] of done) {
        const at = src.indexOf(heading) + heading.length
        await writeFile(path, src.slice(0, at) + `\n\n<MediaFigure tags="${tags}" />` + src.slice(at))
      }
      const check = await sh('npm', ['run', 'check'])
      return `placed "${tags}" on ${page} in all three languages.\n\n${check.out.split('\n').filter((l) => /^check-/.test(l)).join('\n')}`
    }
  },

  media_fetch_youtube: {
    description:
      'Download every film on the YouTube channel into media-archive/youtube. The site serves the bytes itself, ' +
      'so nothing on a page ever reaches Google; this is how those bytes get here. Needs yt-dlp.',
    inputSchema: {
      type: 'object',
      properties: { channel: { type: 'string', description: 'Channel handle. Defaults to the site\'s own.' } }
    },
    async run({ channel = '@titaniachaosofficial346' }) {
      const feed = await sh('bash', ['-lc',
        `curl -sL -A Mozilla/5.0 "https://www.youtube.com/${channel}/videos" | ` +
        `grep -oE '"videoId":"[A-Za-z0-9_-]{11}"' | sort -u | grep -oE '[A-Za-z0-9_-]{11}$'`])
      const ids = [...new Set(feed.out.split('\n').filter(Boolean))]
      if (!ids.length) return 'no videos found — the channel page may be blocking automated requests'
      const dest = join(ROOT, '..', 'media-archive/youtube')
      const lines = []
      for (const id of ids) {
        // Clients differ in which formats they will actually serve; the ones
        // that list adaptive streams are the ones worth having.
        let got = false
        for (const client of ['web_embedded', 'android_vr', 'web_safari,tv', 'mweb']) {
          const r = await sh('yt-dlp', ['-q', '--no-warnings', '--extractor-args', `youtube:player_client=${client}`,
            '-f', 'bv*[height<=1080]+ba/b[height<=1080]/b', '--merge-output-format', 'mp4',
            '-o', join(dest, `${id}.%(ext)s`), `https://www.youtube.com/watch?v=${id}`])
          if (r.ok) { lines.push(`  ${id}  via ${client}`); got = true; break }
        }
        if (!got) lines.push(`  ${id}  FAILED on every client`)
      }
      return `${ids.length} film(s) on ${channel}:\n${lines.join('\n')}\n\n` +
        'Add each to VIDEOS in media/make-media.mjs and to FRAMES in media.data.ts, then run media_derive.'
    }
  },

  feed_sync: {
    description:
      'Pull Instagram and Facebook photographs in as frames, tagged from their captions. Needs IG_TOKEN, or ' +
      'FB_PAGE_ID and FB_TOKEN. Neither account can be read without them.',
    inputSchema: {
      type: 'object',
      properties: { count: { type: 'number', description: 'How many recent posts. Default 6.' } }
    },
    async run({ count = 6 }) {
      const r = await sh('node', ['scripts/feed-sync.mjs', String(count)])
      return r.out || 'no output'
    }
  },

  media_import: {
    description:
      'Read a photograph or film and produce the catalogue record for it, filled in as far as the file can ' +
      'fill it in — dimensions, kind, length, capture date, camera. Accepts a local path OR a URL. Reports ' +
      'geotagging rather than keeping it. Leaves alt text and caption as gaps, which are the parts a machine ' +
      'has no business inventing.',
    inputSchema: {
      type: 'object',
      required: ['source'],
      properties: {
        source: { type: 'string', description: 'A local path or an http(s) URL.' },
        id: { type: 'string', description: 'The frame id to use. Defaults to the filename.' },
        tags: { type: 'string', description: 'Space-separated tags, instead of guessing from the file.' }
      }
    },
    async run({ source, id, tags }) {
      const args = ['media/import-media.mjs', source]
      if (id) args.push('--id', id)
      if (tags) args.push('--tags', tags)
      const r = await sh('node', args)
      return r.out || 'no output'
    }
  },

  media_export: {
    description:
      'Write the catalogue into the published files — XMP in every image, container metadata in every film, ' +
      'in all three languages — and regenerate the public index at /media.json. Skips anything already ' +
      'current, because re-encoding a lossy file costs quality.',
    inputSchema: {
      type: 'object',
      properties: { dry: { type: 'boolean', description: 'Report what would change and write nothing.' } }
    },
    async run({ dry }) {
      const r = await sh('node', ['media/export-media.mjs', ...(dry ? ['--dry'] : [])])
      return r.out || 'no output'
    }
  },

  media_use: {
    description:
      'Use a photograph or film from this site in ANOTHER project. Returns the absolute URL it is served ' +
      'from, its dimensions, its alt text in all three languages, and markup ready to paste. Nothing is ' +
      'copied: this site is the origin, other projects link to it, and a picture replaced here is replaced ' +
      'everywhere at once.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'A specific frame, by id.' },
        tag: { type: 'string', description: 'Instead of an id: every frame carrying this tag.' },
        lang: { type: 'string', description: 'Which language the alt text should be in: en, bg or de. Default en.' },
        as: { type: 'string', description: '"html" (default) or "markdown".' }
      }
    },
    async run({ id, tag, lang = 'en', as = 'html' }) {
      const { frames } = await catalogue()
      const host = await origin()
      let want = frames
      if (id) want = want.filter((f) => f.id === id)
      if (tag) want = want.filter((f) => f.tags.includes(tag))
      if (!want.length) return `nothing matches${id ? ` id ${id}` : ''}${tag ? ` tag ${tag}` : ''}`

      // Alt text is per language and lives in the catalogue; read it straight
      // from the source so a consumer never has to invent one.
      const src = await readFile(DATA, 'utf8')
      const altOf = (frameId) => {
        const block = src.match(new RegExp(`id: '${frameId}',[\\s\\S]*?alt: \\{([\\s\\S]*?)\\}`))?.[1] ?? ''
        return block.match(new RegExp(`${lang}: '((?:[^'\\\\]|\\\\.)*)'`))?.[1]?.replace(/\\'/g, "'") ?? ''
      }

      return want
        .map((f) => {
          const alt = altOf(f.id)
          const url = `${host}/images/media/${f.id}.webp`
          const film = f.seconds ? `${host}/images/media/${f.id}.mp4` : null
          const snippet = film
            ? `<video src="${film}" poster="${url}" controls playsinline preload="none" aria-label="${alt}"></video>`
            : as === 'markdown'
              ? `![${alt}](${url})`
              : `<img src="${url}" alt="${alt}" loading="lazy" decoding="async">`
          return [
            `${f.id}  ${f.kind}${f.seconds ? ` ${f.seconds}s` : ''}  ${f.tags.join(' ')}`,
            `  ${url}`,
            film ? `  ${film}` : null,
            f.othersInFrame ? `  ⚠ consent owed: ${f.othersInFrame}` : null,
            `  ${snippet}`
          ].filter(Boolean).join('\n')
        })
        .join('\n\n')
    }
  },

  site_check: {
    description:
      'Run every check the site holds itself to: locale parity, the media couplings, dead links and anchors, ' +
      'alt text, image budgets, page weight and contrast. This is what CI runs.',
    inputSchema: {
      type: 'object',
      properties: { verbose: { type: 'boolean', description: 'Include the notes, not just the verdicts.' } }
    },
    async run({ verbose }) {
      const r = await sh('npm', ['run', 'check'])
      const lines = r.out.split('\n')
      const keep = verbose ? lines.filter((l) => /^(check-|\s+note|\s{2}\S)/.test(l)) : lines.filter((l) => /^check-/.test(l))
      return (r.ok ? '' : 'FAILED\n\n') + keep.join('\n')
    }
  },

  page_weight: {
    description:
      'What a browser downloads before it can paint each page, against the 500 KB budget. Every figure a page ' +
      'places costs about 50 KB, so this is the number that decides how many pictures a page can carry.',
    inputSchema: { type: 'object', properties: {} },
    async run() {
      await sh('npm', ['run', 'docs:build'])
      const r = await sh('node', ['scripts/check-page-weight.mjs'])
      return r.out
    }
  }
}

// ---- the protocol ----------------------------------------------------------

const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n')
const reply = (id, result) => send({ jsonrpc: '2.0', id, result })
const fail = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } })

const rl = createInterface({ input: process.stdin })
rl.on('line', async (line) => {
  if (!line.trim()) return
  let msg
  try { msg = JSON.parse(line) } catch { return }
  const { id, method, params } = msg

  if (method === 'initialize') {
    return reply(id, {
      protocolVersion: params?.protocolVersion ?? '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'titania-media', version: '1.0.0' }
    })
  }
  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return
  if (method === 'ping') return reply(id, {})

  if (method === 'tools/list') {
    return reply(id, {
      tools: Object.entries(TOOLS).map(([name, t]) => ({
        name, description: t.description, inputSchema: t.inputSchema
      }))
    })
  }

  if (method === 'tools/call') {
    const tool = TOOLS[params?.name]
    if (!tool) return fail(id, -32602, `no such tool: ${params?.name}`)
    try {
      const text = await tool.run(params.arguments ?? {})
      return reply(id, { content: [{ type: 'text', text: String(text) }] })
    } catch (err) {
      return reply(id, { content: [{ type: 'text', text: `error: ${err.message}` }], isError: true })
    }
  }

  if (id !== undefined) fail(id, -32601, `unknown method: ${method}`)
})
