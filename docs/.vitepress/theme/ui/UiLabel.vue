<script setup lang="ts">
/**
 * The uppercase micro-label this site sets above counts, kinds and sections.
 *
 * It was written out 29 times in two repositories, always the same four
 * declarations. Ported as shadcn ports its Label: one element, no options, the
 * type in the recipe.
 */
defineProps<{ as?: string }>()
</script>

<template>
  <component :is="as ?? 'p'" class="ui-label"><slot /></component>
</template>
