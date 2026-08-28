import { LANGS, localePrefix, type Lang } from './locale.ts'

/**
 * The closed vocabulary. A page may ask for any of these; a frame may claim
 * any of these; the loader rejects anything else on either side.
 */
export const TAGS = [
  'workshop',
  'performance',
  'stage',
  'street',
  'children',
  'birthday',
  'balloons',
  'camera',
  'props',
  'portrait',
  'juggling',
  'press',
  'solitude',
  'feed'
] as const

export type Tag = (typeof TAGS)[number]

/**
 * What each tag is called, per language, and the single place it is written.
 *
 * Four things need this and none of them can ask the data loader for it: the
 * loader itself, the three `[category].paths.ts` files that run before it, the
 * navigation in config.mts, and the components. It lived in media.data.ts and
 * was copied into the paths files, which needed a check to stop the copies
 * drifting. One module they can all import needs no check.
 */
export const TAG_NAMES: Record<Lang, Record<Tag, string>> = {
  en: {
    workshop: 'workshop',
    performance: 'performance',
    stage: 'stage',
    street: 'street',
    children: 'children',
    birthday: 'birthday',
    balloons: 'balloons',
    camera: 'time-travelling camera',
    props: 'props',
    portrait: 'portrait',
    juggling: 'juggling',
    press: 'press',
    solitude: 'solitude',
    feed: 'from the feed'
  },
  bg: {
    workshop: 'работилница',
    performance: 'представление',
    stage: 'сцена',
    street: 'улица',
    children: 'деца',
    birthday: 'рожден ден',
    balloons: 'балони',
    camera: 'машина на времето',
    props: 'реквизит',
    portrait: 'портрет',
    juggling: 'жонглиране',
    press: 'медии',
    solitude: 'уединение',
    feed: 'от потока'
  },
  de: {
    workshop: 'Workshop',
    performance: 'Auftritt',
    stage: 'Bühne',
    street: 'Straße',
    children: 'Kinder',
    birthday: 'Geburtstag',
    balloons: 'Luftballons',
    camera: 'Zeitreisekamera',
    props: 'Requisiten',
    portrait: 'Porträt',
    juggling: 'Jonglieren',
    press: 'Presse',
    solitude: 'Alleinsein',
    feed: 'aus dem Feed'
  }
}

/**
 * A page for every tag, in every language, generated rather than written.
 *
 * The vocabulary in media.data.ts is a closed list of what the work *is* --
 * workshop, street, stage, balloons, the time-travelling camera. Each of those
 * is a thing somebody searches for, and until now none of them had a page. The
 * four hand-written pages are about what Titania *sells*; these are about what
 * she *does*, and they cost nothing to keep because nobody maintains them: add
 * a frame with a tag and the page for that tag has one more picture in it.
 *
 * This is the file that makes the site scale past four pages. A new category
 * is one word in TAGS and three labels; twelve more pages appear, in three
 * languages, already populated, already checked.
 *
 * Used by docs/[category].paths.ts and its two translations, which VitePress
 * turns into real routes at build time -- so every one of these is a static
 * HTML file with its own canonical, its own hreflang alternates and its own
 * entry in the sitemap. Nothing about them is client-side.
 */

/** The copy each generated page needs, per language. */
export const CATEGORY_UI: Record<Lang, {
  /** `%1` is the category name. */
  title: string
  description: string
  /** Heading above the pictures. */
  heading: string
  /** Shown when a category has one frame, and when it has many. */
  one: string
  many: string
  /** Above the list of ordinary pages that also carry this tag. */
  alsoOn: string
  /** Before the chips at the foot of a written page. */
  about: string
  /** Above the written pages that discuss this category. */
  written: string
  /** The index page that lists every category. */
  indexTitle: string
  indexDescription: string
  indexIntro: string
  empty: string
}> = {
  en: {
    title: '%1',
    description: 'Photographs and films of Titania Chaos: %1.',
    heading: '%1',
    one: '1 picture',
    many: '%1 pictures',
    alsoOn: 'Also on',
    about: 'This page is about',
    written: 'Read about this',
    indexTitle: 'Everything, by what it is',
    indexDescription: 'Browse the photographs and films of Vienna clown Titania Chaos by subject.',
    indexIntro: 'Every photograph and film on this site, arranged by what it is rather than by which page it sits on.',
    empty: 'Nothing carries this yet.'
  },
  bg: {
    title: '%1',
    description: 'Снимки и филми на Титания Хаос: %1.',
    heading: '%1',
    one: '1 кадър',
    many: '%1 кадъра',
    alsoOn: 'Също на',
    about: 'Тази страница е за',
    written: 'Прочетете за това',
    indexTitle: 'Всичко, според това какво е',
    indexDescription: 'Разгледайте снимките и филмите на виенската клоунеса Титания Хаос по тема.',
    indexIntro: 'Всяка снимка и всеки филм на този сайт, подредени според това какво са, а не на коя страница стоят.',
    empty: 'Още нищо не носи това.'
  },
  de: {
    title: '%1',
    description: 'Fotos und Filme von Titania Chaos: %1.',
    heading: '%1',
    one: '1 Aufnahme',
    many: '%1 Aufnahmen',
    alsoOn: 'Auch auf',
    about: 'Diese Seite handelt von',
    written: 'Dazu zu lesen',
    indexTitle: 'Alles, nach dem was es ist',
    indexDescription: 'Die Fotos und Filme der Wiener Clownin Titania Chaos nach Thema.',
    indexIntro: 'Jedes Foto und jeder Film dieser Website, geordnet nach dem was sie sind statt danach, auf welcher Seite sie stehen.',
    empty: 'Dafür gibt es noch nichts.'
  }
}

/** `%1` filled in. Kept here so the three locales cannot drift apart. */
export const fill = (template: string, value: string | number) => template.replace('%1', String(value))

/**
 * A tag's name as a heading rather than as a chip.
 *
 * The labels are written for the small-caps rows under a picture, so English
 * and Bulgarian are lowercase — `street`, `улица`. As the h1 of its own page
 * that reads like a mistake. Only the first letter moves, which is right in
 * all three languages: German nouns are already capitalised, and
 * `time-travelling camera` must not become `Time-Travelling Camera`.
 */
export const asTitle = (name: string) => name.charAt(0).toUpperCase() + name.slice(1)

/** The URL of a category page. Every language, one shape. */
export const categoryPath = (lang: Lang, tag: string) => `${localePrefix(lang)}/${tag}`

export { LANGS }
