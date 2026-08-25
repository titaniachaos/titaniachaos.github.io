<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data } from '../workshops.data'
import type { Lang } from '../workshops.data'
import { useLang } from './useLang.ts'

/**
 * The announced dates, or an honest empty state.
 *
 * Past dates are dropped in the browser rather than at build time, so a site
 * that has not been rebuilt for a month still shows the right thing.
 *
 * Each date carries schema.org Event microdata: this is the one part of the
 * site Google can show as a rich result, and a workshop with a date, a place
 * and a price is exactly what that markup is for.
 */

const { lang, dateTag } = useLang()

const ui = computed(() => data.ui[lang.value])

const upcoming = computed(() => {
  const now = Date.now()
  return data.workshops.filter((w) => Date.parse(w.end) >= now)
})

/**
 * The site writes British English everywhere else, and `en` alone gives US
 * formatting: "March 6, 2027, 03:00 PM" against "Saturday 6 March 2027,
 * 15:00". German and Bulgarian are already 24-hour and need no help.
 */
const formatLocale = dateTag

const dateFormat = computed(
  () =>
    new Intl.DateTimeFormat(formatLocale.value, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
)

const timeFormat = computed(
  () => new Intl.DateTimeFormat(formatLocale.value, { hour: 'numeric', minute: '2-digit' })
)

const when = (w: { start: string; end: string }) =>
  `${dateFormat.value.format(new Date(w.start))}, ${timeFormat.value.format(new Date(w.start))}–${timeFormat.value.format(new Date(w.end))}`

/** en-GB puts the sign first, de and bg put it last. Intl knows; we do not. */
const money = computed(
  () =>
    new Intl.NumberFormat(formatLocale.value, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    })
)

const languageNames = computed(() => new Intl.DisplayNames([formatLocale.value], { type: 'language' }))

const heldIn = (codes: Lang[]) =>
  codes.map((c) => languageNames.value.of(c) ?? c).join(', ')

const mailto = (w: { id: string; title: Record<Lang, string> }) =>
  `mailto:agent@tatianapetkova.com?subject=${encodeURIComponent(`${ui.value.subject}: ${w.title[lang.value]}`)}`
</script>

<template>
  <p v-if="upcoming.length === 0" class="empty">{{ ui.empty }}</p>

  <ul v-else class="dates">
    <li
      v-for="w in upcoming"
      :key="w.id"
      :id="w.id"
      class="date"
      itemscope
      itemtype="https://schema.org/Event"
    >
      <p class="title" itemprop="name">{{ w.title[lang] }}</p>

      <p class="when">
        <time itemprop="startDate" :datetime="w.start">{{ when(w) }}</time>
        <meta itemprop="endDate" :content="w.end" />
      </p>

      <p class="where" itemprop="location" itemscope itemtype="https://schema.org/Place">
        <span itemprop="name">{{ w.place[lang] }}</span>
      </p>

      <p class="summary" itemprop="description">{{ w.summary[lang] }}</p>

      <p class="facts">
        <span itemprop="offers" itemscope itemtype="https://schema.org/Offer">
          {{ money.format(w.price) }}
          <meta itemprop="price" :content="String(w.price)" />
          <meta itemprop="priceCurrency" content="EUR" />
          <link itemprop="availability" href="https://schema.org/InStock" />
        </span>
        <span class="sep">·</span>
        <span>{{ w.places }} {{ ui.places }}</span>
        <span class="sep">·</span>
        <span>{{ ui.held }} {{ heldIn(w.spokenIn) }}</span>
      </p>

      <a class="contact-button" :href="mailto(w)">{{ ui.book }}</a>
    </li>
  </ul>
</template>

<style scoped>
.empty {
  margin: 0 0 1rem;
  color: var(--vp-c-text-2);
  max-width: 62ch;
}

.dates {
  list-style: none;
  margin: 1.2rem 0 1.5rem;
  padding: 0;
  display: grid;
  gap: 1rem;
}

.date {
  border: 1px solid var(--vp-c-divider);
  border-left: 3px solid var(--vp-c-brand-1);
  border-radius: 10px;
  padding: 1.1rem 1.3rem;
  background: var(--vp-c-bg-soft);
}

.title {
  margin: 0 0 0.3rem;
  font-size: 1.08rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--vp-c-text-1);
}

.when {
  margin: 0 0 0.15rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  font-variant-numeric: tabular-nums;
}

.where {
  margin: 0 0 0.6rem;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.summary {
  margin: 0 0 0.7rem;
  max-width: 60ch;
  line-height: 1.6;
}

.facts {
  margin: 0 0 0.9rem;
  font-size: 0.88rem;
  color: var(--vp-c-text-2);
  font-variant-numeric: tabular-nums;
}

.facts .sep {
  margin: 0 0.45rem;
  color: var(--vp-c-text-3);
}
</style>
