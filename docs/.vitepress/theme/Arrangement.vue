<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { data as archive } from '../media.data'
import { data as boardData } from '../arrangement.data'
import type { Media } from '../media.data'
import { ARRANGEMENT_UI, TAG_NAMES, asTitle } from '../categories.ts'
import { useLang } from './useLang.ts'
import { fillFrom, addressFrom, nearest, turn, spaceOf } from '../../../scripts/lib/arrange.mjs'

/**
 * The archive as Queneau bound his sonnets.
 *
 * Cent mille milliards de poèmes was ten sonnets cut into fourteen strips
 * each, so any line could follow any other. What made it work was not the
 * cutting: every line in a given position shared the rhyme and the metre of
 * every other, so no substitution could produce nonsense.
 *
 * The strips are already here. Nineteen sections across four pages each ask
 * the archive a question in a closed vocabulary, and every frame that answers
 * a question is by construction a legitimate answer to it. The vocabulary is
 * the rhyme scheme. Turn any line and the rest hold still.
 *
 * Two rules this keeps, and they are the reason it is worth building rather
 * than merely amusing:
 *
 *   It recombines written words and invents none. Every caption here was
 *   written by somebody who looked at the photograph. Nothing generated,
 *   nothing described by a machine that has not seen it — 51 of these frames
 *   have other people in them, and describing a picture you have not seen is
 *   how you end up asserting who is in it.
 *
 *   An arrangement is addressed, not stored. The address is an index into the
 *   board, so the same number is the same arrangement on any machine, today
 *   and in ten years, with no server keeping a note of it. That is why the
 *   address is in the URL and why it is worth sharing.
 */

const { lang } = useLang()
const t = computed(() => ARRANGEMENT_UI[lang.value])
const names = computed(() => TAG_NAMES[lang.value])

const positions = boardData.positions
const total = spaceOf(positions)

const byId = new Map(archive.media.map((frame) => [frame.id, frame]))

/** Where a reader with no address in hand begins. */
const OPENING = total / 2n

const address = ref<bigint>(OPENING)
const ready = ref(false)

/**
 * The address lives in the fragment, not the path.
 *
 * `#1234…` is one page to a search engine and 10^32 pages to a reader, which
 * is the correct arrangement of those two facts. A path would make each
 * turn a separate URL for an index to crawl and rightly demote.
 */
function readFragment(): bigint | null {
  const raw = decodeURIComponent(window.location.hash.replace(/^#/, '')).trim()
  if (!/^\d+$/.test(raw)) return null
  return BigInt(raw)
}

function land(on: bigint) {
  const found = nearest(on, positions)
  address.value = found ?? OPENING
}

onMounted(() => {
  land(readFragment() ?? OPENING)
  ready.value = true
  window.addEventListener('hashchange', () => land(readFragment() ?? OPENING))
})

watch(address, (now) => {
  if (!ready.value) return
  // replaceState, so turning forty lines does not bury the back button under
  // forty entries of the same page.
  window.history.replaceState(null, '', `#${now.toString()}`)
})

const lines = computed(() => {
  const chosen = fillFrom(address.value, positions)
  if (!chosen) return []
  return chosen.map((line: { page: string; query: string; ids: string[]; id: string }, at: number) => ({
    at,
    page: line.page,
    of: line.ids.length,
    frame: byId.get(line.id) as Media | undefined,
    asked: line.query
      .split(' ')
      .map((word) => names.value[word as keyof typeof names.value] ?? word)
      .join(' · ')
  }))
})

const turnLine = (at: number, by: number) => {
  address.value = turn(address.value, positions, at, by)
}

/** Proof rather than decoration: the arrangement on screen names this number. */
const checked = computed(() => {
  const chosen = fillFrom(address.value, positions)
  return chosen ? addressFrom(chosen, positions) === address.value : false
})

const copied = ref(false)
async function share() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <section v-if="ready" class="arr">
    <p class="arr__size">{{ t.of }} {{ boardData.magnitude }}</p>

    <ol class="arr__lines">
      <li v-for="line in lines" :key="line.at" class="arr__line">
        <img
          v-if="line.frame"
          class="arr__tile"
          :src="line.frame.tile"
          :alt="line.frame.alt[lang]"
          width="160"
          height="160"
          loading="lazy"
          decoding="async"
        />
        <div class="arr__words">
          <p class="arr__asked">{{ asTitle(line.asked) }}<span>{{ line.of }}</span></p>
          <p class="arr__caption">{{ line.frame?.caption[lang] }}</p>
        </div>
        <div class="arr__turn">
          <button type="button" :aria-label="`${t.back}: ${line.asked}`" @click="turnLine(line.at, -1)">↑</button>
          <button type="button" :aria-label="`${t.turn}: ${line.asked}`" @click="turnLine(line.at, 1)">↓</button>
        </div>
      </li>
    </ol>

    <footer class="arr__foot">
      <p class="arr__address">
        <span class="arr__label">{{ t.address }}</span>
        <code>{{ address.toString() }}</code>
      </p>
      <p class="arr__note">{{ checked ? t.exact : t.drifted }}</p>
      <button type="button" class="arr__share" @click="share">
        {{ copied ? t.copied : t.share }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.arr { margin: 0; }
.arr__size {
  margin: 0 0 1.6rem;
  color: var(--vp-c-text-3);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.arr__lines { margin: 0; padding: 0; list-style: none; }
.arr__line {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: 0.9rem 0;
  border-bottom: 1px solid var(--vp-c-divider);
}
.arr__line:last-child { border-bottom: 0; }
.arr__tile {
  width: 100%;
  height: auto;
  margin: 0;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}
.arr__words { min-width: 0; }
.arr__asked {
  display: flex;
  gap: 0.4rem;
  align-items: baseline;
  margin: 0 0 0.15rem;
  color: var(--vp-c-text-3);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.arr__asked span { color: var(--vp-c-text-3); font-variant-numeric: tabular-nums; opacity: 0.7; }
.arr__caption { margin: 0; color: var(--vp-c-text-1); line-height: 1.5; text-wrap: pretty; }
.arr__turn { display: flex; flex-direction: column; gap: 0.25rem; }
.arr__turn button {
  width: 2rem;
  height: 1.6rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.arr__turn button:hover { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }

.arr__foot { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--vp-c-divider); }
.arr__address { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: baseline; margin: 0 0 0.4rem; }
.arr__label {
  color: var(--vp-c-text-3);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.arr__address code { font-size: 12px; word-break: break-all; }
.arr__note { margin: 0 0 1rem; color: var(--vp-c-text-3); font-size: 12px; line-height: 1.5; }
.arr__share {
  padding: 0.45rem 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}
.arr__share:hover { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }

@media (max-width: 560px) {
  .arr__line { grid-template-columns: 3.25rem minmax(0, 1fr) auto; gap: 0.7rem; }
}
</style>
