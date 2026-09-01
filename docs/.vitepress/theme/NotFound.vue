<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { data } from '../media.data'
import type { Tag } from '../media.data'
import { BROWSE_UI, MISSING, TAG_NAMES, browsePath, fill, asTitle } from '../categories.ts'
import { useLang } from './useLang.ts'
import BrowsePath from './BrowsePath.vue'

/**
 * An address nobody built, answered anyway.
 *
 * A path here is a question — `/portrait/street` asks for the frames carrying
 * both — and 42 of them are built as real pages because they have at least
 * three frames on them. That threshold decides which listings are worth
 * pre-rendering; it should not decide which questions are real, and this is
 * where the rest are answered:
 *
 *   A question with an answer is rendered by the same component the built
 *   listings use, with the same heading, the same grid and the same count.
 *   There is nothing on it to tell a reader it was computed on arrival.
 *
 *   A question whose listing exists under another address — the words in
 *   another order — redirects to it. Two URLs for one question is what the
 *   single alphabetical order exists to prevent, so this must not answer in
 *   its place.
 *
 *   Only a word the archive does not use gets the not-found treatment, and
 *   even that says which word and offers the questions that do have answers.
 *
 * The status stays 404 on a static host — only a file can be 200 — so what is
 * fixed here is what arrives, not what the header says.
 */

const { lang } = useLang()
const t = computed(() => MISSING[lang.value])
const ui = computed(() => BROWSE_UI[lang.value])
const names = computed(() => TAG_NAMES[lang.value])

/**
 * The words a path may be made of.
 *
 * `feed` is not one of them, for the same reason the build excludes it: it
 * answers from synced posts that exist only for whoever holds a token, so the
 * page would be different on every machine and empty on most.
 */
const vocabulary = computed(() => Object.keys(names.value).filter((w) => w !== 'feed'))

const asked = ref<string[]>([])
const ready = ref(false)

/** How many frames carry all of these words. */
const carrying = (words: string[]) =>
  data.media.filter((m) => words.every((w) => m.tags.includes(w as Tag))).length

/**
 * The threshold the build uses. It is one now, so every question the archive
 * can answer is a real page and this component sees only two cases: a word the
 * archive does not use, and a question whose page exists under another order.
 */
const ENOUGH = 1

onMounted(() => {
  // `/de/portrait/street` -> ['portrait','street']. The language prefix is
  // ours; everything after it is the question.
  const parts = window.location.pathname.replace(/\/+$/, '').split('/').filter(Boolean)
  while (parts.length && ['bg', 'de'].includes(parts[0])) parts.shift()
  asked.value = parts

  // The same question in another order has a page: send them to it rather than
  // answering here, or one question ends up with two addresses.
  if (asked.value.length > 1 && asked.value.every((w) => vocabulary.value.includes(w))) {
    const canonical = [...new Set(asked.value)].sort()
    if (canonical.join('/') !== asked.value.join('/') && carrying(canonical) >= ENOUGH) {
      window.location.replace(withBase(browsePath(lang.value, ...canonical)))
      return
    }
  }
  ready.value = true

  // The document was 404.html, so without this the tab reads "404" over what
  // is in every other respect the listing.
  if (answerable.value) {
    const site = document.title.split('|').slice(1).join('|').trim()
    const heading = asTitle(spoken.value)
    document.title = site ? `${heading} | ${site}` : heading
  }
})

const unknown = computed(() => asked.value.filter((w) => !vocabulary.value.includes(w)))

const spoken = computed(() =>
  asked.value.map((w) => names.value[w as Tag] ?? w).join(' · ')
)

/**
 * A question this archive can answer: every word known, and at least one frame
 * carrying all of them. One frame is enough — a listing with one picture is
 * not worth pre-rendering, which is a different claim from not worth showing
 * to somebody who asked for it by name.
 */
const answerable = computed(
  () => asked.value.length > 0 && unknown.value.length === 0 && carrying(asked.value) > 0
)

/**
 * The questions worth offering instead: each one word shorter that still has a
 * listing, and the single words if that leaves nothing.
 */
const instead = computed(() => {
  const known = asked.value.filter((w) => vocabulary.value.includes(w))
  const shorter = known
    .map((drop) => known.filter((w) => w !== drop))
    .filter((words) => words.length > 0)
    .map((words) => [...new Set(words)].sort())

  const candidates = shorter.length ? shorter : vocabulary.value.map((w) => [w])
  const seen = new Set<string>()
  return candidates
    .map((words) => ({ words, n: carrying(words) }))
    .filter((c) => c.n >= ENOUGH && !seen.has(c.words.join('/')) && seen.add(c.words.join('/')))
    .sort((a, b) => b.n - a.n)
    .slice(0, 8)
    .map((c) => ({
      name: asTitle(c.words.map((w) => names.value[w as Tag]).join(' · ')),
      n: c.n,
      path: withBase(browsePath(lang.value, ...c.words))
    }))
})
</script>

<template>
  <!-- Answerable: the listing, by the component that renders the built ones.
       Same template, same page. -->
  <div v-if="ready && answerable" class="missing__found">
    <BrowsePath :want="(asked as Tag[])" />
  </div>

  <div v-else-if="ready" class="missing">
    <p class="ui-label missing__code">404</p>

    <template v-if="asked.length">
      <h1 class="missing__title">{{ fill(t.asked, asTitle(spoken)) }}</h1>
      <p class="missing__lead">{{ unknown.length ? t.unknown : t.empty }}</p>
    </template>
    <template v-else>
      <h1 class="missing__title">{{ t.plain }}</h1>
    </template>

    <nav v-if="instead.length" class="missing__instead ui-separator" :aria-label="t.instead">
      <span class="ui-label missing__lead-in">{{ t.instead }}</span>
      <UiBadge v-for="one in instead" :key="one.path" :href="one.path" :count="one.n">{{ one.name }}</UiBadge>
    </nav>

    <p class="missing__home">
      <a :href="withBase(lang === 'en' ? '/' : `/${lang}/`)">{{ ui.narrower }}</a>
    </p>
  </div>
</template>

<style scoped>
.missing__found { max-width: 48rem; margin: 0 auto; padding: 3rem 1.5rem 6rem; }
.missing { max-width: 44rem; margin: 0 auto; padding: 6rem 1.5rem 8rem; }
.missing__code { margin: 0 0 0.75rem; letter-spacing: 0.12em; }
.missing__title {
  margin: 0 0 0.75rem;
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.15;
  text-wrap: balance;
}
.missing__lead { margin: 0 0 2rem; color: var(--vp-c-text-2); line-height: 1.6; text-wrap: pretty; }
/* Chips are `.ui-badge`, the lead is `.ui-label`, the rule is
   `.ui-separator`. What is left is where they sit. */
.missing__instead { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: baseline; margin-top: 0; }
.missing__lead-in { width: 100%; margin-bottom: 0.25rem; }
.missing__home { margin: 2.5rem 0 0; }
</style>
