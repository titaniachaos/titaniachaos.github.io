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
  /** The pager under a listing that runs to more than one page. */
  previous: string
  next: string
  /** `Page %1`, for the numbered links. */
  page: string
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
    previous: 'Previous',
    next: 'Next',
    page: 'Page %1',
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
    previous: 'Назад',
    next: 'Напред',
    page: 'Страница %1',
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
    previous: 'Zurück',
    next: 'Weiter',
    page: 'Seite %1',
    about: 'Diese Seite handelt von',
    written: 'Dazu zu lesen',
    indexTitle: 'Alles, nach dem was es ist',
    indexDescription: 'Die Fotos und Filme der Wiener Clownin Titania Chaos nach Thema.',
    indexIntro: 'Jedes Foto und jeder Film dieser Website, geordnet nach dem was sie sind statt danach, auf welcher Seite sie stehen.',
    empty: 'Dafür gibt es noch nichts.'
  }
}

/** `%1` filled in. Kept here so the three locales cannot drift apart. */
/**
 * How many frames a category page lists before it needs a second one.
 *
 * A listing shows a whole tag at once, and after the import `portrait` is 43
 * frames and `street` 37. At 160px each that put /street at 455 KB against a
 * 500 KB budget -- and the answer is not a smaller tile, because the tile is
 * already only 1.33x the 120px slot it renders in and these are photographs.
 * Twenty-four is what fits with room to grow.
 */
export const PER_PAGE = 24

/**
 * The copy a browse listing needs, in each language.
 *
 * A path is a question in the vocabulary — `/portrait/street` — and the page
 * answers it. The words in the URL stay English because they are the
 * vocabulary's own; the heading uses each language's names for them.
 */
/**
 * What an address that answers nothing should say.
 *
 * A path here is a question, so an address with no answer is a question this
 * archive cannot answer -- which is worth saying in the reader's language,
 * with the questions it can answer offered beside it.
 */
/**
 * A question's address, per language.
 *
 * The words are sorted here rather than at each call site, because `/a/b` and
 * `/b/a` are one question and only one of them is a page. Pair it with
 * `withBase()`, which is the only thing that knows where the site is served
 * from.
 */
export const browsePath = (lang: Lang, ...words: string[]) =>
  `${lang === 'en' ? '' : `/${lang}`}/${[...new Set(words.flat())].sort().join('/')}`

/** The words around the arrangement machine. */
export const ARRANGEMENT_UI: Record<Lang, {
  /** Before the size of the space. */
  of: string
  turn: string
  back: string
  address: string
  /** The arrangement on screen names this number, checked both ways. */
  exact: string
  drifted: string
  share: string
  copied: string
}> = {
  en: {
    of: 'One of',
    turn: 'Turn this line',
    back: 'Turn this line back',
    address: 'Address',
    exact: 'This number names this arrangement, and this arrangement names this number. Nothing is stored: the same address rebuilds the same page on any machine.',
    drifted: 'This address is not an arrangement.',
    share: 'Copy this address',
    copied: 'Copied'
  },
  bg: {
    of: 'Едно от',
    turn: 'Завърти този ред',
    back: 'Върни този ред',
    address: 'Адрес',
    exact: 'Това число назовава тази подредба, а подредбата назовава числото. Нищо не се съхранява: същият адрес възстановява същата страница на всяка машина.',
    drifted: 'Този адрес не е подредба.',
    share: 'Копирай адреса',
    copied: 'Копирано'
  },
  de: {
    of: 'Eine von',
    turn: 'Diese Zeile weiterdrehen',
    back: 'Diese Zeile zurückdrehen',
    address: 'Adresse',
    exact: 'Diese Zahl benennt diese Anordnung, und diese Anordnung benennt diese Zahl. Nichts wird gespeichert: dieselbe Adresse baut dieselbe Seite auf jedem Gerät wieder auf.',
    drifted: 'Diese Adresse ist keine Anordnung.',
    share: 'Adresse kopieren',
    copied: 'Kopiert'
  }
}

export const MISSING: Record<Lang, {
  /** `%1` is the question as it was asked. */
  asked: string
  /** The words are known; nothing carries all of them. */
  empty: string
  /** A word the archive does not use. */
  unknown: string
  /** Above the questions that do have answers. */
  instead: string
  /** Not a question at all. */
  plain: string
}> = {
  en: {
    asked: 'No photograph here answers %1.',
    empty: 'Those words exist, but nothing carries all of them at once.',
    unknown: 'This archive does not use that word.',
    instead: 'Questions with answers',
    plain: 'That page does not exist.'
  },
  bg: {
    asked: 'Тук няма снимка, която да отговаря на %1.',
    empty: 'Тези думи съществуват, но нищо не носи всички наведнъж.',
    unknown: 'Този архив не използва тази дума.',
    instead: 'Въпроси с отговори',
    plain: 'Тази страница не съществува.'
  },
  de: {
    asked: 'Hier beantwortet kein Bild %1.',
    empty: 'Diese Wörter gibt es, aber nichts trägt sie alle zugleich.',
    unknown: 'Dieses Archiv verwendet dieses Wort nicht.',
    instead: 'Fragen mit Antworten',
    plain: 'Diese Seite existiert nicht.'
  }
}

export const BROWSE_UI: Record<Lang, {
  /** `%1` is the joined names of the words asked for. */
  title: string
  description: string
  /** `%1` shown of `%2` found. */
  showing: string
  all: string
  /** Above the narrower paths that lead out of this one. */
  narrower: string
}> = {
  en: {
    title: '%1',
    description: 'Photographs and films of Vienna clown Titania Chaos: %1.',
    showing: 'Showing %1 of %2',
    all: 'All %1',
    narrower: 'Narrower'
  },
  bg: {
    title: '%1',
    description: 'Снимки и филми на виенската клоунеса Титания Хаос: %1.',
    showing: 'Показани %1 от %2',
    all: 'Всички %1',
    narrower: 'По-точно'
  },
  de: {
    title: '%1',
    description: 'Fotos und Filme der Wiener Clownin Titania Chaos: %1.',
    showing: '%1 von %2 gezeigt',
    all: 'Alle %1',
    narrower: 'Enger'
  }
}

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

/** Page one is the category itself; the rest hang under it. */
export const categoryPagePath = (lang: Lang, tag: string, page: number) =>
  page <= 1 ? categoryPath(lang, tag) : `${categoryPath(lang, tag)}/${page}`

export { LANGS }
