<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useData } from 'vitepress'
import { data } from '../social.data'
import type { Lang, Post } from '../social.data'

/**
 * The social wall.
 *
 * Every tile is a real link to the post, so the wall works with JavaScript off,
 * with it broken, and for anyone who middle-clicks. The lightbox is added on
 * top of that rather than replacing it: `@click.prevent` only takes over once
 * the component has mounted, and the href stays correct either way.
 *
 * Nothing is embedded from Instagram — the images are files in this repository,
 * so no third-party script runs and no cookie is set. That is the reason the
 * site can show a feed without a consent banner.
 */

const { localeIndex } = useData()

const lang = computed<Lang>(() =>
  localeIndex.value === 'bg' ? 'bg' : localeIndex.value === 'de' ? 'de' : 'en'
)
const ui = computed(() => data.ui[lang.value])
const posts = computed(() => data.posts)

const open = ref<number | null>(null)
const dialog = ref<HTMLElement | null>(null)
let restoreFocus: HTMLElement | null = null

const current = computed<Post | null>(() => (open.value === null ? null : posts.value[open.value] ?? null))

function show(i: number, event?: MouseEvent) {
  // Let the browser do its normal thing for modified clicks.
  if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)) return
  event?.preventDefault()
  restoreFocus = (event?.currentTarget as HTMLElement) ?? null
  open.value = i
  nextTick(() => dialog.value?.focus())
}

function close() {
  open.value = null
  restoreFocus?.focus()
}

function step(by: number) {
  if (open.value === null) return
  open.value = (open.value + by + posts.value.length) % posts.value.length
}

function onKey(e: KeyboardEvent) {
  if (open.value === null) return
  if (e.key === 'Escape') { e.preventDefault(); close() }
  if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
  if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

const dateOf = (p: Post) =>
  new Date(p.timestamp).toLocaleDateString(
    lang.value === 'bg' ? 'bg-BG' : lang.value === 'de' ? 'de-AT' : 'en-GB',
    { year: 'numeric', month: 'long', day: 'numeric' }
  )
</script>

<template>
  <section v-if="posts.length" class="wall" :aria-label="ui.heading">
    <h2>{{ ui.heading }}</h2>
    <p class="intro">{{ ui.intro }}</p>

    <ul class="grid">
      <li v-for="(post, i) in posts" :key="post.id">
        <a
          class="tile"
          :href="post.permalink"
          rel="noopener"
          target="_blank"
          @click="show(i, $event)"
        >
          <img
            :src="post.file"
            :alt="post.alt || ui.fallbackAlt"
            loading="lazy"
            decoding="async"
          />
          <span v-if="post.type === 'VIDEO'" class="badge">{{ ui.video }}</span>
        </a>
      </li>
    </ul>

    <p class="follow">
      <a :href="`https://www.instagram.com/${data.account}`" rel="noopener" target="_blank">
        {{ ui.follow }}
      </a>
    </p>

    <div
      v-if="current"
      class="lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="current.alt || ui.fallbackAlt"
      tabindex="-1"
      ref="dialog"
      @click.self="close"
    >
      <figure>
        <img :src="current.file" :alt="current.alt || ui.fallbackAlt" />
        <figcaption>
          <time :datetime="current.timestamp">{{ dateOf(current) }}</time>
          <p v-if="current.caption">{{ current.caption }}</p>
          <a :href="current.permalink" rel="noopener" target="_blank">{{ ui.openOn }}</a>
        </figcaption>
      </figure>
      <button class="close" type="button" @click="close" :aria-label="ui.close">&times;</button>
    </div>
  </section>
</template>

<style scoped>
.wall { margin: 3rem 0 0; }
.wall h2 { margin: 0 0 .4rem; border-top: 0; }
.intro { color: var(--vp-c-text-2); font-size: .95rem; margin: 0 0 1.4rem; max-width: 60ch; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
  gap: .6rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.tile {
  position: relative;
  display: block;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
}
.tile img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
  transition: transform .3s ease;
}
.tile:hover img { transform: scale(1.04); }
.tile:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }

.badge {
  position: absolute; top: .4rem; right: .4rem;
  padding: .1rem .4rem; border-radius: 3px;
  background: rgba(0,0,0,.62); color: #fff;
  font-size: .62rem; letter-spacing: .06em; text-transform: uppercase;
}

.follow { margin: 1rem 0 0; font-size: .9rem; }

.lightbox {
  position: fixed; inset: 0; z-index: 100;
  display: flex; align-items: center; justify-content: center;
  padding: clamp(1rem, 4vw, 3rem);
  background: rgba(0,0,0,.86);
}
.lightbox figure {
  margin: 0; max-width: 60rem; max-height: 100%;
  display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 1.5rem; align-items: start;
  background: var(--vp-c-bg); border-radius: 8px; overflow: auto; padding: 1rem;
}
.lightbox img { width: 100%; height: auto; border-radius: 4px; display: block; }
figcaption { font-size: .9rem; line-height: 1.6; }
figcaption time { display: block; color: var(--vp-c-text-3); font-size: .78rem; margin-bottom: .5rem; }
figcaption p { white-space: pre-line; margin: 0 0 .8rem; }

.close {
  position: absolute; top: 1rem; right: 1.25rem;
  width: 2.4rem; height: 2.4rem;
  border: 0; border-radius: 50%;
  background: rgba(255,255,255,.14); color: #fff;
  font-size: 1.6rem; line-height: 1; cursor: pointer;
}
.close:hover { background: rgba(255,255,255,.26); }
.close:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

@media (max-width: 780px) {
  .lightbox figure { grid-template-columns: minmax(0, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .tile img, .tile:hover img { transition: none; transform: none; }
}
</style>
