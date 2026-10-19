<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data } from '../blog.data'
const props = defineProps<{ empty: string }>()
const { lang } = useData()
const posts = computed(() => data.filter((post) => {
  const locale = post.url.startsWith('/bg/') ? 'bg' : post.url.startsWith('/de/') ? 'de' : 'en'
  return locale === lang.value.split('-')[0]
}))
</script>

<template>
  <ul v-if="posts.length">
    <li v-for="post in posts" :key="post.url">
      <a :href="post.url">{{ post.title }}</a>
      <template v-if="post.date"> · <time :datetime="String(post.date)">{{ post.date }}</time></template>
      <p v-if="post.description">{{ post.description }}</p>
    </li>
  </ul>
  <p v-else>{{ props.empty }}</p>
</template>
