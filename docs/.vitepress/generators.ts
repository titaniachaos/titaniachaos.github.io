import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SiteConfig } from 'vitepress'
import { HOSTNAME, LOCALES, splitLocale } from './seo.ts'

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
        return { ...item, links, changefreq: 'monthly', priority: slug === '/' ? 1.0 : 0.7 }
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

export const INTEGRATIONS: Integration[] = [hreflang, robots]

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
    const files = hook({ pages, stamp, logger })
    await Promise.all(files.map((f) => writeFile(join(siteConfig.outDir, f.file), f.body, 'utf-8')))
    logger.info(files.map((f) => `${f.file} (${(f.body.length / 1024).toFixed(1)} KB)`).join(', '))
  }
}
