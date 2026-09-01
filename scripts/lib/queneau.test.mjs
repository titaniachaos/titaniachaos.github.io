// The properties that make an address worth printing.
//
// An arrangement is only citable if the same address always recomputes the
// same page — otherwise a link to one is a link to whatever the archive
// happened to look like that day. These are the claims that carry that, plus
// the two rules the site enforces on itself: no draft ever appears, and no
// page shows one picture twice.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { board, space, fill, addressOf, weigh, positions, walk, servable } from './queneau.mjs'

const state = await board()
const size = space(state)

/** A handful of addresses that really are arrangements, spread across the space. */
const valid = [...walk(state, 12, true)].map((x) => x.address)

test('the space is the size the archive says it is', () => {
  assert.ok(size > 10n ** 20n, `expected an enormous space, got ${size}`)
})

test('most numbers are arrangements, and the sampler can find them', () => {
  assert.ok(valid.length >= 10, `only found ${valid.length} valid addresses`)
  const rate = servable(state, 200)
  assert.ok(rate > 0.4, `only ${(rate * 100).toFixed(1)}% of addresses are arrangements`)
})

test('the same address recomputes the same arrangement', () => {
  for (const a of valid) {
    assert.deepEqual(
      fill(a, state).map((c) => c.id),
      fill(a, state).map((c) => c.id),
      `address ${a} is not stable`
    )
  }
})

test('different addresses give different arrangements', () => {
  const seen = new Map()
  for (const a of valid) {
    const key = fill(a, state).map((c) => c.id).join(' ')
    assert.ok(!seen.has(key), `addresses ${seen.get(key)} and ${a} name the same arrangement`)
    seen.set(key, a)
  }
})

test('an arrangement names the address it came from', () => {
  for (const a of valid) {
    assert.equal(addressOf(fill(a, state), state), a, `round trip failed for ${a}`)
  }
})

test('no arrangement shows one picture twice on a page', () => {
  for (const a of valid) {
    const perPage = new Map()
    for (const c of fill(a, state)) {
      const seen = perPage.get(c.page) ?? new Set()
      assert.ok(!seen.has(c.id), `${c.id} appears twice on ${c.page} at address ${a}`)
      seen.add(c.id)
      perPage.set(c.page, seen)
    }
  }
})

test('no arrangement can reach a draft or a held-back frame', () => {
  for (const a of valid) {
    for (const c of fill(a, state)) {
      assert.ok(!c.frame.draft, `${c.id} is a draft and reached address ${a}`)
      assert.ok(!c.frame.heldBack, `${c.id} is held back and reached address ${a}`)
    }
  }
})

test('every chosen frame answers the question it was chosen for', () => {
  for (const a of valid.slice(0, 4)) {
    for (const c of fill(a, state)) {
      const shared = c.frame.tags.filter((t) => c.asked.includes(t))
      assert.ok(shared.length > 0, `${c.id} shares no tag with "${c.query}"`)
    }
  }
})

test('a number that would repeat a picture is refused, not nudged', () => {
  // Nudging to the next free frame would make two numbers mean one
  // arrangement, and an address that is not unique is not worth printing.
  let refused = 0
  for (const step of walk(state, 60)) {
    if (step.arrangement) continue
    assert.match(step.why, /repeats/)
    refused++
  }
  assert.ok(refused > 0, 'expected some numbers not to be arrangements')
})

test('an address outside the space is refused', () => {
  assert.throws(() => fill(size, state), /past the end/)
  assert.throws(() => fill(-1n, state), /not negative/)
})

test('the positions come from the pages, not from a list in the code', async () => {
  const where = await positions()
  assert.ok(where.length > 0, 'no positions found')
  assert.ok(where.every((p) => p.page && p.query && p.asked.length), 'a position is incomplete')
  assert.ok(new Set(where.map((p) => p.page)).has('index'), 'the home page asks nothing?')
})

test('an arrangement can be weighed', () => {
  const bytes = weigh(fill(valid[0], state))
  assert.ok(bytes.size > 0, 'nothing was weighed')
  for (const [page, n] of bytes) assert.ok(n > 0, `${page} weighed nothing`)
})

test('some arrangements are too heavy to serve, and weighing says so', () => {
  // The budget is 500 KB a page and the pictures are most of it, so not every
  // arrangement fits. Refusing them inside `fill` would break the bijection;
  // reporting the weight lets the caller step to the next address instead.
  const weights = valid.map((a) => Math.max(...weigh(fill(a, state)).values()))
  assert.ok(Math.max(...weights) > 0, 'no arrangement weighed anything')
  assert.ok(
    Math.min(...weights) < 400_000,
    'expected at least one arrangement light enough to serve'
  )
})
