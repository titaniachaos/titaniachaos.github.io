import { TAGS, TAG_NAMES, CATEGORY_UI, fill, asTitle } from './.vitepress/categories.ts'

/**
 * One page per word in the vocabulary, in English.
 *
 * VitePress turns each of these into a real static file at build time, so a
 * category page has its own canonical, its own hreflang alternates and its own
 * line in the sitemap -- exactly like a hand-written page, because as far as
 * everything downstream is concerned it is one.
 *
 * The list is `TAGS`, so this file never needs editing. A new category is one
 * word in media.data.ts and three labels, and twelve pages appear.
 */
export default {
  paths() {
    const ui = CATEGORY_UI['en']
    return TAGS.map((category) => ({
      params: {
        category,
        // Front matter, per generated page. `title` and `description` are what
        // seo.ts reads for the canonical, the card and the JSON-LD.
        name: asTitle(TAG_NAMES['en'][category]),
        title: fill(ui.title, asTitle(TAG_NAMES['en'][category])),
        description: fill(ui.description, TAG_NAMES['en'][category])
      }
    }))
  }
}

