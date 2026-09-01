// A path is a question. Split it on `/` and every segment is a word the
// archive knows.
//
//   /portrait                    54 frames
//   /portrait/street             21
//   /performance/portrait/street  8
//
// The address does not have to be opaque. A uuid names an arrangement nobody
// can guess and nobody can want; `/street/portrait` names street portraits,
// which is a thing a person might type, a thing a link can promise, and a
// thing a search engine can rank for a reason. Same idea — content computed
// from an address rather than stored — with the address made of words.
//
// ---- what makes it bounded ------------------------------------------------
//
// Thirteen words, so 8191 possible paths, of which 90 have anything in them
// and 42 have three frames or more. That is the whole space: not an infinite
// surface of near-identical pages, which is what an unbounded generator would
// have produced and what search engines rightly demote. It is closer to a
// faceted index than to a page generator.
//
// Two rules keep it honest:
//
//   AND, not OR. `/street/portrait` is the frames carrying both. Or-semantics
//   would make nearly every path return nearly everything, and 8191 pages that
//   all say the same thing is exactly the failure to avoid.
//
//   One order only, and it is alphabetical. `/street/portrait` and
//   `/portrait/street` are the same question, so only one of them is a path;
//   the other is a redirect, not a second page. Faceted indexes that skip this
//   invent a factorial of duplicates. Alphabetical rather than the
//   vocabulary's own order, because TAGS is a curated sequence somebody may
//   rearrange one day — and a URL that changes when a list is reordered was
//   never an address.

import { frames as catalogue, vocabulary } from './media-meta.mjs'

/**
 * How many frames a question needs before it gets a page of its own.
 *
 * One. It was three, on the reasoning that a page with one picture is not a
 * page -- and that is a judgement about which pages are worth pre-rendering,
 * not about which addresses are worth answering. The 48 questions below the
 * line were answered by the 404 handler instead, and a 404 in this theme has
 * no sidebar, no outline and a narrower container, so a real listing arrived
 * wearing a different template. Measured on the workspace next door, where
 * the same fault was visible: content at 256px against 336px, no aside, no
 * `.VPDoc`.
 *
 * So every answerable question is a page, and the 404 is left for words the
 * archive does not use. 90 questions rather than 42.
 */
export const ENOUGH = 1

/**
 * How many frames one listing shows.
 *
 * `/portrait` answers with 54 and a page of 54 pictures blows the 500 KB
 * budget in tiles alone. Truncating is the obvious fix and the obvious fix
 * loses frames: cutting each listing at eighteen in archive order leaves seven
 * of the 120 reachable from nowhere, which is the exact failure this whole
 * surface exists to end.
 *
 * So the order is not arbitrary. Each listing leads with the frames that
 * appear on the FEWEST other listings, and the tail it cuts is the frames you
 * will meet again on a neighbouring path. At eighteen — at ten, in fact —
 * every one of the 120 is still reachable.
 */
export const SHOWN = 18

/**
 * The archive as this asks about it: published frames, and the words that can
 * appear in a path.
 *
 * `feed` is not one of them. It answers from synced posts that exist only for
 * whoever holds a token, so a path built on it would be a different page on
 * every machine and empty on most.
 */
export async function shelf() {
  const words = (await vocabulary()).filter((w) => w !== 'feed')
  const frames = (await catalogue()).filter((f) => !f.draft)
  return { words, frames }
}

/**
 * The canonical form of a path, or null if it is not one.
 *
 * Unknown words make it null rather than being ignored: `/street/porcelain`
 * should be a 404, not a silent `/street`. Duplicates collapse, and the order
 * is alphabetical, so every question has exactly one URL.
 */
export function canonical(segments, { words }) {
  const asked = segments.map((s) => String(s).toLowerCase().trim()).filter(Boolean)
  if (asked.length === 0) return null
  if (asked.some((s) => !words.includes(s))) return null
  return [...new Set(asked)].sort()
}

/** The frames carrying every word asked for. */
export function resolve(segments, shelfState) {
  const want = canonical(segments, shelfState)
  if (!want) return null
  const frames = shelfState.frames.filter((f) => want.every((w) => f.tags.includes(w)))
  return { path: '/' + want.join('/'), want, frames }
}

/**
 * Every path worth building, richest first.
 *
 * Walks the subsets of the vocabulary rather than a list, so a new word in
 * `TAGS` opens its paths on the next run and a word nothing carries opens
 * none. Thirteen words is 8191 subsets, which is nothing to enumerate.
 */
/**
 * The frames of one listing, rarest first.
 *
 * Rarity is counted over the listings themselves, so it answers "where else
 * could somebody meet this picture?" rather than anything about the picture.
 */
export function ordered(found, shelfState, min = ENOUGH) {
  const appears = new Map()
  for (const p of paths(shelfState, min)) {
    for (const f of p.frames) appears.set(f.id, (appears.get(f.id) ?? 0) + 1)
  }
  return [...found.frames].sort(
    (a, b) => (appears.get(a.id) ?? 0) - (appears.get(b.id) ?? 0) || a.id.localeCompare(b.id)
  )
}

export function paths(shelfState, min = ENOUGH) {
  const { words } = shelfState
  const out = []
  for (let mask = 1; mask < 1 << words.length; mask++) {
    const want = words.filter((_, i) => mask & (1 << i))
    const found = resolve(want, shelfState)
    if (found.frames.length >= min) out.push(found)
  }
  return out.sort((a, b) => b.frames.length - a.frames.length || a.path.localeCompare(b.path))
}

/**
 * Which frames no path of this size would reach.
 *
 * The number that matters. A browse surface that leaves photographs
 * unreachable is the state this replaced — 106 of them shipped and rendered
 * nowhere — and raising the threshold to tidy away thin pages is
 * exactly how that happens again.
 */
export function unreachable(shelfState, min = ENOUGH, shown = SHOWN) {
  const reached = new Set(
    paths(shelfState, min).flatMap((p) => ordered(p, shelfState, min).slice(0, shown).map((f) => f.id))
  )
  return shelfState.frames.filter((f) => !reached.has(f.id)).map((f) => f.id)
}
