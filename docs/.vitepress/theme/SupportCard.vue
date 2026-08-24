<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()

const COPY = {
  en: {
    eyebrow: 'Keep the play moving',
    title: 'Contact & support',
    body: 'Invite Titania to an event, ask about a workshop, or support the independent clown project.',
    contact: 'Contact Titania',
    support: 'Support via Revolut'
  },
  bg: {
    eyebrow: 'Нека играта продължи',
    title: 'Контакт и подкрепа',
    body: 'Поканете Титания на събитие, попитайте за работилница или подкрепете независимия клоунски проект.',
    contact: 'Пишете на Титания',
    support: 'Подкрепа през Revolut'
  },
  de: {
    eyebrow: 'Das Spiel am Laufen halten',
    title: 'Kontakt & Unterstützung',
    body: 'Laden Sie Titania zu einer Veranstaltung ein, fragen Sie nach einem Workshop oder unterstützen Sie das unabhängige Clown-Projekt.',
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
  </aside>
</template>
