import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeMediaRecords } from './media-import.mjs'

async function fixture(t, data = `const FRAMES: Frame[] = [\n  { id: 'old', tags: ['portrait'], caption: 'a ] and } in a string' }\n]\n\nconst LATER = [{ id: 'later' }]\n`) {
  const dir = await mkdtemp(join(tmpdir(), 'titania-import-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const makePath = join(dir, 'make.mjs'), dataPath = join(dir, 'data.ts')
  await writeFile(makePath, "const IMPORTED = {\n  'old': 'old.jpg',\n}\n")
  await writeFile(dataPath, data)
  return { dir, makePath, dataPath, mapName: 'IMPORTED', id: 'new', entry: "  'new': 'new.jpg',\n", record: "  { id: 'new', tags: ['portrait'] }" }
}

test('imports inside FRAMES despite nested brackets, strings and later catalogues', async t => {
  const f = await fixture(t)
  await writeMediaRecords(f)
  const data = await readFile(f.dataPath, 'utf8')
  assert.match(await readFile(f.makePath, 'utf8'), /'new': 'new.jpg'/)
  assert.match(data, /string' },\n  \{ id: 'new'/)
  assert.match(data, /id: 'new'[^]*?\n\]\n\nconst LATER/)
  const before = [await readFile(f.makePath, 'utf8'), data]
  await assert.rejects(writeMediaRecords(f), /already exists/)
  assert.deepEqual([await readFile(f.makePath, 'utf8'), await readFile(f.dataPath, 'utf8')], before)
})

for (const data of ['const LATER = []', 'const FRAMES: Frame[] = [\n { tags: [] }']) {
  test('invalid catalogue leaves source map, catalogue and downloaded original untouched', async t => {
    const f = await fixture(t, data)
    const source = join(f.dir, 'download.jpg'), kept = join(f.dir, 'imported', 'new.jpg')
    await writeFile(source, 'fixture image')
    const before = await readFile(f.makePath, 'utf8')
    await assert.rejects(writeMediaRecords({ ...f, sourceCopy: { from: source, to: kept } }), /FRAMES/)
    assert.equal(await readFile(f.makePath, 'utf8'), before)
    assert.equal(await readFile(f.dataPath, 'utf8'), data)
    await assert.rejects(access(kept))
  })
}

test('empty frame array accepts its first record without a leading comma', async t => {
  const f = await fixture(t, 'const FRAMES: Frame[] = []\n')
  await writeMediaRecords(f)
  assert.match(await readFile(f.dataPath, 'utf8'), /= \[\n  \{ id: 'new'/)
})
