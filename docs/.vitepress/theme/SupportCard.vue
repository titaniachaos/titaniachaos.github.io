<script setup lang="ts">
import { computed } from 'vue'
import { useLang } from './useLang.ts'

/**
 * Where this instance is mounted. The card fills the slot the default theme
 * reserves for Carbon ads — our own sponsorship ask rather than a third-party
 * script — and that slot is display:none below 1280px, so it is mounted twice
 * and the CSS shows exactly one.
 */
const props = withDefaults(defineProps<{ place?: 'aside' | 'inline' }>(), { place: 'inline' })

const { lang } = useLang()

const COPY = {
  en: {
    eyebrow: 'Keep the play moving',
    title: 'Bookings & enquiries',
    body: 'Invite Titania to an event or ask about a workshop, performance or playful photo experience.',
    contact: 'Contact Titania',
    support: 'Support via Revolut'
  },
  bg: {
    eyebrow: 'Нека играта продължи',
    title: 'Резервации и запитвания',
    body: 'Поканете Титания на събитие или попитайте за работилница, представление или забавно фотопреживяване.',
    contact: 'Пишете на Титания',
    support: 'Подкрепа през Revolut'
  },
  de: {
    eyebrow: 'Das Spiel am Laufen halten',
    title: 'Buchungen & Anfragen',
    body: 'Laden Sie Titania zu einer Veranstaltung ein oder fragen Sie nach einem Workshop, einer Performance oder einem spielerischen Fotoerlebnis.',
    contact: 'Titania kontaktieren',
    support: 'Über Revolut unterstützen'
  }
} as const

// `lang` carries region subtags such as `de-AT`; match on the base language.
const t = computed(() => COPY[lang.value] ?? COPY.en)
</script>

<template>
  <aside class="support-card" :class="`support-card--${props.place}`" :aria-labelledby="props.place === 'aside' ? 'support-card-title' : 'support-card-title-inline'">
    <p class="support-card__eyebrow">{{ t.eyebrow }}</p>
    <p :id="props.place === 'aside' ? 'support-card-title' : 'support-card-title-inline'" class="support-card__title">{{ t.title }}</p>
    <p>{{ t.body }}</p>
    <div class="support-card__actions">
      <a class="support-card__action" href="mailto:agent@tatianapetkova.com">
        {{ t.contact }}
      </a>
      <a
        class="support-card__action support-card__action--secondary"
        href="https://revolut.me/titaniachaos"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ t.support }}
      </a>
    </div>
  </aside>
</template>
