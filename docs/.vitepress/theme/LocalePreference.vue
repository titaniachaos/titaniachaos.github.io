<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{ base?: string }>(), { base: '' })
const KEY = 'titania-locale'
const supported = ['en', 'bg', 'de'] as const
type Locale = (typeof supported)[number]

function localeFromPath(pathname: string): Locale {
  const relative = props.base && pathname.startsWith(`${props.base}/`)
    ? pathname.slice(props.base.length)
    : pathname
  return relative === '/bg' || relative.startsWith('/bg/')
    ? 'bg'
    : relative === '/de' || relative.startsWith('/de/')
      ? 'de'
      : 'en'
}

function rememberLanguage(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Element)) return
  const link = target.closest<HTMLAnchorElement>(
    '.VPNavBarTranslations a, .VPNavScreenTranslations a, [class*="Translations"] a'
  )
  if (!link) return
  const url = new URL(link.href, window.location.href)
  if (url.origin !== window.location.origin) return
  localStorage.setItem(KEY, localeFromPath(url.pathname))
}

onMounted(() => {
  document.addEventListener('click', rememberLanguage, true)

  const root = `${props.base || ''}/`
  if (window.location.pathname !== root) return

  const remembered = localStorage.getItem(KEY)
  const browser = [...navigator.languages, navigator.language]
    .map((tag) => tag.toLowerCase().split('-')[0])
    .find((tag): tag is Locale => supported.includes(tag as Locale))
  const locale: Locale = supported.includes(remembered as Locale)
    ? remembered as Locale
    : browser ?? 'en'

  if (locale !== 'en') {
    window.location.replace(`${props.base}/${locale}/${window.location.search}${window.location.hash}`)
  }
})

onUnmounted(() => document.removeEventListener('click', rememberLanguage, true))
</script>

<template></template>
