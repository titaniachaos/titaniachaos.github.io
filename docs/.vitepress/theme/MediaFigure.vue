<script setup lang="ts">
import { computed } from 'vue'
import { data } from '../media.data'
import type { Media, Placement } from '../media.data'
import { useLang } from './useLang.ts'

/**
 * One picture or film, set into the text of the section it belongs to.
 *
 * A page places it by saying what the section is about --
 * `<MediaFigure tags="camera props" />` -- and the archive answers. Nothing
 * about the choice is written into the Markdown, so the same line in three
 * languages resolves to the same frame, and a photograph added to the archive
 * can take a place on a page nobody edited.
 *
 * The frame is chosen at build time, in media.data.ts, not here: the loader
 * reads every page, resolves each figure against the vocabulary, and refuses
 * to give one page the same photograph twice. This component only looks up
 * the answer, by the page it is on and the tags it was written with -- which
 * is why two figures on a page may not ask for the same thing.
 *
 * It floats, alternating side by side by its position on the page, so the
 * prose closes around it rather than being interrupted by it. Below 720px it
 * stops floating: a 320px picture beside a 40-character line is not a picture
 * with text around it, it is two columns of neither.
 */

const props = defineProps<{
  /** Space-separated tags from the vocabulary. Unique within the page. */
  tags?: string
  /** Or a frame by name, when the words are about that particular picture. */
  id?: string
}>()

const { lang, slug } = useLang()

const page = computed<Placement[]>(() => data.placements[`${lang.value}/${slug.value}`] ?? [])
const wanted = computed(() =>
  props.id ? `id:${props.id.trim()}` : (props.tags ?? '').trim().replace(/\s+/g, ' ')
)
const at = computed(() => page.value.findIndex((p) => p.tags === wanted.value))
const placement = computed<Placement | null>(() => page.value[at.value] ?? null)
const frame = computed<Media | null>(
  () => (placement.value ? data.media.find((m) => m.id === placement.value!.id) ?? null : null)
)

const t = computed(() => data.ui[lang.value])

/** First figure right, second left, and so on down the page. */
const side = computed(() => (at.value % 2 === 0 ? 'right' : 'left'))

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
</script>

<template>
  <figure v-if="frame" class="figure" :class="`figure--${side}`">
    <video
      v-if="frame.mp4"
      class="figure__video"
      :src="frame.mp4"
      :poster="frame.file"
      :aria-label="frame.alt[lang]"
      controls
      playsinline
      preload="none"
    />
    <img
      v-else
      class="figure__image"
      :src="frame.file"
      :alt="frame.alt[lang]"
      :width="frame.width"
      :height="frame.height"
      loading="lazy"
      decoding="async"
    />
    <figcaption class="figure__caption">
      <span class="ui-label figure__kind">
        {{ frame.kind === 'video' ? t.video : t.photo
        }}<template v-if="frame.seconds"> · {{ clock(frame.seconds) }}</template>
      </span>
      {{ frame.caption[lang] }}
      <a v-if="frame.permalink" class="figure__source" :href="frame.permalink" rel="noopener" target="_blank">
        {{ t.source }}
      </a>
    </figcaption>
  </figure>
</template>

<style scoped>
.figure {
  width: min(20rem, 46%);
  margin: 0.4rem 0 1.2rem;
}
.figure--right { float: right; margin-left: 1.6rem; }
.figure--left { float: left; margin-right: 1.6rem; }

.figure__image,
.figure__video {
  display: block;
  width: 100%;
  height: auto;
  /* `.vp-doc img` sets a 16px vertical margin, a 680px cap and `object-fit:
     cover`. A figure sizes itself. */
  margin: 0;
  max-height: none;
  object-fit: contain;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.figure__caption {
  margin-top: 0.5rem;
  color: var(--vp-c-text-2);
  font-size: 0.8125rem;
  line-height: 1.55;
  text-wrap: pretty;
}
.figure__kind { display: block; margin-bottom: 0.15rem; }
.figure__source {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
}
/* Text around a picture needs room to be text. Below this the figure stops
   floating and becomes a full-width break in the reading instead. */
@media (max-width: 720px) {
  .figure,
  .figure--left,
  .figure--right {
    float: none;
    width: 100%;
    margin: 1.5rem 0;
  }
}
</style>
