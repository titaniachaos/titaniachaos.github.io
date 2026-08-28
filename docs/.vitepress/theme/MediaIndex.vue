<script setup lang="ts">
import { computed } from 'vue'
import { data } from '../media.data'
import { CATEGORY_UI, TAGS, TAG_NAMES, asTitle, categoryPath } from '../categories.ts'
import { useLang } from './useLang.ts'

/**
 * The way in to the category pages.
 *
 * Thirty-nine of them are generated and every one is linked from the tags
 * under a picture, which is fine for a reader already looking at a picture and
 * no use at all to one who is not. This is the page that lists them: what the
 * site has, and how much of each.
 *
 * The counts come from the archive rather than from a number somebody typed,
 * so a category that grows says so, and one with nothing in it is not offered
 * as if it were a room worth entering.
 */

const { lang } = useLang()
const t = computed(() => CATEGORY_UI[lang.value])

const categories = computed(() =>
  TAGS.map((tag) => {
    const frames = data.media.filter((m) => m.tags.includes(tag))
    return {
      tag,
      name: asTitle(TAG_NAMES[lang.value][tag]),
      path: categoryPath(lang.value, tag),
      count: frames.length,
      // The newest thing in a category is the truest picture of it, and the
      // square is 11 KB, which is what makes listing thirteen of them affordable.
      tile: frames[0]?.tile,
      alt: frames[0]?.alt[lang.value]
    }
  }).filter((c) => c.count > 0)
)
</script>

<template>
  <section class="index">
    <p class="index__intro">{{ t.indexIntro }}</p>
    <ul class="index__grid">
      <li v-for="c in categories" :key="c.tag">
        <a class="index__card" :href="c.path">
          <img v-if="c.tile" :src="c.tile" :alt="c.alt" width="240" height="240" loading="lazy" decoding="async" />
          <span class="index__name">{{ c.name }}</span>
          <span class="index__count">{{ c.count === 1 ? t.one : t.many.replace('%1', String(c.count)) }}</span>
        </a>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.index { margin: 1.5rem 0 0; }
.index__intro { max-width: 60ch; color: var(--vp-c-text-2); text-wrap: pretty; }
.index__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: 1.2rem 1rem;
  margin: 2rem 0 0;
  padding: 0;
  list-style: none;
}
.index__grid li { margin: 0; }
.index__card { display: block; text-decoration: none; }
.index__card img {
  width: 100%;
  height: auto;
  margin: 0 0 0.5rem;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  transition: transform 0.3s ease;
}
.index__card:hover img { transform: scale(1.04); }
.index__name { display: block; color: var(--vp-c-text-1); font-weight: 600; line-height: 1.3; }
.index__count {
  display: block;
  margin-top: 0.15rem;
  color: var(--vp-c-text-3);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
@media (prefers-reduced-motion: reduce) {
  .index__card img, .index__card:hover img { transition: none; transform: none; }
}
</style>
