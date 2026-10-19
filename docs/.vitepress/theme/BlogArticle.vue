<script setup lang="ts">
import { useData } from 'vitepress'
const { frontmatter: article, lang } = useData()
</script>

<template>
  <article class="blog-article">
    <header>
      <h1>{{ article.title }}</h1>
      <p v-if="article.date"><time :datetime="String(article.date)">{{ article.date }}</time></p>
      <figure v-if="article.image">
        <img :src="article.image.src" :alt="article.image.alt" :width="article.image.width" :height="article.image.height" />
        <figcaption v-if="article.image.credit">{{ article.image.credit }}</figcaption>
      </figure>
    </header>
    <slot />
    <nav v-if="article.references?.length" :aria-label="lang.startsWith('bg') ? 'Източници' : lang.startsWith('de') ? 'Quellen' : 'References'">
      <ul>
        <li v-for="reference in article.references" :key="reference.url"><a :href="reference.url">{{ reference.label }}</a></li>
      </ul>
    </nav>
  </article>
</template>

<style scoped>
figure { margin: 1.5rem 0; }
img { max-width: 100%; height: auto; }
figcaption { margin-top: 0.5rem; color: var(--vp-c-text-2); font-size: 0.875rem; line-height: 1.6; }
</style>
