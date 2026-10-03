import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crossesSiteBoundary, installSiteNavigation } from '../../docs/.vitepress/theme/site-navigation.mjs'

for (const base of ['/', '/clown/', '/aequator/']) {
  for (const target of ['/', '/clown/', '/aequator/']) {
    test(`${base} → ${target}: route ownership in every language`, () => {
      for (const language of ['', 'bg/', 'de/']) {
        assert.equal(crossesSiteBoundary(`${target}${language}concept?from=projects#solo`,
          `https://titaniachaos.com${base}`, base), base !== target)
      }
    })
  }
}
test('external hosts and similarly named routes remain unaffected', () => {
  assert.equal(crossesSiteBoundary('https://example.com/clown/', 'https://titaniachaos.com/', '/'), false)
  assert.equal(crossesSiteBoundary('/clowning', 'https://titaniachaos.com/', '/'), false)
  assert.equal(crossesSiteBoundary('#solo', 'https://titaniachaos.com/projects', '/'), false)
  assert.equal(crossesSiteBoundary('/clown', 'https://titaniachaos.com/', '/'), true)
})
test('crossing loads the document, preserves query/hash, and cancels the router', async () => {
  let assigned
  const router = {}
  installSiteNavigation(router, '/', { href: 'https://titaniachaos.com/projects', assign: url => assigned = url })
  assert.equal(await router.onBeforeRouteChange('/clown/bg/?a=1#work'), false)
  assert.equal(assigned, 'https://titaniachaos.com/clown/bg/?a=1#work')
})
test('internal routing preserves an existing hook', async () => {
  const router = { onBeforeRouteChange: href => href === '/projects' ? false : undefined }
  installSiteNavigation(router, '/', { href: 'https://titaniachaos.com/', assign: () => assert.fail() })
  assert.equal(await router.onBeforeRouteChange('/projects'), false)
  assert.equal(await router.onBeforeRouteChange('/about-titania'), undefined)
})
