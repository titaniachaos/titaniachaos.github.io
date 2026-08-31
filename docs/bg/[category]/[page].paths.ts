import { TAGS, TAG_NAMES, CATEGORY_UI, PER_PAGE, asTitle, fill } from '../../.vitepress/categories.ts'
import { publishedPerTag } from '../../.vitepress/media.data.ts'

/**
 * Page two onwards of a category listing.
 *
 * Page one is `[category].md` and keeps the plain URL; only a tag with more
 * frames than fit generates anything here, so most categories produce no extra
 * page at all. The count comes from the archive rather than from a list, which
 * means a new frame moves the boundary by itself.
 */
export default {
  paths() {
    const ui = CATEGORY_UI['bg']
    const counts = publishedPerTag()
    const out: { params: Record<string, string> }[] = []

    for (const tag of TAGS) {
      const pages = Math.ceil((counts[tag] ?? 0) / PER_PAGE)
      for (let page = 2; page <= pages; page++) {
        const name = TAG_NAMES['bg'][tag]
        out.push({
          params: {
            category: tag,
            page: String(page),
            name,
            title: `${fill(ui.title, asTitle(name))} — ${fill(ui.page, page)}`,
            description: fill(ui.description, name)
          }
        })
      }
    }
    return out
  }
}
