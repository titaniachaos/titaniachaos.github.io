import { computed, type ComputedRef } from 'vue'
import { useData } from 'vitepress'
import { dateLocale, fromTag, type Lang } from '../locale.ts'

/**
 * The current page's language, and the tag to format dates with.
 *
 * Every component that asked "which language am I in?" answered it itself, and
 * two of them also carried their own rule for date formatting. Both live here
 * now, so a fourth language is one edit in locale.ts.
 */
export function useLang(): { lang: ComputedRef<Lang>; dateTag: ComputedRef<string> } {
  const { lang: pageLang } = useData()
  const lang = computed(() => fromTag(pageLang.value))
  const dateTag = computed(() => dateLocale(lang.value))
  return { lang, dateTag }
}
