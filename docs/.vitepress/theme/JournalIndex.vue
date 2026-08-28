<script setup lang="ts">
import { computed } from 'vue'
import { data } from '../media.data'
import { useLang } from './useLang.ts'

/**
 * The journal, as pictures.
 *
 * The index below this is twelve hand-written entries with their own excerpts
 * and tags, and it is the better read. What it had no way to show is that each
 * post carries a photograph — so the list of twelve titles arrived as twelve
 * lines of text, on a site whose whole argument is made in pictures.
 *
 * Nothing here decides which picture goes with which post: the posts already
 * did that, by naming a frame. This reads the placements the loader resolved,
 * so the grid cannot disagree with the posts, and a post that changes its
 * picture changes here too without anybody remembering that this exists.
 *
 * The 240px square, not the full frame: twelve of those would be half a
 * megabyte and this is a contents page.
 */

const { lang } = useLang()

const posts = computed(() =>
  Object.entries(data.placements)
    .filter(([key]) => key.startsWith(`${lang.value}/blog/`) && !key.endsWith('/index'))
    .map(([key, places]) => {
      const place = places[0]
      const frame = place && data.media.find((m) => m.id === place.id)
      return frame && {
        slug: key.slice(`${lang.value}/blog/`.length),
        title: place.title,
        frame
      }
    })
    .filter(Boolean)
    .sort((a, b) => a!.title.localeCompare(b!.title, lang.value))
)
</script>

<template>
  <ul v-if="posts.length" class="posts">
    <li v-for="post in posts" :key="post!.slug">
      <a class="posts__card" :href="`./${post!.slug}`">
        <img
          :src="post!.frame.tile"
          :alt="post!.frame.alt[lang]"
          :style="{ objectPosition: post!.frame.anchor }"
          width="240"
          height="240"
          loading="lazy"
          decoding="async"
        />
        <span class="posts__title">{{ post!.title }}</span>
      </a>
    </li>
  </ul>
</template>

<style scoped>
.posts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
  gap: 1.2rem 1rem;
  margin: 2rem 0 3rem;
  padding: 0;
  list-style: none;
}
.posts li { margin: 0; }
.posts__card { display: block; text-decoration: none; }
.posts__card img {
  width: 100%;
  height: auto;
  margin: 0 0 0.45rem;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  transition: transform 0.3s ease;
}
.posts__card:hover img { transform: scale(1.04); }
.posts__title {
  display: block;
  color: var(--vp-c-text-1);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.35;
  text-wrap: pretty;
}
.posts__card:hover .posts__title { color: var(--vp-c-brand-1); }
@media (prefers-reduced-motion: reduce) {
  .posts__card img, .posts__card:hover img { transition: none; transform: none; }
}
</style>
