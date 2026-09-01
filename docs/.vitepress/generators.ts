import { existsSync, readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SiteConfig } from 'vitepress'
import { HOSTNAME, LOCALES, splitLocale } from './seo.ts'
import { COPY } from './site-copy.ts'
import { atom } from './feed.ts'

/**
 * Build-time integrations, in Astro's shape: a named object with a `hooks` map.
 *
 * The shape is borrowed; the hooks are VitePress's own. Nothing here replaces a
 * VitePress mechanism — `sitemap` still enumerates the pages and writes the
 * XML, and the hreflang integration only enriches each item through the
 * documented `transformItems`. Files VitePress does not generate come from
 * `buildEnd`, the hook meant for them.
 *
 * The Clown subsite carries the same module, so both sites extend VitePress the
 * same way and a reader who learns one has learned the other.
 */

/** The Clown project, served from a sub-path of this host. */
const CLOWN = `${HOSTNAME}/clown/`

/**
 * Relative importance for sitemap consumers that still read the optional
 * priority field. Google ignores it, but a truthful hierarchy is preferable
 * to declaring every page equally important.
 */
function sitemapMeta(slug: string): Pick<SitemapItem, 'changefreq' | 'priority'> {
  if (slug === '/') return { changefreq: 'weekly', priority: 1.0 }
  if (slug === '/events' || slug === '/work-with-titania') {
    return { changefreq: 'monthly', priority: 0.9 }
  }
  if (slug === '/about-titania') return { changefreq: 'yearly', priority: 0.7 }
  if (slug === '/legal-data') return { changefreq: 'yearly', priority: 0.2 }
  return { changefreq: 'monthly', priority: 0.5 }
}

// ---------------------------------------------------------------------------

export interface SitemapItem {
  url: string
  links?: { lang: string; url: string }[]
  changefreq?: string
  priority?: number
  [k: string]: unknown
}

export interface EmitContext {
  /** Page sources relative to the docs root, 404 already removed. */
  pages: string[]
  /** One timestamp for the whole build, so outputs agree with each other. */
  stamp: string
  /** Absolute path the page sources are relative to, for hooks that read them. */
  root: string
  /** Prefixed reporter, so a build log says which integration spoke. */
  logger: { info: (msg: string) => void }
}

export interface Emitted {
  file: string
  body: string
}

export interface Integration {
  name: string
  hooks: {
    'sitemap:transform'?: (items: SitemapItem[]) => SitemapItem[]
    'build:done'?: (ctx: EmitContext) => Emitted[]
  }
}

// ---------------------------------------------------------------------------

/**
 * Declare every translation of a URL as an alternate, which is what Search
 * Console reads to group a page's language versions.
 */
const hreflang: Integration = {
  name: 'hreflang',
  hooks: {
    'sitemap:transform': (items) => {
      const known = new Set(items.map((i) => (i.url.startsWith('/') ? i.url : `/${i.url}`)))
      return items.map((item) => {
        const urlPath = item.url.startsWith('/') ? item.url : `/${item.url}`
        const { slug } = splitLocale(urlPath)
        const links = LOCALES.flatMap((locale) => {
          const alt = slug === '/' ? `${locale.prefix}/` : `${locale.prefix}${slug}`
          return known.has(alt) ? [{ lang: locale.hreflang, url: `${HOSTNAME}${alt}` }] : []
        })
        // Search Console reads x-default from the sitemap as well as the head.
        if (known.has(slug)) links.push({ lang: 'x-default', url: `${HOSTNAME}${slug}` })
        return { ...item, links, ...sitemapMeta(slug) }
      })
    }
  }
}

/**
 * Crawlers read robots.txt only at the domain root, so the Clown subsite's own
 * copy is never fetched. Its sitemap is announced from here or nowhere.
 */
const robots: Integration = {
  name: 'robots',
  hooks: {
    'build:done': ({ logger }) => {
      const sitemaps = [`${HOSTNAME}/sitemap.xml`, `${CLOWN}sitemap.xml`]
      logger.info(`announcing ${sitemaps.length} sitemaps`)
      return [
        {
          file: 'robots.txt',
          body: ['User-agent: *', 'Allow: /', '', ...sitemaps.map((s) => `Sitemap: ${s}`), ''].join('\n')
        }
      ]
    }
  }
}

// ---------------------------------------------------------------------------

/**
 * The written pages, with the words their own front matter gives them.
 *
 * `EmitContext` hands over source paths and nothing else, so the titles come
 * from the files. Only the hand-written pages are read: the 42 keyword
 * listings per language are generated from route params and have no front
 * matter, and a feed of 126 machine-made permutations is not a feed anybody
 * subscribes to.
 *
 * They are filtered by whether a file is actually there. VitePress lists
 * dynamic routes already resolved -- `balloons.md`, `de/portrait/street.md` --
 * so a name-based filter looks right and then opens a file that was never on
 * disk.
 */
function writtenPages(pages: string[], root: string) {
  const field = (body: string, name: string) => {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(body)?.[1] ?? ''
    const line = new RegExp(`^${name}:\\s*(.*)$`, 'm').exec(fm)?.[1]?.trim() ?? ''
    return line.replace(/^["']|["']$/g, '')
  }
  return pages
    .filter((page) => existsSync(join(root, page)))
    .map((page) => {
      const urlPath = '/' + page.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
      const body = readFileSync(join(root, page), 'utf-8')
      const { locale, slug } = splitLocale(urlPath.endsWith('/') ? urlPath : urlPath)
      return {
        urlPath,
        slug,
        locale,
        title: field(body, 'title'),
        description: field(body, 'description')
      }
    })
    .filter((p) => p.title)
}

/**
 * One Atom feed per language, and one JSON index behind them.
 *
 * Atom rather than RSS for the same reason the Clown site chose it: an entry
 * needs an identity that outlives its URL. Per language rather than one mixed
 * feed, because a reader who subscribes in German has said which language they
 * read -- and a feed whose entries are three translations of each page is a
 * feed with everything in it three times.
 */
const feeds: Integration = {
  name: 'feeds',
  hooks: {
    'build:done': ({ pages, stamp, logger, root }) => {
      const written = writtenPages(pages, root)
      const out: Emitted[] = []

      for (const locale of LOCALES) {
        const copy = COPY[locale.lang]
        const mine = written.filter((p) => p.locale.prefix === locale.prefix)
        if (!mine.length) continue
        const home = `${HOSTNAME}${locale.prefix}/`
        const self = `${HOSTNAME}${locale.prefix}/feed.atom`
        out.push({
          file: `${locale.prefix.replace(/^\//, '')}${locale.prefix ? '/' : ''}feed.atom`,
          body: atom({
            id: `tag:titaniachaos.com,2024:feed${locale.prefix || '/'}`,
            title: copy.feed.title,
            subtitle: copy.feed.subtitle,
            self,
            alternate: home,
            author: 'Tatiana Petkova',
            lang: locale.hreflang,
            updated: stamp,
            items: mine.map((p) => ({
              id: `tag:titaniachaos.com,2024:${p.slug}`,
              title: p.title,
              summary: p.description || copy.siteDescription,
              updated: stamp,
              links: [{ href: `${HOSTNAME}${p.urlPath}`, rel: 'alternate', type: 'text/html' }]
            }))
          })
        })
      }

      // The same answer as data, for anything that would rather not parse XML
      // -- and the one place the per-locale wording can be read from outside
      // the build.
      out.push({
        file: 'site.json',
        body: JSON.stringify(
          {
            updated: stamp,
            locales: LOCALES.map((locale) => ({
              lang: locale.lang,
              hreflang: locale.hreflang,
              prefix: locale.prefix || '/',
              siteName: COPY[locale.lang].siteName,
              description: COPY[locale.lang].siteDescription,
              feed: `${HOSTNAME}${locale.prefix}/feed.atom`,
              pages: written
                .filter((p) => p.locale.prefix === locale.prefix)
                .map((p) => ({
                  url: `${HOSTNAME}${p.urlPath}`,
                  slug: p.slug,
                  title: p.title,
                  description: p.description
                }))
            }))
          },
          null,
          2
        ) + '\n'
      })

      logger.info(`${out.length - 1} feed(s) and site.json over ${written.length} written pages`)
      return out
    }
  }
}

export const INTEGRATIONS: Integration[] = [hreflang, robots, feeds]

/** Wire into `sitemap.transformItems`. Each integration refines in turn. */
export function runSitemapHooks(items: SitemapItem[]): SitemapItem[] {
  return INTEGRATIONS.reduce(
    (acc, i) => (i.hooks['sitemap:transform'] ? i.hooks['sitemap:transform'](acc) : acc),
    items
  )
}

/** Wire into `buildEnd`. Writes every emitted file and reports each one. */
export async function runBuildHooks(siteConfig: SiteConfig): Promise<void> {
  const stamp = new Date().toISOString()
  const pages = siteConfig.pages.filter((p) => p !== '404.md')

  for (const integration of INTEGRATIONS) {
    const hook = integration.hooks['build:done']
    if (!hook) continue
    const logger = { info: (msg: string) => console.log(`  [${integration.name}] ${msg}`) }
    const files = hook({ pages, stamp, logger, root: siteConfig.srcDir })
    await Promise.all(files.map((f) => writeFile(join(siteConfig.outDir, f.file), f.body, 'utf-8')))
    logger.info(files.map((f) => `${f.file} (${(f.body.length / 1024).toFixed(1)} KB)`).join(', '))
  }
}
