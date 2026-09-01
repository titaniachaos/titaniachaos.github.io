<script setup lang="ts">
import { computed } from 'vue'

/**
 * A button, ported from shadcn/ui's Button.
 *
 * Variants map onto VitePress's own documented tokens rather than a palette of
 * this file's invention: `brand` is `--vp-button-brand-*`, `alt` is
 * `--vp-button-alt-*`. Both already have light and dark values, so a ported
 * button follows the theme and dark mode needs nothing added here.
 */
const props = withDefaults(
  defineProps<{
    href?: string
    variant?: 'alt' | 'brand' | 'ghost'
    size?: 'default' | 'sm' | 'icon'
    block?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'alt', size: 'default', type: 'button' }
)

const classes = computed(() => [
  'ui-btn',
  props.variant !== 'alt' && `ui-btn--${props.variant}`,
  props.size !== 'default' && `ui-btn--${props.size}`,
  props.block && 'ui-btn--block'
])
</script>

<template>
  <a v-if="href" :href="href" :class="classes"><slot /></a>
  <button v-else :type="type" :class="classes"><slot /></button>
</template>
