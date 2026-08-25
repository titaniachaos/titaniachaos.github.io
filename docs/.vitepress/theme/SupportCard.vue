<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()

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
const t = computed(() => COPY[lang.value.split('-')[0] as keyof typeof COPY] ?? COPY.en)
</script>

<template>
  <aside class="support-card" aria-labelledby="support-card-title">
    <p class="support-card__eyebrow">{{ t.eyebrow }}</p>
    <p id="support-card-title" class="support-card__title">{{ t.title }}</p>
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
