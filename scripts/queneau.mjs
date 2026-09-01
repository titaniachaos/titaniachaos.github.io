#!/usr/bin/env node
// Prints an arrangement of the archive, by address.
//
//   node scripts/queneau.mjs              the size of the space, and one arrangement
//   node scripts/queneau.mjs <address>    that arrangement, exactly, forever
//   node scripts/queneau.mjs --walk 5     five of them, with their addresses
//   node scripts/queneau.mjs --lang de    the words in German
//
// Nothing here writes a file, reads a clock or chooses randomly. Two people
// running the same address get the same pages, on any machine, next year.

import { board, space, fill, addressOf, weigh, walk, servable } from './lib/queneau.mjs'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const at = args.indexOf(name)
  return at < 0 ? fallback : args[at + 1]
}
const lang = flag('--lang', 'en')
const many = Number(flag('--walk', 0))
const given = args.find((a) => /^\d+$/.test(a))

const state = await board()
const total = space(state)
const BUDGET = 500 * 1024
const PAGE_FURNITURE = 180 * 1024 // fonts, CSS, JS — what is left is for pictures

const show = (address, chosen) => {
  const bytes = weigh(chosen)
  console.log(`\naddress ${address}`)
  let page = null
  for (const c of chosen) {
    if (c.page !== page) {
      page = c.page
      const kb = Math.round((bytes.get(page) ?? 0) / 1024)
      const room = (bytes.get(page) ?? 0) + PAGE_FURNITURE > BUDGET ? '  OVER BUDGET' : ''
      console.log(`\n  /${page}   ${kb} KB of pictures${room}`)
    }
    console.log(`    ${c.query.padEnd(28)} ${c.id}`)
    console.log(`      ${(c.frame.alt[lang] ?? c.frame.alt.en).slice(0, 92)}`)
  }
}

console.log(`queneau: ${state.positions.length} positions, ${state.all.length} published frames`)
console.log(`  ${total} arrangements`)
console.log(`  ${Math.round(Math.log2(Number(total)) * 10) / 10} bits to address one — a uuid carries 122`)

if (given) {
  show(BigInt(given), fill(BigInt(given), state))
} else if (many > 0) {
  console.log(`  ${(servable(state, 200) * 100).toFixed(0)}% of numbers are arrangements; the rest would repeat a picture`)
  for (const { address, arrangement } of walk(state, many, true)) show(address, arrangement)
} else {
  const first = [...walk(state, 1, true)][0]
  show(first.address, first.arrangement)
  console.log(`\n  round trip: ${addressOf(first.arrangement, state) === first.address}`)
  console.log('  try:  node scripts/queneau.mjs --walk 3')
}
