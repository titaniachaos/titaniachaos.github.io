import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { board, positions, positionsFromSource, candidatesFor, space, walk, servable, fill, addressOf } from './queneau.mjs'
import { fillFrom } from './arrange.mjs'

test('discovers fixed ids and tag queries in source order, ignoring examples and feeds', () => {
  const source = '<MediaFigure lang="en"\n id="chosen" />\n<MediaFigure lang="en" tags="stage  performance" />\n<MediaFigure tags="feed" />\n<!-- <MediaFigure id="comment" /> -->\n```vue\n<MediaFigure id="example" />\n```'
  assert.deepEqual(positionsFromSource(source, 'blog/post'), [
    { page: 'blog/post', id: 'chosen', query: 'id:chosen', asked: [] },
    { page: 'blog/post', query: 'stage  performance', asked: ['stage', 'performance'] }
  ])
})

test('discovers nested canonical pages without counting translations or route templates', async t => {
  const root = await mkdtemp(join(tmpdir(), 'queneau-pages-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const dir of ['blog', 'de', 'bg', '.vitepress']) await mkdir(join(root, dir))
  for (const file of ['index.md', 'blog/visit.md', 'de/index.md', 'bg/index.md', '.vitepress/example.md', '[tags].md']) {
    await writeFile(join(root, file), '<MediaFigure id="photo" />')
  }
  assert.deepEqual((await positions(root)).map(p => p.page), ['blog/visit', 'index'])
})

test('fixed editorial choices retain their exact images in build and browser arithmetic', async () => {
  const live = await board()
  assert.ok(live.positions.length > 0)
  const browser = live.positions.map(p => ({ ...p, ids: candidatesFor(live.all, p).map(f => f.id) }))
  const chosen = fill(0n, live)
  assert.deepEqual(chosen.map(c => c.id), fillFrom(0n, browser).map(c => c.id))
  for (const c of chosen) if (c.query.startsWith('id:')) assert.equal(c.id, c.query.slice(3))
  assert.equal(addressOf(chosen, live), 0n)
})

test('a fixed one-choice board is sampled once and has a 100% success rate', () => {
  const state = { all: [{ id: 'one', tags: [] }], positions: [{ page: 'page', id: 'one', query: 'id:one', asked: [] }] }
  assert.equal(space(state), 1n)
  assert.deepEqual([...walk(state, 20)].map(x => x.address), [0n])
  assert.equal(servable(state, 20), 1)
})

test('a missing fixed id yields no address and no division by zero', () => {
  const state = { all: [], positions: [{ page: 'page', id: 'missing', query: 'id:missing', asked: [] }] }
  assert.equal(space(state), 0n)
  assert.deepEqual([...walk(state, 10)], [])
  assert.equal(servable(state, 10), 0)
})

test('a mixed fixed/tag choice cannot repeat a photo on the same page', () => {
  const state = { all: [{ id: 'one', tags: ['stage'] }, { id: 'two', tags: ['stage'] }], positions: [
    { page: 'page', id: 'one', query: 'id:one', asked: [] },
    { page: 'page', query: 'stage', asked: ['stage'] }
  ] }
  assert.throws(() => fill(0n, state), /repeats/)
  assert.deepEqual(fill(1n, state).map(c => c.id), ['one', 'two'])
  assert.equal(servable(state, 20), 0.5)
})

test('CLI treats --walk count as an option, not an arrangement address', async () => {
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const script = new URL('../queneau.mjs', import.meta.url)
  const { stdout } = await promisify(execFile)(process.execPath, [script.pathname, '--walk', '3', '--lang', 'de'])
  const count = (stdout.match(/^address \d+$/gm) ?? []).length
  assert.ok(count > 0 && count <= 3, `unexpected sample count: ${count}`)
})
