<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { data } from '../media.data'
import type { Media, Placement } from '../media.data'
import { useLang } from './useLang.ts'

/**
 * The hero: every picture and film on the page, one slide each, shown with
 * the words that surround it further down.
 *
 * The typography is the point. A slide's title is the heading of the section
 * its picture sits in, and its text is that section's first paragraph -- both
 * read out of the Markdown at build time by media.data.ts, so the hero is in
 * the served HTML rather than assembled in the browser, and a reader with no
 * JavaScript gets the first slide and its words rather than an empty box.
 *
 * The title is rendered one level below the heading it came from: the page's
 * h1 section slides an h2, an h2 section slides an h3, and so on down. So the
 * hero is a map of the page drawn in the page's own type -- the size of a
 * slide's title tells you how deep in the page that picture actually is,
 * before you have scrolled to it.
 *
 * ---- about the sliding ---------------------------------------------------
 *
 * It advances on its own, because a hero that does not is a picture. But each
 * slide carries a paragraph to read, and text that moves while it is being
 * read is a bug wearing a feature's clothes. So: eight seconds, paused while
 * the pointer or the keyboard is inside it, paused while the tab is hidden,
 * stopped for good the moment the reader takes control, and never started at
 * all under `prefers-reduced-motion`. The controls are always there.
 */

const props = withDefaults(
  defineProps<{
    /** Seconds per slide. `0` never advances on its own. */
    every?: number
  }>(),
  { every: 8 }
)

const { lang, slug } = useLang()
const t = computed(() => data.ui[lang.value])

const slides = computed<{ place: Placement; frame: Media }[]>(() =>
  (data.placements[`${lang.value}/${slug.value}`] ?? [])
    .map((place) => ({ place, frame: data.media.find((m) => m.id === place.id)! }))
    .filter((s) => s.frame)
)

const at = ref(0)
const held = ref(false)
const stopped = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const current = computed(() => slides.value[at.value] ?? null)

function go(to: number) {
  const n = slides.value.length
  if (n) at.value = (to + n) % n
}

/** Any move by the reader ends the automatic advance for good. */
function take(to: number) {
  stopped.value = true
  go(to)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') { e.preventDefault(); take(at.value + 1) }
  if (e.key === 'ArrowLeft') { e.preventDefault(); take(at.value - 1) }
}

const still = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

onMounted(() => {
  if (props.every <= 0 || still()) return
  timer = setInterval(() => {
    if (held.value || stopped.value || document.hidden) return
    go(at.value + 1)
  }, props.every * 1000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })

// A different page, or a different language, is a different set of slides.
watch(slides, () => { at.value = 0 })

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
const position = (i: number) =>
  t.value.position.replace('%1', String(i + 1)).replace('%2', String(slides.value.length))
</script>

<template>
  <section
    v-if="slides.length"
    class="hero"
    :aria-roledescription="'carousel'"
    :aria-label="t.region"
    @mouseenter="held = true"
    @mouseleave="held = false"
    @focusin="held = true"
    @focusout="held = false"
    @keydown="onKey"
  >
    <div class="hero__stage">
      <div
        v-for="(slide, i) in slides"
        :key="slide.place.id"
        class="hero__slide"
        :class="{ 'hero__slide--on': i === at }"
        role="group"
        :aria-roledescription="slide.frame.kind === 'video' ? t.video : t.photo"
        :aria-label="position(i)"
        :aria-hidden="i === at ? undefined : 'true'"
        :inert="i === at ? undefined : true"
      >
        <div class="hero__picture">
          <video
            v-if="slide.frame.mp4"
            class="hero__video"
            :src="slide.frame.mp4"
            :poster="slide.frame.file"
            :aria-label="slide.frame.alt[lang]"
            controls
            playsinline
            preload="none"
          />
          <img
            v-else
            class="hero__image"
            :src="slide.frame.file"
            :alt="slide.frame.alt[lang]"
            :width="slide.frame.width"
            :height="slide.frame.height"
            :loading="i === 0 ? 'eager' : 'lazy'"
            decoding="async"
          />
        </div>

        <div class="hero__words">
          <p class="hero__eyebrow">
            <span class="hero__count">{{ position(i) }}</span>
            {{ slide.frame.kind === 'video' ? t.video : t.photo
            }}<template v-if="slide.frame.seconds"> · {{ clock(slide.frame.seconds) }}</template>
          </p>
          <!-- One level below the heading this slide came from: h1 slides h2,
               h2 slides h3, and so on. -->
          <component :is="`h${slide.place.level}`" class="hero__title">
            {{ slide.place.title }}
          </component>
          <p v-if="slide.place.text" class="hero__text">{{ slide.place.text }}</p>
          <p v-if="slide.frame.permalink" class="hero__source">
            <a :href="slide.frame.permalink" rel="noopener" target="_blank">{{ t.source }}</a>
          </p>
        </div>
      </div>
    </div>

    <div v-if="slides.length > 1" class="hero__controls">
      <button class="hero__step" type="button" :aria-label="t.previous" @click="take(at - 1)">&#8249;</button>
      <ol class="hero__dots">
        <li v-for="(slide, i) in slides" :key="slide.place.id">
          <button
            class="hero__dot"
            :class="{ 'hero__dot--on': i === at }"
            type="button"
            :aria-label="`${position(i)}: ${slide.place.title}`"
            :aria-current="i === at ? 'true' : undefined"
            @click="take(i)"
          />
        </li>
      </ol>
      <button class="hero__step" type="button" :aria-label="t.next" @click="take(at + 1)">&#8250;</button>
    </div>
  </section>
</template>

<style scoped>
.hero {
  /* Never beside a figure: the hero is the map of the page, not part of a
     paragraph. */
  clear: both;
  margin: 0 0 2.5rem;
  padding: 1.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  background: linear-gradient(150deg, var(--vp-c-brand-soft), var(--vp-c-bg-soft) 62%);
}

/* Every slide is in the served HTML — a reader with no JavaScript gets the
   first one and its words. The stack keeps the box the height of its tallest
   slide, so advancing never makes the page jump. */
.hero__stage { display: grid; }
.hero__slide {
  grid-area: 1 / 1;
  display: grid;
  grid-template-columns: minmax(0, 15rem) minmax(0, 1fr);
  gap: 1.4rem;
  align-items: center;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.45s ease;
}
.hero__slide--on { opacity: 1; visibility: visible; }

.hero__picture { min-width: 0; }
.hero__image,
.hero__video {
  display: block;
  width: 100%;
  height: auto;
  margin: 0;
  max-height: 17rem;
  object-fit: cover;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.hero__words { min-width: 0; }
.hero__eyebrow {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0 0 0.35rem;
  color: var(--vp-c-text-3);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.hero__count { color: var(--vp-c-brand-1); font-variant-numeric: tabular-nums; }

/* The title keeps whatever size its level gives it — that is the whole point
   of demoting it — so only the things the document theme would add are taken
   away: the rule above an h2, and the anchor spacing. */
.hero__title {
  margin: 0 0 0.5rem !important;
  padding: 0 !important;
  border-top: 0 !important;
  max-width: 26ch;
  letter-spacing: -0.02em;
  line-height: 1.2;
  text-wrap: balance;
}
.hero__text {
  margin: 0;
  max-width: 52ch;
  color: var(--vp-c-text-2);
  font-size: 0.9375rem;
  line-height: 1.6;
  text-wrap: pretty;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  overflow: hidden;
}

.hero__source { margin: 0.5rem 0 0; font-size: 0.8125rem; }

.hero__controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
}
.hero__step {
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 50%;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
}
.hero__step:hover { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }
.hero__dots { display: flex; gap: 0.4rem; margin: 0; padding: 0; list-style: none; }
.hero__dots li { margin: 0; }
.hero__dot {
  width: 0.55rem;
  height: 0.55rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--vp-c-divider);
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.hero__dot--on { background: var(--vp-c-brand-1); transform: scale(1.25); }
.hero__step:focus-visible,
.hero__dot:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }

@media (max-width: 720px) {
  .hero__slide { grid-template-columns: minmax(0, 1fr); gap: 1rem; }
  .hero__image,
  .hero__video { max-height: 14rem; }
}

@media (prefers-reduced-motion: reduce) {
  .hero__slide { transition: none; }
  .hero__dot { transition: none; }
}
</style>
