/**
 * The locale vocabulary, shared by the build-time loaders and the components.
 *
 * It was written five times: the Lang union in two loaders and a component, the
 * BCP-47 narrowing in two components, and a date-locale rule in two more. Five
 * copies of three lines is not a cost until a fourth language arrives, and then
 * it is five edits and one of them gets missed.
 *
 * The file is byte-identical in the main site and in the clown project site, so
 * a fourth language is the same single edit in both, and the two can never
 * disagree about what a language is.
 *
 * Kept free of Vue and VitePress imports so the `.data.ts` loaders, which run
 * in Node, can use it too. The Vue side is in `theme/useLang.ts`.
 */

export type Lang = 'en' | 'bg' | 'de'

export const LANGS: readonly Lang[] = ['en', 'bg', 'de'] as const

/** A value written once per language. */
export type Localised<T = string> = Record<Lang, T>

/**
 * Narrow a BCP-47 tag to one of ours: `de-AT` and `de` both give `de`.
 * This is what `useData().lang` returns, so it is the usual entry point.
 */
export function fromTag(tag: string | undefined): Lang {
  const base = (tag ?? '').split('-')[0]
  return (LANGS as readonly string[]).includes(base) ? (base as Lang) : 'en'
}

/**
 * Narrow VitePress's `localeIndex`, which names the English locale `root`
 * and the others after their directory.
 */
export function toLang(localeIndex: string | undefined): Lang {
  return localeIndex === 'bg' ? 'bg' : localeIndex === 'de' ? 'de' : 'en'
}

/** URL prefix for a locale: '' for English, '/bg' and '/de' for the others. */
export function localePrefix(lang: Lang): string {
  return lang === 'en' ? '' : `/${lang}`
}

/**
 * The tag to format dates and numbers with. English pages are written in
 * British English, so `en` must not fall through to a US default.
 */
export function dateLocale(lang: Lang): string {
  return lang === 'en' ? 'en-GB' : lang === 'de' ? 'de-AT' : 'bg-BG'
}

/**
 * Reduce any form of a page reference to its locale and its slug.
 * `bg/concept.md` and `/bg/concept` both give `{ lang: 'bg', slug: 'concept' }`.
 *
 * A project site is served from a sub-path, and a reference may still carry it.
 * Pass that sub-path as `base` -- `/clown/` -- and the leading segment is
 * dropped before the locale is read. The default is the empty string, which is
 * what a site at the domain root needs, and what page-relative references need
 * in either site.
 */
export function parsePage(ref: string, base = ''): { lang: Lang; slug: string } {
  const root = base.replace(/^\/+|\/+$/g, '')
  const parts = ref
    .replace(/\.md$/, '')
    .split('/')
    .filter(Boolean)

  if (root && parts[0] === root) parts.shift()
  if (!parts.length) return { lang: 'en', slug: 'index' }
  const lang = toLang(parts[0])
  const rest = parts[0] === 'bg' || parts[0] === 'de' ? parts.slice(1) : parts
  return { lang, slug: rest.join('/') || 'index' }
}

/** Pick a localised value, falling back to English rather than to nothing. */
export function pick<T>(value: Partial<Localised<T>> | undefined, lang: Lang): T | undefined {
  return value?.[lang] ?? value?.en
}
