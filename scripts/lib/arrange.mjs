// The address arithmetic, with nothing around it.
//
// queneau.mjs owns the archive: it reads the pages, works out what each
// section asks, and gathers the frames that answer. That needs a filesystem.
// This is the part that has to run in a browser as well — turning a number
// into an arrangement and back — so it takes the board as data and imports
// nothing.
//
// Both sides use this. The reader turning a line and the build checking the
// space are running the same function, which is the only way the address on
// screen can be trusted to mean the same thing tomorrow.

/**
 * An address becomes an arrangement, by mixed radix.
 *
 * Each position consumes as many digits as it has candidates: index = address
 * mod n, then address /= n. A bijection, which is why `addressOf` runs it
 * backwards and gets the number it started from.
 *
 * Returns null rather than throwing when the address names a page that would
 * show one picture twice. Those numbers are not arrangements — refused rather
 * than nudged to the next free frame, because nudging makes two addresses mean
 * one arrangement, and an address that is not unique is not worth printing on
 * anything.
 */
export function fillFrom(address, positions) {
  return inspect(address, positions).chosen
}

/**
 * The same walk, but it says where it stopped.
 *
 * `{ chosen }` when the address is an arrangement, `{ conflictAt }` when a
 * page would show one picture twice and at which position it happened.
 * `nearest` needs the position: an address is a mixed-radix number, so adding
 * one only ever moves its lowest digit, and a repeat at position twelve is
 * untouched by any number of increments a reader would wait for.
 */
export function inspect(address, positions) {
  let rest = BigInt(address)
  if (rest < 0n || rest >= spaceOf(positions)) return { chosen: null }

  const used = new Map()
  const chosen = []

  for (let at = 0; at < positions.length; at++) {
    const position = positions[at]
    const n = BigInt(position.ids.length)
    if (n === 0n) return { chosen: null }
    const id = position.ids[Number(rest % n)]
    rest /= n

    const taken = used.get(position.page) ?? new Set()
    if (taken.has(id)) return { chosen: null, conflictAt: at }
    taken.add(id)
    used.set(position.page, taken)
    chosen.push({ ...position, id })
  }

  return { chosen: rest === 0n ? chosen : null }
}

/** The same journey backwards. */
export function addressFrom(chosen, positions) {
  let address = 0n
  let place = 1n
  for (let i = 0; i < positions.length; i++) {
    const at = positions[i].ids.indexOf(chosen[i].id)
    if (at < 0) return null
    address += BigInt(at) * place
    place *= BigInt(positions[i].ids.length)
  }
  return address
}

/** How many numbers the space holds, arrangements and refusals together. */
export function spaceOf(positions) {
  let total = 1n
  for (const position of positions) {
    if (position.ids.length === 0) return 0n
    total *= BigInt(position.ids.length)
  }
  return total
}

/**
 * The first arrangement at or after an address.
 *
 * Most numbers are arrangements and a few are not, so a reader arriving with
 * an address out of a link — or an old one, or a mistyped one — needs somewhere
 * to land. Walking forward is deterministic: the same wrong address sends
 * everybody to the same right one. It gives up rather than scanning the whole
 * space, which is 10^29 long.
 */
export function nearest(address, positions, tries = 256) {
  const total = spaceOf(positions)
  if (total === 0n) return null
  let at = ((BigInt(address) % total) + total) % total

  for (let step = 0; step < tries; step++) {
    const seen = inspect(at, positions)
    if (seen.chosen) return at
    if (seen.conflictAt === undefined) return null
    // Move the digit that actually clashed, and only that one. 61% of numbers
    // are arrangements, so this lands almost at once; walking `+1` instead
    // moved the lowest digit and could not reach a repeat further along, which
    // is why it used to give up after 512 steps on a space that was mostly
    // valid.
    at = turnDigit(at, positions, seen.conflictAt, 1n)
  }
  return null
}

/** One digit of the mixed-radix address, moved by `by`, wrapping in place. */
function turnDigit(address, positions, at, by) {
  const n = BigInt(positions[at].ids.length)
  if (n <= 1n) return BigInt(address)
  let place = 1n
  for (let i = 0; i < at; i++) place *= BigInt(positions[i].ids.length)
  const current = (BigInt(address) / place) % n
  const next = (((current + by) % n) + n) % n
  return BigInt(address) + (next - current) * place
}

/**
 * Turn one line, the way Queneau's reader turns one strip.
 *
 * Takes an address that is already an arrangement and returns one that is —
 * the caller holds a valid address at all times, which is what `nearest` is
 * for at the start.
 *
 * Arithmetic, not a redraw: moving position `at` by `by` steps changes exactly
 * that digit of the address and leaves every other line where it was. It walks
 * on past a choice that would repeat a picture on its page, and gives up after
 * a full turn of that position rather than looping forever.
 */
export function turn(address, positions, at, by = 1) {
  const n = BigInt(positions[at].ids.length)
  if (n <= 1n) return BigInt(address)

  for (let move = 1n; move <= n; move++) {
    const candidate = turnDigit(address, positions, at, BigInt(by) * move)
    if (fillFrom(candidate, positions)) return candidate
  }
  return BigInt(address)
}

/**
 * A readable name for a number with thirty digits in it.
 *
 * `1.33 × 10^29` is a size a person can hold; the digits are not. The exact
 * address is still shown, because that is the thing you can share.
 */
export function magnitude(n) {
  const digits = n.toString()
  if (digits.length <= 4) return digits
  const lead = `${digits[0]}.${digits.slice(1, 3)}`
  return `${lead} × 10^${digits.length - 1}`
}
