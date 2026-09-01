// What a keyword path has to guarantee before anything serves one.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shelf, canonical, resolve, paths, unreachable, ENOUGH } from './browse.mjs'

const state = await shelf()

test('a path is a question the archive can answer', () => {
  const found = resolve(['street', 'portrait'], state)
  assert.equal(found.path, '/portrait/street', 'alphabetical, so it survives a reordering of TAGS')
  assert.ok(found.frames.length > 0)
  for (const f of found.frames) {
    assert.ok(f.tags.includes('street') && f.tags.includes('portrait'), `${f.id} does not carry both`)
  }
})

test('the same question has exactly one URL', () => {
  // Otherwise a faceted index invents a factorial of duplicate pages.
  const a = resolve(['street', 'portrait'], state)
  const b = resolve(['portrait', 'street'], state)
  assert.equal(a.path, b.path)
  assert.deepEqual(a.frames.map((f) => f.id), b.frames.map((f) => f.id))
})

test('a word the archive does not know is not a path', () => {
  assert.equal(resolve(['street', 'porcelain'], state), null)
  assert.equal(resolve([], state), null)
  assert.equal(resolve(['STREET'], state).path, '/street', 'case is forgiven')
})

test('feed is never a path', () => {
  // It answers from synced posts that exist only with a token, so the page
  // would be different on every machine and empty on most.
  assert.equal(resolve(['feed'], state), null)
})

test('duplicated words collapse rather than narrowing twice', () => {
  assert.equal(resolve(['street', 'street'], state).path, '/street')
})

test('every path worth building has enough on it to be a page', () => {
  for (const p of paths(state)) {
    assert.ok(p.frames.length >= ENOUGH, `${p.path} has only ${p.frames.length}`)
  }
})

test('and together they reach every published frame', () => {
  // The point of the whole exercise. 106 frames were shipped and rendered
  // nowhere before this existed; a browse surface that leaves any of them
  // unreachable has not fixed the thing it was built to fix.
  assert.deepEqual(unreachable(state), [], 'some frames are reachable by no path')
})

test('the space is bounded and small', () => {
  // The bound that matters is the vocabulary, not the threshold. Thirteen
  // words cannot make more than a couple of hundred answerable questions
  // however low the bar goes, which is what keeps this a faceted index rather
  // than a page generator.
  const all = paths(state, 1)
  assert.ok(all.length < 200, `${all.length} paths is more than a browse surface`)
})

test('every question the archive can answer has a page', () => {
  // This used to assert the opposite -- that the threshold excluded the thin
  // ones. It did, and they were answered by the 404 handler instead, which in
  // this theme has no sidebar, no outline and a narrower container: a real
  // listing arrived wearing a different template. Which pages are worth
  // pre-rendering and which addresses are worth answering turned out to be
  // two questions, and only the first one was ever about thinness.
  assert.equal(
    paths(state).length,
    paths(state, 1).length,
    'a question with something in it is not being built'
  )
})

test('no path returns a draft or a held-back frame', () => {
  for (const p of paths(state, 1)) {
    for (const f of p.frames) {
      assert.ok(!f.draft, `${f.id} is a draft and appears on ${p.path}`)
    }
  }
})

test('paths are derived from the vocabulary, not from a list', () => {
  // A word added to TAGS opens its paths on the next run; a word nothing
  // carries opens none.
  const words = new Set(paths(state, 1).flatMap((p) => p.want))
  for (const w of words) assert.ok(state.words.includes(w), `${w} is not in the vocabulary`)
})
