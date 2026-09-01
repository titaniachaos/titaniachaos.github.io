import { shelf, paths, ordered, SHOWN } from '../../../../../scripts/lib/browse.mjs'
import { BROWSE_UI, TAG_NAMES, fill, asTitle } from '../../../../.vitepress/categories.ts'

/**
 * Four words deep.
 *
 * Only four questions in the whole vocabulary go this far and still find a
 * photograph, but they do, and a question the archive can answer should be a
 * page rather than a 404 wearing a different template. The three-deep route
 * stopped here because nothing below the old threshold of three frames ever
 * reached four words; at a threshold of one, four of them do.
 */
const state = await shelf()

export default {
  paths() {
    const names = TAG_NAMES['de']
    const ui = BROWSE_UI['de']
    return paths(state)
      .filter((found) => found.want.length === 4)
      .map((found) => {
        const spoken = found.want.map((w) => names[w]).join(' · ')
        return {
          params: {
            w1: found.want[0],
            w2: found.want[1],
            w3: found.want[2],
            w4: found.want[3],
            ids: ordered(found, state).slice(0, SHOWN).map((f) => f.id).join(' '),
            title: asTitle(spoken),
            description: fill(ui.description, spoken)
          }
        }
      })
  }
}
