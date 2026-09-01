<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { data } from '../media.data'
import type { Media, Tag } from '../media.data'
import { BROWSE_UI, TAG_NAMES, fill, asTitle } from '../categories.ts'
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

const { params } = useData()
const { lang } = useLang()

const t = computed(() => BROWSE_UI[lang.value])
const names = computed(() => TAG_NAMES[lang.value])

/** The words of the path, in order, as the route captured them. */
const want = computed<Tag[]>(() =>
  [params.value?.w1, params.value?.w2, params.value?.w3].filter(Boolean) as Tag[]
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
    if (n >= 3) {
      const words = [...want.value, word].sort()
      out.push({ path: withBase(`${lang.value === 'en' ? '' : '/' + lang.value}/${words.join('/')}`), name: names.value[word], n })
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
    <p class="browse__count">
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
          <p class="browse__kind">
            {{ frame.kind === 'video' ? data.ui[lang].video : data.ui[lang].photo
            }}<template v-if="frame.seconds"> · {{ clock(frame.seconds) }}</template>
          </p>
          <p class="browse__caption">{{ frame.caption[lang] }}</p>
        </div>
      </li>
    </ul>

    <nav v-if="narrower.length" class="browse__narrower" :aria-label="t.narrower">
      <span class="browse__lead">{{ t.narrower }}</span>
      <a v-for="n in narrower" :key="n.path" :href="n.path">{{ n.name }}<span>{{ n.n }}</span></a>
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
.browse__count {
  margin: 0 0 1.6rem;
  color: var(--vp-c-text-3);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.browse__list { margin: 0; padding: 0; list-style: none; }
.browse__item {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  gap: 1.1rem;
  align-items: start;
  margin: 0 0 1.4rem;
  padding-bottom: 1.4rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.browse__item:last-child { border-bottom: 0; }
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
.browse__kind {
  margin: 0 0 0.2rem;
  color: var(--vp-c-text-3);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.browse__caption { margin: 0; color: var(--vp-c-text-2); line-height: 1.5; text-wrap: pretty; }

.browse__narrower {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: baseline;
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--vp-c-divider);
}
.browse__lead {
  margin-right: 0.25rem;
  color: var(--vp-c-text-3);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.browse__narrower a {
  display: inline-flex;
  gap: 0.4rem;
  align-items: baseline;
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  color: var(--vp-c-text-2);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
}
.browse__narrower a span { color: var(--vp-c-text-3); font-variant-numeric: tabular-nums; }
.browse__narrower a:hover { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }

@media (max-width: 560px) {
  .browse__item { grid-template-columns: 5rem minmax(0, 1fr); gap: 0.8rem; }
}
</style>
