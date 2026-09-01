import { shelf, paths, ordered, SHOWN } from '../../../scripts/lib/browse.mjs'
import { BROWSE_UI, TAG_NAMES, fill, asTitle } from '../../.vitepress/categories.ts'

/**
 * The 2-word browse listings for this language.
 *
 * A path is a question in the closed vocabulary — `/portrait/street` — and the
 * words come from walking the vocabulary's own subsets, never from a list kept
 * here. A word added to TAGS opens its paths on the next build; a combination
 * nothing carries opens none.
 *
 * The frames are ordered and truncated HERE rather than in the component, so
 * the order a page shows is the order the coverage was measured against:
 * rarest first, eighteen shown, and every one of the 127 frames still
 * reachable from some listing.
 */
export default {
  async paths() {
    const state = await shelf()
    const ui = BROWSE_UI['bg']
    const names = TAG_NAMES['bg']
    return paths(state)
      .filter((p) => p.want.length === 2)
      .map((p) => {
        const spoken = p.want.map((w) => names[w]).join(' · ')
        return {
          params: {
            w1: p.want[0],
            w2: p.want[1],
            ids: ordered(p, state).slice(0, SHOWN).map((f) => f.id).join(' '),
            title: fill(ui.title, asTitle(spoken)),
            description: fill(ui.description, spoken)
          }
        }
      })
  }
}
