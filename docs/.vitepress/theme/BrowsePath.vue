<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { data } from '../media.data'
import type { Media, Tag } from '../media.data'
import { BROWSE_UI, TAG_NAMES, browsePath, fill, asTitle } from '../categories.ts'
import { useLang } from './useLang.ts'

/**
 * Everything the archive holds for one question.
 *
 * The path is the question: `/portrait/street` asks for the frames carrying
 * both. The words come from the URL rather than from a list here, which is
 * what makes 42 pages out of thirteen words and no maintenance.
 *
 * The order is the interesting part. A listing shows eighteen, and the
 * eighteen it shows are the frames appearing on the FEWEST other listings —
 * so what it cuts is what you will meet again next door. Truncating by
 * archive order instead leaves seven of the 120 frames reachable from nowhere,
 * which is the failure this surface exists to end.
 */

/**
 * The question can arrive two ways: from the route, on the 42 listings built
 * for it, or as a prop, when an address nobody pre-generated turns out to be a
 * question the archive can answer anyway. Same component either way, so a
 * computed listing is the page rather than a lesser version of it.
 */
const props = defineProps<{ want?: Tag[] }>()

const { params } = useData()
const { lang } = useLang()

const t = computed(() => BROWSE_UI[lang.value])
const names = computed(() => TAG_NAMES[lang.value])

/** The words of the path, in order, as the route captured them. */
const want = computed<Tag[]>(() =>
  props.want?.length
    ? props.want
    : ([params.value?.w1, params.value?.w2, params.value?.w3].filter(Boolean) as Tag[])
)

const spoken = computed(() => want.value.map((w) => names.value[w]).join(' · '))

const all = computed<Media[]>(() =>
  data.media.filter((m) => want.value.every((w) => m.tags.includes(w)))
)

/**
 * The frames to show, in the order the build chose.
 *
 * Not recomputed here. The order is rarity across all 42 listings, and the
 * guarantee that every one of the 120 frames survives truncation was measured
 * against exactly that. A component that re-derived it from something cheaper
 * — the number of tags a frame carries, say — would be near enough to look
 * right and wrong enough to lose frames again.
 */
const shown = computed<Media[]>(() => {
  // A computed listing has no `ids` because no build chose them. It also never
  // needs the rarity order: every path the build declined to make is one with
  // fewer than three frames on it, so there is nothing to truncate and no tail
  // to choose. Measured across the whole vocabulary -- the largest such
  // listing holds two.
  if (props.want?.length) return all.value

  const ids = String(params.value?.ids ?? '').split(' ').filter(Boolean)
  const byId = new Map(data.media.map((m) => [m.id, m]))
  return ids.map((id) => byId.get(id)).filter(Boolean) as Media[]
})

/** One more word, where that still finds something. Real internal linking. */
const narrower = computed(() => {
  const out: { path: string; name: string; n: number }[] = []
  for (const word of Object.keys(names.value) as Tag[]) {
    if (want.value.includes(word) || want.value.length >= 3) continue
    const n = all.value.filter((m) => m.tags.includes(word)).length
    // One is enough to be worth offering, because one is enough to be a page.
    if (n >= 1) {
      out.push({ path: withBase(browsePath(lang.value, ...want.value, word)), name: names.value[word], n })
    }
  }
  return out.sort((a, b) => b.n - a.n).slice(0, 8)
})

/**
 * `Showing 18 of 56`. `fill` replaces %1 only — a second placeholder survives
 * it, and `18 von %2 gezeigt` is what reached the page before this existed.
 */
const showing = computed(() =>
  t.value.showing.replace('%1', String(shown.value.length)).replace('%2', String(all.value.length))
)

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
</script>

<template>
  <section class="browse">
    <h1 class="browse__title">{{ asTitle(spoken) }}</h1>
    <p class="ui-label browse__count">
      {{ all.length > shown.length ? showing : fill(t.all, all.length) }}
    </p>

    <ul class="browse__list">
      <li v-for="frame in shown" :key="frame.id" class="browse__item">
        <video
          v-if="frame.mp4"
          class="browse__tile"
          :src="frame.mp4"
          :poster="frame.tile"
          :aria-label="frame.alt[lang]"
          controls
          playsinline
          preload="none"
        />
        <img
          v-else
          class="browse__tile"
          :src="frame.tile"
          :alt="frame.alt[lang]"
          width="160"
          height="160"
          loading="lazy"
          decoding="async"
        />
        <div class="browse__words">
          <p class="ui-label browse__kind">
            {{ frame.kind === 'video' ? data.ui[lang].video : data.ui[lang].photo
            }}<template v-if="frame.seconds"> · {{ clock(frame.seconds) }}</template>
          </p>
          <!-- `title` because the clamp can cut a caption that credits
               somebody by name, and a truncated attribution is worse than a
               long one. -->
          <p class="browse__caption" :title="frame.caption[lang]">{{ frame.caption[lang] }}</p>
        </div>
      </li>
    </ul>

    <nav v-if="narrower.length" class="browse__narrower ui-separator" :aria-label="t.narrower">
      <span class="ui-label browse__lead">{{ t.narrower }}</span>
      <UiBadge v-for="n in narrower" :key="n.path" :href="n.path" :count="n.n">{{ n.name }}</UiBadge>
    </nav>
  </section>
</template>

<style scoped>
.browse { margin: 0; }
.browse__title {
  margin: 0 0 0.5rem;
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.1;
  text-wrap: balance;
}
/* Type comes from `.ui-label`; only the spacing is this component's. */
.browse__count { margin: 0 0 1.6rem; }
/* A listing is pictures, so the pictures get the width.
 *
 * This was a one-column list with a 7.5rem thumbnail beside the caption,
 * which gave the photograph 18% of the row on a desktop and 80px on a phone
 * -- a gallery laid out like a bibliography. The grid is sized to the source
 * rather than to taste: tiles are 160px squares, so columns want to land near
 * that and never far above it.
 *
 * The track floor is clamped rather than fixed because one number cannot do
 * both ends. A flat 8.5rem gives four 156px columns in the doc column and
 * then collapses a 320px phone to a single 272px tile -- one blurry
 * upscale of a 160px source per screenful. `clamp(7rem, 30%, 9rem)` reads the
 * container instead: two columns at 128px on the narrowest phone, two at
 * 163px on a normal one, four at 156px on a desktop. No breakpoint, so there
 * is nothing here to keep in step with the other components.
 */
.browse__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(clamp(7rem, 30%, 9rem), 1fr));
  gap: 1.6rem 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.browse__item {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-width: 0;
  margin: 0;
}
.browse__tile {
  width: 100%;
  height: auto;
  margin: 0;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}
.browse__words { min-width: 0; }
.browse__kind { margin: 0 0 0.2rem; }
/* Clamped, so one long caption cannot push its whole row down and leave the
   tiles beside it floating in space. The full text stays in the title. */
.browse__caption {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.8125rem;
  line-height: 1.5;
  text-wrap: pretty;
}

/* Spacing and the rule come from `.ui-separator`. */
.browse__narrower {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: baseline;
}
/* The chips are `.ui-badge` now, and the lead is `.ui-label`; what is left
   here is where they sit, which is this component's business and not the
   primitive's. */
.browse__lead { margin-right: 0.25rem; }

/* No breakpoint here on purpose. `auto-fill` already answers every width
   between a 320px phone and the doc column, so there is nothing to keep in
   step with the other components' breakpoints. */
</style>
