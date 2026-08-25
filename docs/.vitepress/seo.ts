import type { HeadConfig, SiteConfig, TransformContext } from 'vitepress'

export const HOSTNAME = 'https://titaniachaos.github.io'

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
  siteName: string
}

export const LOCALES: LocaleMeta[] = [
  { prefix: '', hreflang: 'en', ogLocale: 'en_GB', siteName: 'Titania Chaos' },
  { prefix: '/bg', hreflang: 'bg', ogLocale: 'bg_BG', siteName: 'Титания Хаос' },
  { prefix: '/de', hreflang: 'de-AT', ogLocale: 'de_AT', siteName: 'Titania Chaos' }
]

/** Real intrinsic sizes; Open Graph consumers reject mismatched dimensions. */
const IMAGES = {
  // Social cards are cropped to roughly 1.91:1 by every platform that renders
  // them, so the sharing image is a real landscape crop rather than the
  // portrait, which arrived on X and LinkedIn as a band across the middle.
  'titania-chaos-card.jpg': { w: 1200, h: 630, alt: 'Titania Chaos' },
  'titania-chaos.webp': { w: 1452, h: 1800, alt: 'Titania Chaos' },
  'titania-chaos-hero.webp': { w: 800, h: 992, alt: 'Titania Chaos' },
  'titania-juggling.jpg': { w: 960, h: 1200, alt: 'Tatiana Petkova as Titania Chaos, catching a juggling club' },
  'time-travelling-camera.jpg': { w: 768, h: 768, alt: "Titania's time-travelling camera" }
} as const

/** Per-page social image, keyed by the locale-stripped slug. */
const PAGE_IMAGE: Record<string, keyof typeof IMAGES> = {
  '/': 'titania-chaos-card.jpg',
  '/about-titania': 'titania-chaos-card.jpg',
  '/work-with-titania': 'time-travelling-camera.jpg',
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

const SITE_DESCRIPTION =
  'Clown workshops, physical comedy, events and parties in Vienna.'

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
function personNode(slug: string) {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: 'Tatiana Petkova',
    alternateName: 'Titania Chaos',
    jobTitle: 'Clown, psychologist and language coach',
    description:
      'Vienna-based clown artist offering clown workshops, physical comedy, performances and playful photo experiences.',
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
function serviceNodes(slug: string, hreflang: string) {
  if (slug === '/events') {
    return [
      {
        '@type': 'Service',
        '@id': `${HOSTNAME}${slug}#service`,
        name: "Children's birthday parties with Titania Chaos",
        serviceType: "Children's birthday entertainment",
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
          description:
            'Up to 10 children, approximately 2-3 hours, plus taxi within Vienna.',
          availability: 'https://schema.org/InStock'
        },
        inLanguage: hreflang
      }
    ]
  }
  if (slug === '/work-with-titania') {
    return [
      {
        '@type': 'Service',
        '@id': `${HOSTNAME}${slug}#service`,
        name: 'Titania Chaos and her time-travelling camera',
        serviceType: 'Walkabout performance and photo experience',
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

  const imageKey = PAGE_IMAGE[slug] ?? 'titania-chaos-card.jpg'
  const image = IMAGES[imageKey]
  const imageUrl = `${HOSTNAME}/images/${imageKey}`

  // ctx.title has the titleTemplate applied ('Page | Titania Chaos'), which
  // reads as duplicated branding in a social card. Prefer the bare title.
  const title = ctx.pageData.title || ctx.title
  const description = ctx.description || ctx.siteData.description

  const head: HeadConfig[] = [
    ['link', { rel: 'canonical', href: canonical }],

    // Open Graph. og:title, og:type, og:image and og:url are the four
    // properties the protocol requires on every page.
    ['meta', { property: 'og:type', content: slug === '/' ? 'website' : 'article' }],
    ['meta', { property: 'og:site_name', content: locale.siteName }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:url', content: canonical }],
    ['meta', { property: 'og:locale', content: locale.ogLocale }],
    ['meta', { property: 'og:image', content: imageUrl }],
    ['meta', { property: 'og:image:width', content: String(image.w) }],
    ['meta', { property: 'og:image:height', content: String(image.h) }],
    ['meta', { property: 'og:image:alt', content: image.alt }],

    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: title }],
    ['meta', { name: 'twitter:description', content: description }],
    ['meta', { name: 'twitter:image', content: imageUrl }],
    ['meta', { name: 'twitter:image:alt', content: image.alt }]
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
        personNode(slug),
        {
          '@type': 'WebSite',
          '@id': WEBSITE_ID,
          url: `${HOSTNAME}/`,
          name: 'Titania Chaos',
          description: SITE_DESCRIPTION,
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
            caption: image.alt
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
                      name: locale.siteName,
                      item: `${HOSTNAME}${locale.prefix}/`
                    },
                    { '@type': 'ListItem', position: 2, name: title }
                  ]
                }
              })
        },
        ...serviceNodes(slug, locale.hreflang)
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
