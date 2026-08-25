/**
 * The locale vocabulary, shared by the build-time loaders and the components.
 *
 * It was written five times: the Lang union in two loaders and a component, the
 * BCP-47 narrowing in two components, and a date-locale rule in two more. Five
 * copies of three lines is not a cost until a fourth language arrives, and then
 * it is five edits and one of them gets missed.
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
