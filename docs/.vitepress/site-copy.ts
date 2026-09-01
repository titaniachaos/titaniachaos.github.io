/**
 * Every translatable string the metadata layer needs, in one place.
 *
 * It used to be scattered through seo.ts as constants, and all of it was
 * English. That was invisible in the browser and wrong everywhere it counted:
 * `/bg/events` served `og:image:alt` in English, fell back to an English
 * `og:description`, and emitted a JSON-LD block whose `jobTitle`, person
 * description, service names and offer text were English while the same node
 * declared `inLanguage: 'bg'`. A search engine was being told, in structured
 * form, that English prose was Bulgarian.
 *
 * The wording is not invented here. Each string is the one the page itself
 * already says -- the person description is the tagline's own last line, the
 * service names are the pages' own titles -- because a card or a rich result
 * that says something the page does not is the other half of the same fault.
 */

import type { Lang } from './locale.ts'

/** The social images, and what each one shows. */
export const IMAGE_KEYS = [
  'titania-chaos-card.jpg',
  'titania-chaos-hero.webp',
  'titania-juggling.jpg',
  'work-with-titania-card.jpg'
] as const

export type ImageKey = (typeof IMAGE_KEYS)[number]

/** The services that carry structured data, keyed by their locale-stripped slug. */
export const SERVICE_SLUGS = ['/events', '/work-with-titania'] as const

export type ServiceSlug = (typeof SERVICE_SLUGS)[number]

export interface ServiceCopy {
  name: string
  serviceType: string
  /** Only where a published price exists. */
  offerDescription?: string
}

export interface SiteCopy {
  /** `og:site_name`, and the publisher name in JSON-LD. */
  siteName: string
  /** The `og:description` a page falls back to when it declares none. */
  siteDescription: string
  jobTitle: string
  personDescription: string
  imageAlt: Record<ImageKey, string>
  services: Record<ServiceSlug, ServiceCopy>
  feed: { title: string; subtitle: string }
}

export const COPY: Record<Lang, SiteCopy> = {
  en: {
    siteName: 'Titania Chaos',
    siteDescription: 'Clown workshops, physical comedy, events and parties in Vienna.',
    jobTitle: 'Clown artist, psychologist and language teacher',
    personDescription:
      'Titania Chaos is a professional clown, workshop facilitator and bookable performer based in Vienna.',
    imageAlt: {
      'titania-chaos-card.jpg': 'Titania Chaos',
      'titania-chaos-hero.webp': 'Titania Chaos',
      'titania-juggling.jpg': 'Tatiana Petkova as Titania Chaos, catching a juggling club',
      'work-with-titania-card.jpg':
        'Titania Chaos performing with a microphone in front of an audience'
    },
    services: {
      '/events': {
        name: "Children's birthday parties with Titania Chaos",
        serviceType: "Children's birthday entertainment",
        offerDescription: 'Up to 10 children, approximately 2-3 hours, plus taxi within Vienna.'
      },
      '/work-with-titania': {
        name: 'Titania Chaos and her time-travelling camera',
        serviceType: 'Walkabout performance and photo experience'
      }
    },
    feed: {
      title: 'Titania Chaos',
      subtitle: 'Clown workshops, performances and events in Vienna.'
    }
  },

  bg: {
    siteName: 'Титания Хаос',
    siteDescription: 'Клоунски работилници, физическа комедия, събития и празници във Виена.',
    jobTitle: 'Клоун артист, психолог и учител по езици',
    personDescription:
      'Титания Хаос е професионален клоун, водещ на работилници и артист за събития, базирана във Виена.',
    imageAlt: {
      'titania-chaos-card.jpg': 'Титания Хаос',
      'titania-chaos-hero.webp': 'Титания Хаос',
      'titania-juggling.jpg': 'Татяна Петкова като Титания Хаос, улавяща жонгльорска бухалка',
      'work-with-titania-card.jpg': 'Титания Хаос с микрофон пред публика'
    },
    services: {
      '/events': {
        name: 'Детски рождени дни с Титания Хаос',
        serviceType: 'Клоун за детски рожден ден',
        offerDescription: 'До 10 деца, приблизително 2-3 часа, плюс такси в рамките на Виена.'
      },
      '/work-with-titania': {
        name: 'Титания Хаос и нейният пътуващ във времето фотоапарат',
        serviceType: 'Разходка-пърформанс и фото преживяване'
      }
    },
    feed: {
      title: 'Титания Хаос',
      subtitle: 'Клоунски работилници, изпълнения и събития във Виена.'
    }
  },

  de: {
    siteName: 'Titania Chaos',
    siteDescription: 'Clown-Workshops, Körperkomik, Veranstaltungen und Feste in Wien.',
    jobTitle: 'Clown-Künstlerin, Psychologin und Sprachlehrerin',
    personDescription:
      'Titania Chaos ist eine professionelle Clownin, Workshop-Leiterin und buchbare Performerin mit Sitz in Wien.',
    imageAlt: {
      'titania-chaos-card.jpg': 'Titania Chaos',
      'titania-chaos-hero.webp': 'Titania Chaos',
      'titania-juggling.jpg': 'Tatiana Petkova als Titania Chaos, fängt eine Jonglierkeule',
      'work-with-titania-card.jpg': 'Titania Chaos mit Mikrofon vor Publikum'
    },
    services: {
      '/events': {
        name: 'Kindergeburtstage mit Titania Chaos',
        serviceType: 'Clown für Kindergeburtstag',
        offerDescription: 'Bis zu 10 Kinder, etwa 2-3 Stunden, zuzüglich Taxi innerhalb Wiens.'
      },
      '/work-with-titania': {
        name: 'Titania Chaos und ihre zeitreisende Kamera',
        serviceType: 'Walkact und Foto-Erlebnis'
      }
    },
    feed: {
      title: 'Titania Chaos',
      subtitle: 'Clown-Workshops, Auftritte und Veranstaltungen in Wien.'
    }
  }
}
