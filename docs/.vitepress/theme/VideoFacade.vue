<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'

/**
 * A YouTube video that contacts YouTube only when someone asks for it.
 *
 * An ordinary embed loads Google's scripts and sets cookies on page load,
 * before any click and for every visitor. The privacy policy on this site says
 * data is not shared with third parties, and an ordinary embed would make that
 * untrue on every page carrying one.
 *
 * So this ships a self-hosted thumbnail -- not YouTube's, which would be a
 * request to Google in itself -- and swaps in the player on click, through
 * youtube-nocookie.com. Nothing leaves the reader's browser until they decide
 * it should.
 */

const props = defineProps<{ id: string; thumb: string; title: string }>()
const playing = ref(false)
const { lang } = useData()

type Lang = 'en' | 'bg' | 'de'
const l = computed<Lang>(() => {
  const base = lang.value.split('-')[0]
  return (['en', 'bg', 'de'] as const).includes(base as Lang) ? (base as Lang) : 'en'
})

const COPY: Record<Lang, { play: string; note: string }> = {
  en: { play: 'Play', note: 'Loads from YouTube when you press play' },
  bg: { play: 'Пусни', note: 'Зарежда се от YouTube чак когато натиснете' },
  de: { play: 'Abspielen', note: 'Lädt erst beim Klick von YouTube' }
}
const t = computed(() => COPY[l.value])

const src = computed(
  () => `https://www.youtube-nocookie.com/embed/${props.id}?autoplay=1&rel=0`
)
</script>

<template>
  <figure class="video">
    <button v-if="!playing" class="video__poster" type="button" @click="playing = true">
      <img :src="thumb" :alt="title" width="800" height="450" loading="lazy" />
      <span class="video__play" aria-hidden="true">▶</span>
      <span class="video__label">{{ t.play }}: {{ title }}</span>
    </button>
    <iframe
      v-else
      class="video__frame"
      :src="src"
      :title="title"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen
    />
    <figcaption class="video__caption">{{ title }} · {{ t.note }}</figcaption>
  </figure>
</template>

<style scoped>
.video { margin: 24px 0; }
.video__poster,
.video__frame {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 0;
  border-radius: 14px;
  overflow: hidden;
}
.video__poster { position: relative; padding: 0; cursor: pointer; background: var(--vp-c-bg-soft); }
.video__poster img { width: 100%; height: 100%; object-fit: cover; border-radius: 14px; }
.video__play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 34px;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.55);
  background: rgba(0, 0, 0, 0.22);
  border-radius: 14px;
  transition: background 0.2s;
}
.video__poster:hover .video__play { background: rgba(0, 0, 0, 0.34); }
/* The accessible name of the button, kept out of the visual layout. */
.video__label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.video__caption {
  margin-top: 8px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.5;
}
@media (prefers-reduced-motion: reduce) {
  .video__play { transition: none; }
}
</style>
