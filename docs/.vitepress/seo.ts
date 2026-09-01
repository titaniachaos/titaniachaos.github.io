import type { HeadConfig, SiteConfig, TransformContext } from 'vitepress'
import type { Lang } from './locale.ts'
import { COPY } from './site-copy.ts'
import type { ImageKey } from './site-copy.ts'

/**
 * Every canonical URL, hreflang, sitemap entry and schema.org @id is built from
 * this. It is the one thing a move to a custom domain has to change, so it
 * reads from the environment with today's value as the default: a migration is
 * `SITE_ORIGIN=https://example.at npm run docs:build`, not a search and replace.
 */
export const HOSTNAME = (process.env.SITE_ORIGIN ?? 'https://titaniachaos.com').replace(/\/$/, '')

/**
 * Token from Search Console's "HTML tag" verification method (the value of
 * the `content` attribute only). Leave empty and no tag is emitted.
 *
 * The HTML-file verification method cannot be used on this repository: the
 * deploy workflow rejects `.html` source files. Use this tag or a DNS TXT
 * record instead.
 */
export const GOOGLE_SITE_VERIFICATION = ''

export interface LocaleMeta {
  /** URL prefix, '' for the root (English) locale. */
  prefix: string
  /** BCP 47 tag used for `hreflang` and `<html lang>`. */
  hreflang: string
  /** Open Graph `language_TERRITORY` form. */
  ogLocale: string
  /** Which set of words this locale is served from. See site-copy.ts. */
  lang: Lang
}

export const LOCALES: LocaleMeta[] = [
  { prefix: '', hreflang: 'en', ogLocale: 'en_GB', lang: 'en' },
  { prefix: '/bg', hreflang: 'bg', ogLocale: 'bg_BG', lang: 'bg' },
  { prefix: '/de', hreflang: 'de-AT', ogLocale: 'de_AT', lang: 'de' }
]

/** Real intrinsic sizes; Open Graph consumers reject mismatched dimensions. */
const IMAGES = {
  // Social cards are cropped to roughly 1.91:1 by every platform that renders
  // them, so the sharing image is a real landscape crop rather than the
  // portrait, which arrived on X and LinkedIn as a band across the middle.
  'titania-chaos-card.jpg': { w: 1200, h: 630 },
  'titania-chaos-hero.webp': { w: 640, h: 840 },
  'titania-juggling.jpg': { w: 800, h: 1000 },
  'work-with-titania-card.jpg': { w: 768, h: 402 }
} as const

/** Per-page social image, keyed by the locale-stripped slug. */
const PAGE_IMAGE: Record<string, keyof typeof IMAGES> = {
  '/': 'titania-chaos-card.jpg',
  '/about-titania': 'titania-chaos-card.jpg',
  '/work-with-titania': 'work-with-titania-card.jpg',
  '/events': 'titania-chaos-card.jpg',
  '/legal-data': 'titania-chaos-card.jpg'
}

/** `index.md` -> `/`, `bg/events.md` -> `/bg/events` (cleanUrls is on). */
export function toUrlPath(page: string): string {
  const p = page.replace(/\.md$/, '')
  if (p === 'index') return '/'
  if (p.endsWith('/index')) return `/${p.slice(0, -'/index'.length)}/`
  return `/${p}`
}

/** Split `/bg/events` into its locale and its locale-independent slug. */
export function splitLocale(urlPath: string): { locale: LocaleMeta; slug: string } {
  for (const locale of LOCALES) {
    if (!locale.prefix) continue
    if (urlPath === `${locale.prefix}/`) return { locale, slug: '/' }
    if (urlPath.startsWith(`${locale.prefix}/`)) {
      return { locale, slug: urlPath.slice(locale.prefix.length) }
    }
  }
  return { locale: LOCALES[0], slug: urlPath }
}

/** The same slug in every locale that actually has a source file. */
function existingAlternates(slug: string, pages: string[]): Array<{ locale: LocaleMeta; url: string }> {
  const sources = new Set(pages)
  return LOCALES.flatMap((locale) => {
    const urlPath = slug === '/' ? `${locale.prefix}/` : `${locale.prefix}${slug}`
    const source = urlPath === '/' ? 'index.md' : `${urlPath.replace(/^\//, '').replace(/\/$/, '/index')}.md`
    return sources.has(source) ? [{ locale, url: `${HOSTNAME}${urlPath}` }] : []
  })
}

function jsonLd(data: object): HeadConfig {
  return ['script', { type: 'application/ld+json' }, JSON.stringify(data)]
}

const PERSON_ID = `${HOSTNAME}/#titania`
const WEBSITE_ID = `${HOSTNAME}/#website`

/**
 * Press coverage, verified against the outlets' own pages. Carried as
 * `subjectOf` on the About page, where the same four items are listed in prose.
 */
const PRESS = [
  {
    '@type': 'VideoObject',
    name: 'Титания Хаос – българската клоунеса по света',
    url: 'https://bnt.bg/news/titaniya-haos-balgarskata-klounesa-po-sveta-v380538-335213news.html',
    datePublished: '2024-12-18',
    publisher: { '@type': 'Organization', name: 'Българска национална телевизия' }
  },
  {
    '@type': 'AudioObject',
    name: 'Професията клоун – все по-необходима днес',
    url: 'https://bnr.bg/horizont/post/101836100/profesiata-kloun-vse-po-neobhodima-dnes',
    datePublished: '2023-06-10',
    publisher: { '@type': 'Organization', name: 'Българско национално радио' }
  },
  {
    '@type': 'NewsArticle',
    name: 'Как полиглотът Татяна Петкова стана клоунът Титания Хаос',
    url: 'https://www.24chasa.bg/ozhivlenie/article/12927305',
    datePublished: '2022-11-03',
    publisher: { '@type': 'Organization', name: '24 часа' }
  },
  {
    '@type': 'Article',
    name: 'Татяна Петкова: Смехът е свобода',
    url: 'https://www.bulgaren.org/2022/10/20/%D1%82%D0%B0%D1%82%D1%8F%D0%BD%D0%B0-%D0%BF%D0%B5%D1%82%D0%BA%D0%BE%D0%B2%D0%B0-%D1%81%D0%BC%D0%B5%D1%85%D1%8A%D1%82-%D0%B5-%D1%81%D0%B2%D0%BE%D0%B1%D0%BE%D0%B4%D0%B0/',
    datePublished: '2022-10-20',
    publisher: { '@type': 'Organization', name: 'Меланж' }
  }
] as const

/**
 * The postal address is the § 5 ECG Impressum datum. It is carried by the
 * legal notice page -- which states it in prose in every locale -- and not
 * repeated in the structured data of every other page.
 */
function personNode(slug: string, lang: Lang) {
  const copy = COPY[lang]
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: 'Tatiana Petkova',
    alternateName: copy.siteName,
    jobTitle: copy.jobTitle,
    description: copy.personDescription,
    email: 'agent@tatianapetkova.com',
    url: `${HOSTNAME}/`,
    image: `${HOSTNAME}/images/titania-juggling.jpg`,
    knowsLanguage: ['en', 'de', 'fr', 'ru', 'bg'],
    ...(slug === '/about-titania' ? { subjectOf: PRESS } : {}),
    ...(slug === '/legal-data'
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Diehlgasse 6/10',
            postalCode: '1050',
            addressLocality: 'Vienna',
            addressCountry: 'AT'
          }
        }
      : {}),
    sameAs: [
      'https://www.instagram.com/titaniachaos',
      'https://www.facebook.com/titaniachaos'
    ]
  }
}

/** Services carry an Offer only where a published price exists. */
function serviceNodes(slug: string, hreflang: string, lang: Lang) {
  if (slug === '/events') {
    const service = COPY[lang].services['/events']
    return [
      {
        '@type': 'Service',
        '@id': `${HOSTNAME}${slug}#service`,
        name: service.name,
        serviceType: service.serviceType,
        provider: { '@id': PERSON_ID },
        areaServed: { '@type': 'City', name: 'Vienna', addressCountry: 'AT' },
        audience: {
          '@type': 'PeopleAudience',
          suggestedMinAge: 5,
          suggestedMaxAge: 12
        },
        availableLanguage: ['en', 'de', 'bg'],
        offers: {
          '@type': 'Offer',
          price: 290,
          priceCurrency: 'EUR',
          description: service.offerDescription,
          availability: 'https://schema.org/InStock'
        },
        inLanguage: hreflang
      }
    ]
  }
  if (slug === '/work-with-titania') {
    const service = COPY[lang].services['/work-with-titania']
    return [
      {
        '@type': 'Service',
        '@id': `${HOSTNAME}${slug}#service`,
        name: service.name,
        serviceType: service.serviceType,
        provider: { '@id': PERSON_ID },
        areaServed: { '@type': 'City', name: 'Vienna', addressCountry: 'AT' },
        availableLanguage: ['en', 'de', 'fr', 'ru', 'bg'],
        inLanguage: hreflang
      }
    ]
  }
  return []
}

export function buildHead(ctx: TransformContext, siteConfig: SiteConfig): HeadConfig[] {
  const urlPath = toUrlPath(ctx.page)

  // The 404 page has no canonical URL of its own and must not be indexed.
  if (ctx.page === '404.md') {
    return [['meta', { name: 'robots', content: 'noindex, follow' }]]
  }

  const { locale, slug } = splitLocale(urlPath)
  const canonical = `${HOSTNAME}${urlPath}`
  const alternates = existingAlternates(slug, siteConfig.pages)

  const copy = COPY[locale.lang]
  const imageKey: ImageKey = PAGE_IMAGE[slug] ?? 'titania-chaos-card.jpg'
  const image = IMAGES[imageKey]
  const imageAlt = copy.imageAlt[imageKey]
  const imageUrl = `${HOSTNAME}/images/${imageKey}`

  // ctx.title has the titleTemplate applied ('Page | Titania Chaos'), which
  // reads as duplicated branding in a social card. Prefer the bare title.
  const title = ctx.pageData.title || ctx.title
  const description = ctx.description || ctx.siteData.description || copy.siteDescription

  const head: HeadConfig[] = [
    ['link', { rel: 'canonical', href: canonical }],

    // Feed autodiscovery, pointing at this page's own language. A reader that
    // finds the German page should be offered the German feed, not the root
    // one -- which is the whole reason there are three.
    [
      'link',
      {
        rel: 'alternate',
        type: 'application/atom+xml',
        title: copy.feed.title,
        href: `${HOSTNAME}${locale.prefix}/feed.atom`
      }
    ],

    // Open Graph. og:title, og:type, og:image and og:url are the four
    // properties the protocol requires on every page.
    ['meta', { property: 'og:type', content: slug === '/' ? 'website' : 'article' }],
    ['meta', { property: 'og:site_name', content: copy.siteName }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:url', content: canonical }],
    ['meta', { property: 'og:locale', content: locale.ogLocale }],
    ['meta', { property: 'og:image', content: imageUrl }],
    ['meta', { property: 'og:image:width', content: String(image.w) }],
    ['meta', { property: 'og:image:height', content: String(image.h) }],
    ['meta', { property: 'og:image:alt', content: imageAlt }],

    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: title }],
    ['meta', { name: 'twitter:description', content: description }],
    ['meta', { name: 'twitter:image', content: imageUrl }],
    ['meta', { name: 'twitter:image:alt', content: imageAlt }]
  ]

  // hreflang, emitted only for locales that really have this page, so Search
  // Console does not report alternates pointing at 404s. x-default is English.
  for (const alt of alternates) {
    head.push(['link', { rel: 'alternate', hreflang: alt.locale.hreflang, href: alt.url }])
  }
  const fallback = alternates.find((a) => a.locale.prefix === '')
  if (fallback) {
    head.push(['link', { rel: 'alternate', hreflang: 'x-default', href: fallback.url }])
  }

  head.push(
    jsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        personNode(slug, locale.lang),
        {
          '@type': 'WebSite',
          '@id': WEBSITE_ID,
          url: `${HOSTNAME}/`,
          name: 'Titania Chaos',
          description: copy.siteDescription,
          inLanguage: LOCALES.map((l) => l.hreflang),
          publisher: { '@id': PERSON_ID }
        },
        {
          '@type': 'WebPage',
          '@id': `${canonical}#webpage`,
          url: canonical,
          name: title,
          description,
          inLanguage: locale.hreflang,
          isPartOf: { '@id': WEBSITE_ID },
          about: { '@id': PERSON_ID },
          primaryImageOfPage: {
            '@type': 'ImageObject',
            url: imageUrl,
            width: image.w,
            height: image.h,
            caption: imageAlt
          },
          ...(slug === '/'
            ? {}
            : {
                breadcrumb: {
                  '@type': 'BreadcrumbList',
                  itemListElement: [
                    {
                      '@type': 'ListItem',
                      position: 1,
                      name: copy.siteName,
                      item: `${HOSTNAME}${locale.prefix}/`
                    },
                    { '@type': 'ListItem', position: 2, name: title }
                  ]
                }
              })
        },
        ...serviceNodes(slug, locale.hreflang, locale.lang)
      ]
    })
  )

  return head
}

/**
 * Open Graph allows one `og:locale:alternate` per additional locale, but
 * VitePress deduplicates head `<meta>` entries by `property`, so these are
 * injected into the rendered HTML instead of returned from transformHead.
 */
export function localeAlternateTags(page: string): string {
  if (page === '404.md') return ''
  const { locale } = splitLocale(toUrlPath(page))
  return LOCALES.filter((l) => l.ogLocale !== locale.ogLocale)
    .map((l) => `<meta property="og:locale:alternate" content="${l.ogLocale}">`)
    .join('')
}
