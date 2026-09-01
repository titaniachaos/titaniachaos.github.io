import { defineConfig } from 'vitepress'
import {
  GOOGLE_SITE_VERIFICATION,
  HOSTNAME,
  buildHead,
  localeAlternateTags
} from './seo.ts'
import { runBuildHooks, runSitemapHooks } from './generators.ts'
import { shelf, paths, resolve, ordered, ENOUGH, SHOWN } from '../../scripts/lib/browse.mjs'
import { frames } from '../../scripts/lib/media-meta.mjs'
import { TAG_NAMES, asTitle } from './categories.ts'
import type { Lang } from './locale.ts'
/**
 * The Clown project is a separate VitePress site built from the `clown`
 * repository. Same domain, so keep the reader in their language and their tab.
 */
const CLOWN_SITE = (prefix: string) => `${HOSTNAME}/clown${prefix}/`

/**
 * The Clown site shares this host, so a link to it is a same-site navigation:
 * no new tab, no external-link icon, and the referrer is worth keeping.
 */
const SAME_SITE = { target: '_self', rel: '', noIcon: true } as const

/**
 * The way in to the 44 keyword paths.
 *
 * Every published photograph is reachable from one of them, and until this
 * menu existed a reader could only arrive by typing a URL or following a
 * `Narrower` link from a page they had no way to reach either. A browse
 * surface nothing links to is the pool with extra steps.
 *
 * The single words only: thirteen entries, richest first, and the deeper
 * combinations are reached from the listing itself. Built from the archive, so
 * a new word in TAGS appears here on the next build and a word nothing carries
 * never does.
 */
const browseState = await shelf()
const browseWords = paths(browseState)
  .filter((p) => p.want.length === 1)
  .map((p) => ({ word: p.want[0], n: p.frames.length }))

const browseMenu = (lang: Lang) => ({
  text: BROWSE_LABEL[lang],
  items: [
    ...browseWords.map(({ word }) => ({
      text: asTitle(TAG_NAMES[lang][word as keyof (typeof TAG_NAMES)[typeof lang]]),
      link: `${lang === 'en' ? '' : '/' + lang}/${word}`
    })),
    // The whole archive at once, bound like Queneau's sonnets. It sits under
    // the pictures because that is what it arranges, and it is one link
    // rather than 10^29: the address lives in the fragment.
    { text: ARRANGEMENT_LABEL[lang], link: `${lang === 'en' ? '' : '/' + lang}/arrangement` }
  ]
})

/** What the arrangement machine is called in the menu. */
const ARRANGEMENT_LABEL: Record<Lang, string> = {
  en: 'Arrangements',
  bg: 'Подредби',
  de: 'Anordnungen'
}

/** What the menu is called. Not a page title — nothing sits at the top of it. */
const BROWSE_LABEL: Record<Lang, string> = {
  en: 'Pictures',
  bg: 'Снимки',
  de: 'Bilder'
}

/**
 * What a keyword listing puts into the search index.
 *
 * The 42 listings in three languages -- 126 pages -- were not in it at all.
 * Their source is a single `<BrowsePath />`, and everything a reader sees is
 * rendered from route params in the browser, so MiniSearch indexed an empty
 * document: searching the site for `portrait` found nothing, on a site with a
 * page called Portrait carrying 54 photographs.
 *
 * `_render` is VitePress's hook for exactly this. The listing is given the
 * words it actually shows -- its title, the words of the path, and the caption
 * of every frame on it -- and an `<h1>`, because a result with no heading is
 * listed under a blank title even when its body matches.
 */
const CAPTIONS = new Map(
  (await frames()).filter((f) => !f.draft).map((f) => [f.id, f.caption as Record<Lang, string>])
)

function browseSearchBody(relativePath: string): string | null {
  const parts = relativePath.replace(/\.md$/, '').split('/')
  let lang: Lang = 'en'
  if (parts[0] === 'bg' || parts[0] === 'de') lang = parts.shift() as Lang
  if (!parts.length || parts.some((w) => !browseState.words.includes(w))) return null

  const found = resolve(parts, browseState)
  if (!found || found.frames.length < ENOUGH) return null

  const spoken = found.want.map(
    (w: string) => TAG_NAMES[lang][w as keyof (typeof TAG_NAMES)[typeof lang]]
  )
  const heading = asTitle(spoken.join(' · '))
  const anchor = found.want.join('-')
  const captions = ordered(found, browseState)
    .slice(0, SHOWN)
    .map((f: { id: string }) => CAPTIONS.get(f.id)?.[lang])
    .filter(Boolean)

  return [
    // VitePress splits a page into search sections with
    // `/<h(\d*).*?>(.*?<a.*? href="#.*?".*?>.*?<\/a>)<\/h\1>/` -- a heading only
    // counts if it contains a header-anchor link. A bare `<h1>` matches
    // nothing, the split yields one chunk, `shift()` drops it, and the page is
    // indexed as empty. That is why these listings were missing from search
    // even though this function was returning the right words all along.
    `<h1 id="${anchor}" tabindex="-1">${heading} <a class="header-anchor" href="#${anchor}" aria-label="Permalink to &quot;${heading}&quot;">\u200b</a></h1>`,
    `<p>${[...spoken, ...found.want].join(' ')}</p>`,
    ...captions.map((c) => `<p>${c}</p>`)
  ].join('\n')
}

const PHOTOGRAPHERS =
  'Veliko Balabanov, Marine Hink, Heidi Holtl, Geo Kalev, Tanya Matskevich, ' +
  'Konstantin Oberlik, Tatiana Petkova, Marion Scholz and Laurent Ziegler'

const PHOTOGRAPHERS_BG =
  'Велико Балабанов, Марин Хинк, Хайди Холтл, Гео Калев, Таня Мацкевич, ' +
  'Константин Оберлик, Татяна Петкова, Марион Шолц и Лоран Циглер'

export default defineConfig({
  title: 'Titania Chaos',
  titleTemplate: ':title | Titania Chaos',
  description: 'Clown workshops, physical comedy, events and parties in Vienna.',
  cleanUrls: true,

  // Stated rather than left to the default, so nobody reaches for it to
  // make a red build green. It covers links to pages; fragments are not
  // checked by VitePress at all, which is what scripts/check-build.mjs is
  // for -- this site navigates almost entirely by written section ids.
  ignoreDeadLinks: false,

  markdown: {
    // `markdown.externalLinks` is global, and the two sites share a host: a
    // link between them is a same-site navigation, while a genuinely external
    // link should still open a new tab. So decide per host.
    config: (md) => {
      const renderLink =
        md.renderer.rules.link_open ??
        ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

      md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const href = tokens[idx].attrGet('href') ?? ''
        if (!href.startsWith(HOSTNAME)) return renderLink(tokens, idx, options, env, self)

        // The theme can also draw the arrow from `a[href*="://"]` in CSS, so
        // the class is needed as well as dropping the new-tab attributes.
        tokens[idx].attrJoin('class', 'no-icon')
        return renderLink(tokens, idx, options, env, self)
          .replace(' target="_blank"', '')
          .replace(' rel="noreferrer"', '')
      }
    }
  },
  sitemap: {
    hostname: HOSTNAME,
    // VitePress enumerates the pages and writes the XML; the integrations only
    // enrich each item. See generators.ts.
    transformItems: runSitemapHooks
  },

  // Per-page Open Graph, Twitter, canonical, hreflang and JSON-LD are emitted
  // by transformHead below, so they stay a single source of truth.
  head: [
    ['link', { rel: 'icon', type: 'image/png', sizes: '256x256', href: '/favicon.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/favicon.png' }],
    ['meta', { name: 'theme-color', content: '#d62246' }],
    ...(GOOGLE_SITE_VERIFICATION
      ? [['meta', { name: 'google-site-verification', content: GOOGLE_SITE_VERIFICATION }] as const]
      : [])
  ],

  // A generated category page carries its title and description in its route
  // params, and front matter does not interpolate `$params` -- only the body
  // does. Without this every one of the 39 of them would be served with a
  // literal `{{ $params.title }}` in its <title>, its canonical card and its
  // JSON-LD, which is exactly the sort of thing that looks fine in a browser
  // and is wrong in a search result.
  transformPageData(pageData) {
    const params = pageData.params as { title?: string; description?: string } | undefined
    if (!params?.title) return
    pageData.title = params.title
    pageData.description = params.description ?? pageData.description
    pageData.frontmatter = { ...pageData.frontmatter, title: params.title, description: params.description }
  },

  transformHead: (ctx) => buildHead(ctx, ctx.siteConfig),

  transformHtml: (code, _id, ctx) => {
    const tags = localeAlternateTags(ctx.page)
    return tags ? code.replace('</head>', `${tags}</head>`) : code
  },

  async buildEnd(siteConfig) {
    await runBuildHooks(siteConfig)
  },

  // Shallow-merged into every locale. Anything a locale redefines must be
  // complete there -- `outline` included, since the merge is not deep.
  themeConfig: {
    socialLinks: [
      { icon: 'instagram', link: 'https://www.instagram.com/titaniachaos' },
      { icon: 'facebook', link: 'https://www.facebook.com/titaniachaos' },
      { icon: 'youtube', link: 'https://www.youtube.com/@titaniachaosofficial346' }
    ],
    search: {
      provider: 'local',
      options: {
        // Dynamic routes render in the browser, so what MiniSearch is handed
        // for them is whatever this returns. Written pages keep the default.
        _render(src, env, md) {
          // A dynamic route arrives here with an empty `src` and no params in
          // `env` -- only its path, which for these pages is the question
          // itself. So the listing is recomputed from the path, the same way
          // the route computes it.
          const body = browseSearchBody(String(env.relativePath ?? ''))
          return body ?? md.render(src, env)
        },
        locales: {
          bg: {
            translations: {
              button: { buttonText: 'Търсене', buttonAriaLabel: 'Търсене' },
              modal: {
                displayDetails: 'Подробен изглед',
                resetButtonTitle: 'Изчисти търсенето',
                backButtonTitle: 'Затвори търсенето',
                noResultsText: 'Няма резултати за',
                footer: {
                  selectText: 'избор',
                  selectKeyAriaLabel: 'enter',
                  navigateText: 'навигация',
                  navigateUpKeyAriaLabel: 'стрелка нагоре',
                  navigateDownKeyAriaLabel: 'стрелка надолу',
                  closeText: 'затваряне',
                  closeKeyAriaLabel: 'esc'
                }
              }
            }
          },
          de: {
            translations: {
              button: { buttonText: 'Suchen', buttonAriaLabel: 'Suchen' },
              modal: {
                displayDetails: 'Detailansicht anzeigen',
                resetButtonTitle: 'Suche zurücksetzen',
                backButtonTitle: 'Suche schließen',
                noResultsText: 'Keine Ergebnisse für',
                footer: {
                  selectText: 'auswählen',
                  selectKeyAriaLabel: 'Eingabetaste',
                  navigateText: 'navigieren',
                  navigateUpKeyAriaLabel: 'Pfeil nach oben',
                  navigateDownKeyAriaLabel: 'Pfeil nach unten',
                  closeText: 'schließen',
                  closeKeyAriaLabel: 'esc'
                }
              }
            }
          }
        }
      }
    }
  },

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Workshops', link: '/' },
          { text: 'Birthdays', link: '/events' },
          { text: 'Work with Titania', link: '/work-with-titania' },
          { text: 'Blog', link: CLOWN_SITE('') + 'blog/', ...SAME_SITE },
          browseMenu('en'),
          { text: 'About', link: '/about-titania' },
          { text: 'Clown Project', link: CLOWN_SITE(''), ...SAME_SITE }
        ],
        outline: { level: [2, 3], label: 'On this page' },
        footer: {
          message: `Photos by ${PHOTOGRAPHERS}. · <a href="/legal-data">Legal notice &amp; privacy</a>`,
          copyright: '© 2022–2026 Titania Chaos'
        },
        notFound: {
          title: 'PAGE NOT FOUND',
          quote: 'The clown looked everywhere. This page is not here.',
          linkLabel: 'go to home',
          linkText: 'Take me home'
        }
      }
    },

    bg: {
      label: 'Български',
      lang: 'bg',
      title: 'Титания Хаос',
      titleTemplate: ':title | Титания Хаос',
      description: 'Клоунски работилници, физическа комедия, събития и празненства във Виена.',
      themeConfig: {
        nav: [
          { text: 'Работилници', link: '/bg/' },
          { text: 'Рождени дни', link: '/bg/events' },
          { text: 'Работа с Титания', link: '/bg/work-with-titania' },
          { text: 'Блог', link: CLOWN_SITE('/bg') + 'blog/', ...SAME_SITE },
          browseMenu('bg'),
          { text: 'За Титания', link: '/bg/about-titania' },
          { text: 'Проект „Клоун“', link: CLOWN_SITE('/bg'), ...SAME_SITE }
        ],
        outline: { level: [2, 3], label: 'На тази страница' },
        footer: {
          message: `Снимки от ${PHOTOGRAPHERS_BG}. · <a href="/bg/legal-data">Правна информация и поверителност</a>`,
          copyright: '© 2022–2026 Титания Хаос'
        },
        darkModeSwitchLabel: 'Изглед',
        lightModeSwitchTitle: 'Към светлата тема',
        darkModeSwitchTitle: 'Към тъмната тема',
        returnToTopLabel: 'Към началото',
        langMenuLabel: 'Смяна на езика',
        skipToContentLabel: 'Към съдържанието',
        notFound: {
          title: 'СТРАНИЦАТА НЕ Е НАМЕРЕНА',
          quote: 'Клоунът търси навсякъде. Тази страница я няма.',
          linkLabel: 'към началната страница',
          linkText: 'Към началото'
        }
      }
    },

    de: {
      label: 'Deutsch',
      lang: 'de-AT',
      titleTemplate: ':title | Titania Chaos',
      description: 'Clown-Workshops, physische Komik, Veranstaltungen und Feste in Wien.',
      themeConfig: {
        nav: [
          { text: 'Workshops', link: '/de/' },
          { text: 'Kindergeburtstage', link: '/de/events' },
          { text: 'Mit Titania arbeiten', link: '/de/work-with-titania' },
          { text: 'Blog', link: CLOWN_SITE('/de') + 'blog/', ...SAME_SITE },
          browseMenu('de'),
          { text: 'Über Titania', link: '/de/about-titania' },
          { text: 'Clown-Projekt', link: CLOWN_SITE('/de'), ...SAME_SITE }
        ],
        outline: { level: [2, 3], label: 'Auf dieser Seite' },
        footer: {
          message: `Fotos von ${PHOTOGRAPHERS}. · <a href="/de/legal-data">Impressum &amp; Datenschutz</a>`,
          copyright: '© 2022–2026 Titania Chaos'
        },
        darkModeSwitchLabel: 'Darstellung',
        lightModeSwitchTitle: 'Zum hellen Design wechseln',
        darkModeSwitchTitle: 'Zum dunklen Design wechseln',
        returnToTopLabel: 'Nach oben',
        langMenuLabel: 'Sprache wechseln',
        skipToContentLabel: 'Zum Inhalt springen',
        notFound: {
          title: 'SEITE NICHT GEFUNDEN',
          quote: 'Der Clown hat überall gesucht. Diese Seite ist nicht hier.',
          linkLabel: 'zur Startseite',
          linkText: 'Zur Startseite'
        }
      }
    }
  }
})
