<script setup lang="ts">
import { computed } from 'vue'

/**
 * A pill, ported from shadcn/ui's Badge.
 *
 * What ports is the shape of the thing: one element, a `variant` prop instead
 * of a new class per use, and the styling in the shared recipe rather than in
 * this file. `.ui-badge` lives in custom.css so Markdown can use it too — a
 * primitive the pages cannot reach is one the pages will keep reimplementing,
 * which is how there came to be eleven of these.
 *
 * Renders an `<a>` when it is given somewhere to go, a `<span>` otherwise:
 * shadcn does this with `asChild`, and the reason is the same. A chip that is
 * a link should be a link, and a chip that is a label should not be focusable.
 */
const props = withDefaults(
  defineProps<{
    href?: string
    variant?: 'outline' | 'muted' | 'solid'
    /** A tally shown after the text, in tabular figures. */
    count?: number | string
  }>(),
  { variant: 'outline' }
)

const classes = computed(() => ['ui-badge', props.variant !== 'outline' && `ui-badge--${props.variant}`])
</script>

<template>
  <component :is="href ? 'a' : 'span'" :href="href" :class="classes">
    <slot />
    <span v-if="count !== undefined" class="ui-badge__count">{{ count }}</span>
  </component>
</template>
