import { computed, type ComputedRef } from 'vue'
import { useData } from 'vitepress'
import { dateLocale, fromTag, localePrefix, parsePage, type Lang } from '../locale.ts'

/**
 * The current page's language, the tag to format dates with, its URL prefix
 * and its slug.
 *
 * Every component that asked "which language am I in?" answered it itself, and
 * some of them also carried their own rule for date formatting or their own
 * way of building a sibling locale's URL. All of it lives here now, so a fourth
 * language is one edit in locale.ts.
 *
 * Byte-identical in both sites: the callers differ, the answer must not.
 */
export function useLang(): {
  lang: ComputedRef<Lang>
  dateTag: ComputedRef<string>
  prefix: ComputedRef<string>
  slug: ComputedRef<string>
} {
  const { lang: pageLang, page } = useData()

  const lang = computed(() => fromTag(pageLang.value))
  const dateTag = computed(() => dateLocale(lang.value))
  const prefix = computed(() => localePrefix(lang.value))
  const slug = computed(() => parsePage(page.value.relativePath).slug)

  return { lang, dateTag, prefix, slug }
}
