/**
 * The board, as small as it can be sent.
 *
 * queneau.mjs reads the pages, works out what every section asks and gathers
 * the frames that answer. None of that can happen in a browser, and none of it
 * needs to: what a reader needs is the list of ids that may fill each position,
 * and the words are already on the page in media.data.ts.
 *
 * 19 positions and about 750 ids — around 5 KB, which is less than one of the
 * photographs it arranges.
 *
 * The order of the ids is the whole contract. An address is an index into
 * these lists, so a list that reordered would silently point every shared
 * address at a different arrangement. queneau.mjs sorts the archive by id
 * before building them, so inserting a frame higher up the file cannot move
 * anything already numbered.
 */

import { defineLoader } from 'vitepress'
import { board } from '../../scripts/lib/queneau.mjs'
import { spaceOf, magnitude } from '../../scripts/lib/arrange.mjs'

export interface Position {
  /** The page whose section asks this, used for the no-repeat rule. */
  page: string
  /**
   * The words it asks with, space separated.
   *
   * Not the section's heading: queneau.mjs records what each section asked,
   * not what it was called, and the words are the better label anyway — they
   * are in the vocabulary, so TAG_NAMES can say them in the reader's language
   * while a heading could only be shown in English.
   */
  query: string
  /** Every frame that answers, in the order an address indexes them. */
  ids: string[]
}

export interface ArrangementData {
  positions: Position[]
  /** Decimal, because JSON has no bigint and this one has 32 digits. */
  space: string
  /** `1.34 × 10^32`, for saying out loud. */
  magnitude: string
}

declare const data: ArrangementData
export { data }

/** A frame answers a question if it carries any of the words it asks with. */
const answers = (frame: { tags: string[] }, asked: string[]) =>
  frame.tags.filter((tag) => asked.includes(tag)).length > 0

export default defineLoader({
  async load(): Promise<ArrangementData> {
    const state = await board()

    const positions: Position[] = state.positions.map(
      (position: { page: string; query: string; asked: string[] }) => ({
        page: position.page,
        query: position.query,
        ids: state.all
          .filter((frame: { tags: string[] }) => answers(frame, position.asked))
          .map((frame: { id: string }) => frame.id)
      })
    )

    const total = spaceOf(positions)
    return { positions, space: total.toString(), magnitude: magnitude(total) }
  }
})
