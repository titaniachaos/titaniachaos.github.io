// One address, one arrangement of the whole archive. A pure function.
//
// Raymond Queneau cut ten sonnets into fourteen strips each and bound them so
// any line could follow any other: `Cent mille milliards de poèmes`, 10^14
// poems, more than a reader could finish in a lifetime. What made it work was
// not the cutting — it was that every line at a given position shared the
// rhyme and the metre of every other, so no substitution could produce
// nonsense.
//
// Tag queries let a section choose among matching archive frames. Explicit
// image ids are fixed editorial choices and contribute exactly one candidate.
// Both are read from the current canonical pages, including nested posts.
// The size of the address space follows these choices rather than an old
// layout or a fixed count of images.
//
// ---- the law it borrows ---------------------------------------------------
//
// From uuidna's app store: *a pure function from states to verifiable output;
// nothing is served that could not be recomputed.* So an arrangement is not
// stored, it is addressed. Given the same archive and source pages, the
// same address recomputes the same arrangement on every machine.
// Nothing here writes a file, chooses randomly, or reads a clock.
//
// The positions come from the pages themselves, never from a list kept here —
// the same rule uuidna's store keeps for its shelves. Add a figure to a page
// and the space grows on the next run.
//
// ---- the law it adds ------------------------------------------------------
//
// **It recombines written words and never invents any.** Every alt text and
// caption in this archive was written by somebody who looked at the picture.
// This may reorder, pair and sequence them. It may not describe a photograph,
// because describing a photograph you have not seen is how you end up
// asserting who is in it — and 51 of these frames have other people in them,
// 12 more are held back by somebody's decision. Both are inputs here, not
// afterthoughts: a draft never appears in any arrangement.

import { statSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { frames as catalogue, derived } from './media-meta.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DOCS = join(ROOT, 'docs')

/**
 * Every explicit image choice or tag query in the canonical pages, in document order.
 *
 * Read off the Markdown rather than declared, so this cannot describe a site
 * that no longer exists. `feed` queries are skipped: they answer from synced
 * posts that only exist for whoever holds a token, so including them would
 * make the space a different size on every machine.
 */
export function positionsFromSource(source, page) {
  const body = source.replace(/<!--[\s\S]*?-->/g, '').replace(/^```[^\n]*\n[\s\S]*?^```.*$/gm, '')
  return [...body.matchAll(/<MediaFigure\b([^>]*?)\/?>/g)].flatMap((match) => {
    const id = /\bid="([^"]+)"/.exec(match[1])?.[1]
    if (id) return [{ page, id, query: `id:${id}`, asked: [] }]
    const query = /\btags="([^"]+)"/.exec(match[1])?.[1]?.trim()
    const asked = query?.split(/\s+/) ?? []
    return !query || asked.includes('feed') ? [] : [{ page, query, asked }]
  })
}

export async function positions(docs = DOCS) {
  const out = []
  async function visit(dir, prefix = '') {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.') || entry.name.startsWith('[')) continue
      if (!prefix && ['de', 'bg', 'public', 'node_modules'].includes(entry.name)) continue
      const path = join(dir, entry.name)
      if (entry.isDirectory()) await visit(path, `${prefix}${entry.name}/`)
      else if (entry.name.endsWith('.md')) {
        const page = `${prefix}${entry.name.replace(/\.md$/, '')}`
        out.push(...positionsFromSource(await readFile(path, 'utf8'), page))
      }
    }
  }
  await visit(docs)
  return out
}

/** Shared tags. Zero means the frame is not an answer to this question at all. */
export const candidatesFor = (all, position) => all.filter((frame) =>
  position.id ? frame.id === position.id : frame.tags.some((tag) => position.asked.includes(tag)))

/**
 * The candidates for each position, and how many there are.
 *
 * Sorted by id, not by their order in the archive: the arrangement an address
 * names must not change because somebody inserted a frame higher up the file.
 * That is the difference between an address and an accident.
 */
export async function board() {
  const all = (await catalogue()).filter((f) => !f.draft && !f.heldBack).sort((a, b) => a.id.localeCompare(b.id))
  const where = await positions()
  return { all, positions: where }
}

/**
 * Size of the mixed-radix address space. Fixed image ids have one candidate.
 * Numbers that repeat an image on the same page remain in this space but are
 * rejected by fill; servable measures their share separately.
 */
export function space({ all, positions }) {
  let total = 1n
  for (const p of positions) {
    const n = candidatesFor(all, p).length
    if (n === 0) return 0n
    total *= BigInt(n)
  }
  return total
}

/**
 * An address becomes an arrangement, by mixed radix.
 *
 * Each position consumes as many digits as it has candidates: index = address
 * mod n, then address /= n. The classic way to number a product of unequal
 * sets, and it is a bijection — which is why `addressOf` can run it backwards
 * and get the number it started from.
 *
 * Candidate lists remain fixed; a repeated frame on one page is rejected.
 * This keeps addresses reversible without silently substituting another image.
 */
export function fill(address, { all, positions }) {
  let rest = BigInt(address)
  if (rest < 0n) throw new Error('an address is not negative')
  // Before anything else. The space is divisible by every radix, so an address
  // exactly one past the end behaves like zero at each step and would be
  // refused for repeating a picture — a true complaint about the wrong thing.
  if (rest >= space({ all, positions })) throw new Error('that address is past the end of the space')
  const used = new Map()
  const chosen = []

  for (const p of positions) {
    // The candidate list does not depend on what came before it. That is the
    // whole of why an address means one thing: if taking a frame could shrink
    // a later position's list, the radix would depend on the path and the
    // same number would name different arrangements on different pages.
    const candidates = candidatesFor(all, p)
    if (candidates.length === 0) throw new Error(`${p.page}: nothing answers "${p.query}"`)
    const n = BigInt(candidates.length)
    const frame = candidates[Number(rest % n)]
    rest /= n

    const taken = used.get(p.page) ?? new Set()
    if (taken.has(frame.id)) {
      // Some addresses name a page that would show one picture twice. They are
      // refused rather than nudged to the next free frame: nudging would make
      // two addresses mean one arrangement, and an address that is not unique
      // is not worth printing on anything.
      throw new Error(
        `address ${address} repeats ${frame.id} on ${p.page} — not every number is an arrangement`
      )
    }
    taken.add(frame.id)
    used.set(p.page, taken)
    chosen.push({ ...p, id: frame.id, frame })
  }

  if (rest !== 0n) throw new Error('that address is past the end of the space')
  return chosen
}

/** The same journey backwards: an arrangement returns the address that names it. */
export function addressOf(chosen, { all, positions }) {
  let address = 0n
  let place = 1n
  for (let i = 0; i < positions.length; i++) {
    const candidates = candidatesFor(all, positions[i])
    const at = candidates.findIndex((f) => f.id === chosen[i].id)
    if (at < 0) throw new Error(`${chosen[i].id} is not a candidate at position ${i}`)
    address += BigInt(at) * place
    place *= BigInt(candidates.length)
  }
  return address
}

/**
 * How many of the numbers in the space are arrangements.
 *
 * Most are; a few name a page that would show one picture twice. Measured by
 * sampling rather than counted exactly, because counting exactly means walking
 * 10^29 numbers.
 */
export function servable(state, sample = 400) {
  let ok = 0
  let tried = 0
  for (const step of walk(state, sample)) {
    tried++
    if (step.arrangement) ok++
  }
  return tried ? ok / tried : 0
}

/**
 * Deterministic addresses spread across the whole space.
 *
 * Getting this wrong reports 0% three different ways, and each one looks like
 * a broken design rather than a broken sample:
 *
 *   a small multiple of a small number is a small number, and the first
 *   thirteen radices already multiply to 4.5e19 — so any address below that is
 *   spent before the last positions, leaving them all on index 0, which is the
 *   same frame for every query sharing a first candidate;
 *
 *   evenly spaced probes, `total * i / n`, are congruent to zero in the early
 *   digits, because total is divisible by every radix;
 *
 *   consecutive addresses near the top share every high digit, so the late
 *   positions never move while the early ones do.
 *
 * A stride of about 0.618 of the space, kept odd, moves every digit at once.
 */
export function* walk(state, count, onlyValid = false) {
  const total = space(state)
  if (total === 0n) return
  const gcd = (a, b) => b === 0n ? a : gcd(b, a % b)
  let stride = ((total * 618033988749894848204586n) / 1000000000000000000000000n) | 1n
  while (gcd(stride, total) !== 1n) stride += 2n
  let given = 0
  for (let i = 1; given < count && i <= count * 20 && BigInt(i) <= total; i++) {
    const address = (BigInt(i) * stride) % total
    try {
      const arrangement = fill(address, state)
      given++
      yield { address, arrangement }
    } catch (why) {
      if (onlyValid) continue
      given++
      yield { address, arrangement: null, why: why.message }
    }
  }
}

/**
 * What each page of an arrangement would cost in pictures.
 *
 * Not every arrangement fits: the budget is 500 KB a page and the pictures are
 * most of it, so an address can name a page too heavy to serve. Reporting it
 * rather than forbidding it keeps `fill` a bijection — the caller decides
 * whether to step to the next address or show it anyway.
 */
export function weigh(chosen) {
  const bytes = new Map()
  for (const c of chosen) {
    let size = 0
    try {
      size = statSync(join(ROOT, 'docs/public', derived(c.frame).wide)).size
    } catch {
      /* not derived yet; counts as nothing rather than throwing */
    }
    bytes.set(c.page, (bytes.get(c.page) ?? 0) + size)
  }
  return bytes
}
