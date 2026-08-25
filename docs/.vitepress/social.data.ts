import { readFile } from 'node:fs/promises'
import { defineLoader } from 'vitepress'

/**
 * The social wall, read from the manifest that `scripts/social-sync.mjs`
 * commits.
 *
 * The loader never touches the network. Instagram's CDN URLs expire, so the
 * sync keeps the bytes rather than the links, and the build only reads files
 * that are already in the repository. A clone with no manifest builds fine and
 * renders nothing, which is what a fork and a first checkout need.
 */

export type { Lang } from './locale.ts'
import type { Lang } from './locale.ts'

export interface Post {
  id: string
  /** Path under docs/public, e.g. `/social/17912...jpg`. */
  file: string
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  permalink: string
  /** ISO 8601, as Instagram returns it. */
  timestamp: string
  caption: string
  /** First meaningful caption line, for the image's alt attribute. */
  alt: string
}

export interface Data {
  posts: Post[]
  /** When the manifest was written, or null if there is no manifest. */
  syncedAt: string | null
  account: string
  ui: Record<Lang, {
    heading: string
    intro: string
    /** Alt text when a post has no usable caption. */
    fallbackAlt: string
    video: string
    openOn: string
    follow: string
    close: string
  }>
}

declare const data: Data
export { data }

const UI: Data['ui'] = {
  en: {
    heading: 'From the feed',
    intro: 'Recent posts, kept here as files rather than embedded, so nothing tracks you.',
    fallbackAlt: 'A photograph from the Titania Chaos Instagram feed',
    video: 'Video',
    openOn: 'Open on Instagram',
    follow: 'Follow @titaniachaos',
    close: 'Close'
  },
  bg: {
    heading: 'От потока',
    intro: 'Скорошни публикации, запазени тук като файлове, а не вградени, тъй че нищо не ви проследява.',
    fallbackAlt: 'Снимка от инстаграм потока на Титания Хаос',
    video: 'Видео',
    openOn: 'Отвори в Instagram',
    follow: 'Последвайте @titaniachaos',
    close: 'Затвори'
  },
  de: {
    heading: 'Aus dem Feed',
    intro: 'Aktuelle Beiträge, hier als Dateien abgelegt statt eingebettet, damit nichts Sie verfolgt.',
    fallbackAlt: 'Ein Foto aus dem Instagram-Feed von Titania Chaos',
    video: 'Video',
    openOn: 'Auf Instagram öffnen',
    follow: '@titaniachaos folgen',
    close: 'Schließen'
  }
}

export default defineLoader({
  watch: ['./social-manifest.json'],
  async load(): Promise<Data> {
    let posts: Post[] = []
    let syncedAt: string | null = null
    let account = 'titaniachaos'
    try {
      const raw = JSON.parse(await readFile(new URL('./social-manifest.json', import.meta.url), 'utf-8'))
      posts = raw.posts ?? []
      syncedAt = raw.syncedAt ?? null
      account = raw.account ?? account
    } catch {
      // No manifest: a clone that has never synced. Render nothing.
    }
    // Newest first, and never trust the order the API happened to return.
    posts.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    return { posts, syncedAt, account, ui: UI }
  }
})
