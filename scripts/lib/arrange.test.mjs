// The browser's arithmetic must be the build's arithmetic.
//
// queneau.mjs computes an arrangement with the archive in hand; arrange.mjs
// computes it in a browser from a list of ids. Two implementations of one
// bijection is exactly the shape of bug that shows up as "the address you
// shared opens a different page for me", so this walks a spread of addresses
// through both and requires them to agree frame for frame.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { board, space, fill } from './queneau.mjs'
import { fillFrom, addressFrom, spaceOf, turn, nearest, magnitude } from './arrange.mjs'

const state = await board()
const answers = (frame, asked) => frame.tags.filter((t) => asked.includes(t)).length > 0

/** The board as the browser gets it: positions, and the ids that can fill them. */
const positions = state.positions.map((p) => ({
  page: p.page,
  ids: state.all.filter((f) => answers(f, p.asked)).map((f) => f.id)
}))

test('both sides count the same space', () => {
  assert.equal(spaceOf(positions), space(state))
})

test('an address names the same arrangement on both sides', () => {
  const total = spaceOf(positions)
  // A spread rather than the first few: low addresses exercise only the first
  // position, because every later digit is still zero.
  const stride = total / 97n
  let checked = 0
  for (let i = 1n; i <= 97n; i++) {
    const address = (stride * i) % total
    const here = fillFrom(address, positions)
    let there = null
    try {
      there = fill(address, state)
    } catch {
      there = null
    }
    if (here === null) {
      assert.equal(there, null, `${address}: refused here, accepted there`)
      continue
    }
    assert.ok(there, `${address}: accepted here, refused there`)
    assert.deepEqual(
      here.map((c) => c.id),
      there.map((c) => c.id),
      `${address} names two different arrangements`
    )
    checked++
  }
  assert.ok(checked > 40, `only ${checked} of 97 addresses were arrangements`)
})

test('an arrangement returns the address that names it', () => {
  const total = spaceOf(positions)
  for (let i = 1n; i <= 20n; i++) {
    const address = (total / 23n) * i
    const chosen = fillFrom(address, positions)
    if (!chosen) continue
    assert.equal(addressFrom(chosen, positions), address)
  }
})

test('turning one line moves one line', () => {
  const start = nearest(spaceOf(positions) / 7n, positions)
  assert.ok(start !== null, 'there should be an arrangement to start from')
  const before = fillFrom(start, positions)
  assert.ok(before, 'nearest should return an arrangement')

  for (let at = 0; at < positions.length; at++) {
    if (positions[at].ids.length <= 1) continue
    const moved = turn(start, positions, at, 1)
    const after = fillFrom(moved, positions)
    assert.ok(after, `turning position ${at} produced a non-arrangement`)
    if (moved === start) continue // nothing free to turn to; allowed, not silent
    assert.notEqual(after[at].id, before[at].id, `position ${at} did not move`)
    for (let other = 0; other < positions.length; other++) {
      if (other === at) continue
      assert.equal(after[other].id, before[other].id, `turning ${at} also moved ${other}`)
    }
  }
})

test('turning never leaves the space', () => {
  const total = spaceOf(positions)
  let address = nearest(total / 3n, positions)
  assert.ok(address !== null)
  for (let step = 0; step < 40; step++) {
    address = turn(address, positions, step % positions.length, 1)
    assert.ok(address >= 0n && address < total, `left the space at step ${step}`)
    assert.ok(fillFrom(address, positions), `step ${step} is not an arrangement`)
  }
})

test('a wrong address lands somewhere real, and always the same somewhere', () => {
  // Not every number is an arrangement, and a reader arriving on one should
  // not meet an empty page. Deterministic: two readers with the same bad
  // address see the same good one.
  const total = spaceOf(positions)
  for (let i = 1n; i <= 30n; i++) {
    const asked = (total / 31n) * i
    const landed = nearest(asked, positions)
    assert.ok(landed !== null, `${asked} found nowhere to land`)
    assert.ok(fillFrom(landed, positions), `${landed} is not an arrangement`)
    assert.equal(nearest(asked, positions), landed, 'nearest is not deterministic')
  }
})

test('the size is stated in a form a person can hold', () => {
  assert.equal(magnitude(1338n), '1338')
  assert.match(magnitude(spaceOf(positions)), /^\d\.\d\d × 10\^\d+$/)
})
