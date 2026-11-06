import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createMarkdownRenderer } from 'vitepress'
import { authoredSearchContent } from './search-content.mjs'

for (const [locale, term] of [['de/', 'Unternehmen'], ['', 'Companies'], ['bg/', 'фирми']]) {
  test(`corporate search includes the ${locale || 'English'} page title before section-only content`, async () => {
    const md = await createMarkdownRenderer(process.cwd() + '/docs')
    const src = await readFile(new URL(`../../docs/${locale}corporate.md`, import.meta.url), 'utf8')
    const env = {}
    const rendered = md.render(src, env)
    const search = authoredSearchContent(rendered, env.frontmatter.title)
    assert.ok(search.startsWith('<h1>'))
    assert.ok(search.slice(0, search.indexOf('</h1>')).includes(term))
    assert.ok(search.includes('href="#VPContent"'))
    assert.ok(search.endsWith(rendered), 'visible page HTML is not rewritten')
  })
}
test('normal anchored Markdown pages and generated browse pages remain unchanged', () => {
  const html = '<h1 id="title">Page<a class="header-anchor" href="#title">#</a></h1><p>Body</p>'
  assert.equal(authoredSearchContent(html, 'Metadata title'), html)
  assert.equal(authoredSearchContent('<p>No heading</p>', 'Title'), '<p>No heading</p>')
})
