import { defineLoader } from 'vitepress'

/**
 * Announced workshop dates.
 *
 * The site sells workshops and, until this file has entries in it, cannot tell
 * anyone when one is — it asks them to write and ask. Adding a date should
 * therefore be one small edit here, not a page rewrite in three languages.
 *
 * Everything a visitor needs to decide goes in the record: when, where, how
 * long, what it costs, who it is for. A record missing any of those fails the
 * build rather than publishing a half-announcement, because a date with no
 * price is a second email rather than a booking.
 *
 * Past dates are filtered in the browser, not here, so the page stays correct
 * without a rebuild.
 */

export type Lang = 'en' | 'bg' | 'de'

export interface Workshop {
  /** Stable id, used as the anchor and the schema.org identifier. */
  id: string
  /** ISO 8601 with an offset, e.g. 2026-10-04T14:00:00+02:00 */
  start: string
  end: string
  /** Where it happens: venue and city, as a visitor would need to find it. */
  place: Record<Lang, string>
  /** What it is called. */
  title: Record<Lang, string>
  /** One line: who it is for and what happens. */
  summary: Record<Lang, string>
  /** In euro. Use `0` for free and say why in the summary. */
  price: number
  /** How many people can come. */
  places: number
  /** Language(s) it is held in. */
  spokenIn: Lang[]
}

export interface Data {
  workshops: Workshop[]
  ui: Record<Lang, {
    heading: string
    empty: string
    from: string
    places: string
    held: string
    book: string
    subject: string
  }>
}

declare const data: Data
export { data }

/**
 * No dates announced yet. Add one by copying this shape:
 *
 *   {
 *     id: 'clown-basics-october',
 *     start: '2026-10-04T14:00:00+02:00',
 *     end: '2026-10-04T18:00:00+02:00',
 *     place: { en: 'Theater Olé, Vienna', bg: '…', de: 'Theater Olé, Wien' },
 *     title: { en: 'Clown basics', bg: '…', de: 'Clown-Grundlagen' },
 *     summary: { en: 'For adult beginners…', bg: '…', de: 'Für Erwachsene…' },
 *     price: 90,
 *     places: 12,
 *     spokenIn: ['de', 'en']
 *   }
 */
const workshops: Workshop[] = []

const ui: Data['ui'] = {
  en: {
    heading: 'Upcoming workshops',
    empty: 'No dates are announced at the moment. Write and ask — workshops are also arranged for groups on request.',
    from: 'from',
    places: 'places',
    held: 'held in',
    book: 'Book a place',
    subject: 'Workshop booking'
  },
  bg: {
    heading: 'Предстоящи работилници',
    empty: 'В момента няма обявени дати. Пишете и попитайте — работилници се организират и за групи по заявка.',
    from: 'от',
    places: 'места',
    held: 'на',
    book: 'Запазете място',
    subject: 'Записване за работилница'
  },
  de: {
    heading: 'Kommende Workshops',
    empty: 'Zurzeit sind keine Termine angekündigt. Schreiben Sie und fragen Sie nach — Workshops werden auf Anfrage auch für Gruppen veranstaltet.',
    from: 'ab',
    places: 'Plätze',
    held: 'auf',
    book: 'Platz buchen',
    subject: 'Workshop-Buchung'
  }
}

const LANGS: Lang[] = ['en', 'bg', 'de']

export default defineLoader({
  async load(): Promise<Data> {
    const seen = new Set<string>()

    for (const w of workshops) {
      const where = `workshop ${w.id}`
      if (seen.has(w.id)) throw new Error(`${where}: duplicate id`)
      seen.add(w.id)

      for (const [field, value] of [['start', w.start], ['end', w.end]] as const) {
        if (Number.isNaN(Date.parse(value))) throw new Error(`${where}: ${field} "${value}" is not a date`)
      }
      if (Date.parse(w.end) <= Date.parse(w.start)) throw new Error(`${where}: it ends before it starts`)
      if (!/[+-]\d{2}:\d{2}$|Z$/.test(w.start)) {
        throw new Error(`${where}: start needs a UTC offset, or it means a different hour in every country`)
      }

      for (const field of ['place', 'title', 'summary'] as const) {
        for (const lang of LANGS) {
          if (!w[field][lang]?.trim()) throw new Error(`${where}: ${field} has no ${lang}`)
        }
      }

      // A date without a price or a size is a second email, not a booking.
      if (typeof w.price !== 'number' || w.price < 0) throw new Error(`${where}: price must be a number`)
      if (!Number.isInteger(w.places) || w.places < 1) throw new Error(`${where}: places must be a whole number`)
      if (w.spokenIn.length === 0) throw new Error(`${where}: say which language it is held in`)
    }

    return { workshops: [...workshops].sort((a, b) => Date.parse(a.start) - Date.parse(b.start)), ui }
  }
})
