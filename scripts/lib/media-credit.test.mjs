import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PHOTOGRAPHERS } from '../../docs/.vitepress/site-copy.ts'
import { context, xmp } from './media-meta.mjs'

test('exports the complete shared footer credit, including its final photographers', async () => {
  const meta = await context()
  assert.equal(meta.credit, PHOTOGRAPHERS)
  assert.match(meta.credit, /Krasimir Stoichkov and Laurent Ziegler$/)
  assert.match(meta.rights, /Laurent Ziegler\.$/)
  const packet = xmp({ id: 'fixture', kind: 'photo', tags: [], alt: {}, caption: {} }, meta)
  assert.match(packet, /Krasimir Stoichkov and Laurent Ziegler/)
  assert.doesNotMatch(packet, /, \./)
})
