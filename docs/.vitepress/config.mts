import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineConfig } from 'vitepress'
import {
  GOOGLE_SITE_VERIFICATION,
  HOSTNAME,
  LOCALES,
  buildHead,
  localeAlternateTags,
  splitLocale
} from './seo.ts'

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
    // Declare every translation of a URL as an alternate, which is what
    // Search Console reads to group a page's language versions.
    transformItems: (items) => {
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
        return { ...item, links, changefreq: 'monthly' as const, priority: slug === '/' ? 1.0 : 0.7 }
      })
    }
  },

  // Per-page Open Graph, Twitter, canonical, hreflang and JSON-LD are emitted
  // by transformHead below, so they stay a single source of truth.
  head: [
    ['meta', { name: 'theme-color', content: '#d62246' }],
    ...(GOOGLE_SITE_VERIFICATION
      ? [['meta', { name: 'google-site-verification', content: GOOGLE_SITE_VERIFICATION }] as const]
      : [])
  ],

  transformHead: (ctx) => buildHead(ctx, ctx.siteConfig),

  transformHtml: (code, _id, ctx) => {
    const tags = localeAlternateTags(ctx.page)
    return tags ? code.replace('</head>', `${tags}</head>`) : code
  },

  async buildEnd(siteConfig) {
    // Crawlers read robots.txt only at the domain root, so the Clown site's
    // own /clown/robots.txt is never fetched. Announce its sitemap from here.
    const robots = [
      'User-agent: *',
      'Allow: /',
      '',
      `Sitemap: ${HOSTNAME}/sitemap.xml`,
      `Sitemap: ${CLOWN_SITE('')}sitemap.xml`,
      ''
    ].join('\n')
    await writeFile(join(siteConfig.outDir, 'robots.txt'), robots, 'utf-8')
  },

  // Shallow-merged into every locale. Anything a locale redefines must be
  // complete there -- `outline` included, since the merge is not deep.
  themeConfig: {
    socialLinks: [
      { icon: 'instagram', link: 'https://www.instagram.com/titaniachaos' },
      { icon: 'facebook', link: 'https://www.facebook.com/titaniachaos' }
    ],
    search: {
      provider: 'local',
      options: {
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
          { text: 'About', link: '/about-titania' },
          { text: 'Clown Project', link: CLOWN_SITE(''), ...SAME_SITE }
        ],
        outline: { level: [2, 3], label: 'On this page' },
        docFooter: { prev: 'Previous page', next: 'Next page' },
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
          { text: 'За Титания', link: '/bg/about-titania' },
          { text: 'Проект „Клоун“', link: CLOWN_SITE('/bg'), ...SAME_SITE }
        ],
        outline: { level: [2, 3], label: 'На тази страница' },
        docFooter: { prev: 'Предишна страница', next: 'Следваща страница' },
        footer: {
          message: `Снимки от ${PHOTOGRAPHERS_BG}. · <a href="/bg/legal-data">Правна информация и поверителност</a>`,
          copyright: '© 2022–2026 Титания Хаос'
        },
        darkModeSwitchLabel: 'Изглед',
        lightModeSwitchTitle: 'Към светлата тема',
        darkModeSwitchTitle: 'Към тъмната тема',
        sidebarMenuLabel: 'Меню',
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
          { text: 'Über Titania', link: '/de/about-titania' },
          { text: 'Clown-Projekt', link: CLOWN_SITE('/de'), ...SAME_SITE }
        ],
        outline: { level: [2, 3], label: 'Auf dieser Seite' },
        docFooter: { prev: 'Vorherige Seite', next: 'Nächste Seite' },
        footer: {
          message: `Fotos von ${PHOTOGRAPHERS}. · <a href="/de/legal-data">Impressum &amp; Datenschutz</a>`,
          copyright: '© 2022–2026 Titania Chaos'
        },
        darkModeSwitchLabel: 'Darstellung',
        lightModeSwitchTitle: 'Zum hellen Design wechseln',
        darkModeSwitchTitle: 'Zum dunklen Design wechseln',
        sidebarMenuLabel: 'Menü',
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
