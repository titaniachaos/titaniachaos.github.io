import { test } from 'node:test'
import assert from 'node:assert/strict'
import { primaryHeadingCount } from './page-headings.mjs'

test('detects duplicate homepage H1 outside main despite an otherwise valid content landmark', () => {
  assert.equal(primaryHeadingCount('<header><h1>Hero</h1></header><main><h1 class="sr-only">Duplicate</h1></main>'), 2)
})
test('sidebar headings do not affect the single primary heading', () => {
  assert.equal(primaryHeadingCount('<nav><h2>Contents</h2><h3>Section</h3></nav><h1>Hero</h1><main><h2>Offers</h2></main>'), 1)
})
test('ignores example markup in scripts, styles and comments', () => {
  assert.equal(primaryHeadingCount('<script>const example = "<h1>Example</h1>"</script><!-- <h1>Note</h1> --><main><H1>Real</H1></main>'), 1)
})
