<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data } from '../media.data'
import type { Tag } from '../media.data'
import { CATEGORY_UI, categoryPath } from '../categories.ts'
import { useLang } from './useLang.ts'

/**
 * What this page is about, as links to the pages that hold everything else
 * about the same thing.
 *
 * The site generates 42 category pages and, until now, the four written pages
 * linked to none of them: a reader who finished the birthday page had nowhere
 * to go but the nav. The connection existed already -- every section states
 * its subject in the vocabulary when it asks for a picture -- it was simply
 * read once and discarded. See `pageTags` in media.data.ts.
 *
 * Nothing is written into the Markdown, so a section that changes what it asks
 * for changes these links, in all three languages, without anybody
 * remembering this component exists.
 */

const { page } = useData()
const { lang } = useLang()

const topics = computed(() => {
  const slug = page.value.relativePath.replace(/^(?:bg|de)\//, '').replace(/\.md$/, '')
  const entry = data.pageTags[`${lang.value}/${slug}`]
  if (!entry) return []
  return entry.tags.map((tag) => ({
    tag,
    name: data.label[lang.value][tag as Tag],
    path: categoryPath(lang.value, tag)
  }))
})
</script>

<template>
  <nav v-if="topics.length" class="page-topics" :aria-label="CATEGORY_UI[lang].about">
    <span class="page-topics__lead">{{ CATEGORY_UI[lang].about }}</span>
    <a v-for="topic in topics" :key="topic.tag" :href="topic.path">{{ topic.name }}</a>
  </nav>
</template>

<style scoped>
.page-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: baseline;
  margin: 3rem 0 0;
  padding-top: 1.5rem;
  border-top: 1px solid var(--vp-c-divider);
}
.page-topics__lead {
  margin-right: 0.25rem;
  color: var(--vp-c-text-3);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.page-topics a {
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
.page-topics a:hover { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }
</style>
