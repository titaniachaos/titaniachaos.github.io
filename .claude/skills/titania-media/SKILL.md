---
name: titania-media
description: Work on the pictures and films of the Titania Chaos site — add a photograph or a film to the archive, place one in a page, pull the YouTube channel or the Instagram and Facebook feeds in, and check the result against the site's budgets. Use whenever the task involves media on this site: adding, replacing, tagging, placing, re-encoding, or working out why a picture is or is not showing up.
---

# Media on the Titania Chaos site

No page names a photograph. A **section says what it is about**, and the archive
answers:

```md
## Perform & play

<MediaFigure tags="performance stage" />

Titania can appear at festivals, weddings, corporate events…
```

`<MediaHero />` at the top of the page then slides every figure on it, using
each one's section heading as the slide title and that section's first
paragraph as the slide text, with the heading demoted one level — h1 slides h2,
h2 slides h3.

Everything below is available as MCP tools on the **`titania-media`** server:
`media_list`, `media_derive`, `media_place`, `media_import`, `media_export`,
`media_use`, `media_fetch_youtube`, `feed_sync`, `site_check`, `page_weight`.
Prefer them: they enforce the invariants that are easy to break by hand.

## The shape of it

| Where | What |
|---|---|
| `docs/.vitepress/media.data.ts` | the archive: `FRAMES` — every picture and film — plus the loader that reads every page and resolves each figure |
| `docs/.vitepress/categories.ts` | `TAGS`, the closed vocabulary, and its names in three languages |
| `scripts/lib/media-meta.mjs` | **the one reader.** `frames()`, `vocabulary()`, `derived()`, `xmp()` |
| `media/` | the inbox. Drop a file here and `npm run media:import` takes it |
| `media/make-media.mjs` | derives the published files, mostly from archives **outside** the repository |
| `media/import-new.mjs` | imports what is in `media/`, and refuses what the archive already holds |
| `docs/public/images/media/` | what is served: `<id>.webp`, `<id>-s.webp`, and `<id>.mp4` for films |
| `docs/.vitepress/theme/MediaFigure.vue` | one picture, floated, with the prose closing around it |
| `docs/.vitepress/theme/MediaHero.vue` | the slider over a page's figures |
| `scripts/feed-sync.mjs` | Instagram and Facebook posts → frames, tagged from their captions |
| `media/README.md` | **who is allowed to be in a photograph.** Read before adding one |

## One reader, and why it matters

`scripts/lib/media-meta.mjs` is the only thing that parses `media.data.ts`.
Import it. Do not write another regex over that file.

There were four such regexes once, and every one of them was coupled to the
file's whitespace rather than its meaning. When entries appeared with `alt: {
en: … }` on a single line, the export shipped 75 frames into the public index
with **no alt text**, and the MCP server reported `caption: undefined` for 80 of
139 — both silently, both for days. Components that `import` the loader were
never affected. That is the whole argument.

Inside a component, `import { data } from '../media.data'`. Everywhere else,
`import { frames } from '../scripts/lib/media-meta.mjs'`.

## The rules that will bite you

- **Tags are a closed vocabulary.** A typo fails the build; `check-ecosystem.mjs`
  fails first.
- **Two figures on one page may not ask for the same tags.** That string is how
  a component finds its own placement.
- **One page never shows the same frame twice.** The loader takes the next-best.
- **All three languages or none.** A figure in `docs/` needs the same figure in
  `docs/bg/` and `docs/de/`. Use `media_place`, which writes all three or
  refuses and writes nothing.
- **Alt text and caption in all three languages**, or the build fails. `TODO`
  counts as missing — that is deliberate, so a half-finished import cannot
  reach a page.
- **EXIF rotation is not automatic.** sharp ignores the tag unless asked, and
  seventeen phone photographs were derived, published and described sideways
  before anyone noticed. Every pipeline in `make-media.mjs` loads with
  `{ autoOrient: true }`, and `frame()` refuses to write a derivative whose
  aspect ratio disagrees with the upright source.
- **The page-weight budget is nearly spent.** 500 KB per page; `/events` is at
  **490 KB**. Run `page_weight` before adding a figure to any page — there is
  currently room for roughly one more anywhere.

## The inbox

Put a photograph in `media/` and run:

```
npm run media:new       # what would be imported
npm run media:import    # import it as a draft, derive it
```

`npm run check` fails while anything in `media/` is unimported, so a file
dropped there and forgotten cannot go unnoticed — which is how 93 of them came
to sit in the folder referenced by nothing.

**It refuses duplicates, and this is the point.** Two import batches each
re-added photographs the archive already held under better names, so
`juggling-pass` exists three times over — as itself, `a-bf2c4943610a52c9` and
`a-img-1275`. Nothing was watching. Now `import-new.mjs` compares what a picture
*looks like* (a difference hash through a common 256px intermediate, which
survives re-encoding and resizing) and refuses anything already held. Exact
signals win first: a filename already named as a source in `make-media.mjs` is
held whatever it looks like — the only way to know that `IMG_2246.MOV` is in the
archive as `park-dance`.

Films cannot be hashed without decoding them. The tool says so and leaves them
to `media/import-media.mjs` rather than guessing.

## Consent, accurately

**This is not an archive of Titania alone.** 51 of 139 frames have other people
in them — fellow performers, workshop participants, audiences, and children.
Each one records what a viewer would see in `othersInFrame` ("a class of young
children, clearly identifiable"), and **every build prints all 52**, so a
withdrawal request is answerable in minutes rather than by scrolling.

11 frames are held back. `draft: true` alone means the words are unwritten;
`heldBack` carries a reason and is printed separately, because "still a draft"
reads as unfinished and these are not — a screenshot of somebody else's
Instagram post, another organisation's logo, a signed drawing by another artist,
and several the archive's owner rejected for the website.

`media/README.md` holds the rule about who has to agree. Nothing in the tooling
can check it, and nothing should pretend to.

## Doing things

**See what exists** → `media_list` (add `unplaced: true` for frames no page
renders — they still ship).

**Work out what a file is** → `media_import`, with a local path or a URL. It
returns a catalogue record filled in as far as the file allows, and warns if
the original is geotagged.

**Add a photograph**
1. Put it in `media/` and run `npm run media:import` — or, for a source that
   lives outside the repository, add it to the right map in
   `media/make-media.mjs` and run `media_derive`.
2. Write `alt` and `caption` in `en`/`bg`/`de` over the `TODO`s. Do not declare
   dimensions — the loader reads them off the file.
3. `media_place` to put it on a page, or leave it in the pool for a page that
   asks later.

**Add a film** — same, but it goes in `VIDEOS` in `make-media.mjs` with a
poster (a timestamp, or the name of a jpg in `media/posters`), and the frame
needs `seconds` — the real length, since it is shown as a clock.

**Pull the YouTube channel** → `media_fetch_youtube`, then add each to `VIDEOS`
and `FRAMES` and run `media_derive`.

**Pull the social feeds** → `feed_sync`. Needs `IG_TOKEN`, or `FB_PAGE_ID` and
`FB_TOKEN`; neither account is readable without them. Synced posts get their
tags from their captions, matched against the vocabulary in all three
languages. To put the newest post inline in a section, place
`<MediaFigure tags="feed" />` — that query is scored on recency, and it is the
one placement allowed to find nothing, so the build stays green without a token.

Nobody vets who is in a synced photograph. See `media/README.md`.

**Use a picture in another project** → `media_use`. This site is the origin;
other projects link to it rather than copying, and the tool returns the
absolute URL, the alt text in the language asked for, and pasteable markup.

**After changing a caption or a tag** → `media_export`. Every published file
carries its own XMP (three languages, keywords, credit, licence) and
`/media.json` is the public index that the clown site reads. It skips what is
already current, because re-encoding a lossy file costs quality —
`make-media.mjs` stamps during the derive for the same reason. The export
refuses to index a published frame whose alt or caption is empty.

**Before finishing** → `site_check`.

## Where the pictures actually appear

Two surfaces, and you place a frame on neither.

**The written pages.** A section asks with `<MediaFigure tags="…" />` and the
loader answers. Four pages and their heroes — the only place a *particular*
picture is chosen for a *particular* argument.

**Keyword paths.** A path is a question. `/street` is every frame carrying that
word; `/portrait/street` every frame carrying both; likewise under `/bg/` and
`/de/`. The words are read out of the URL rather than from a list, so thirteen
words make 42 pages that nobody maintains — every subset of the vocabulary with
at least three frames in it, out of 8191 possible and 90 non-empty.

`scripts/lib/browse.mjs` is the whole rulebook and its header says why each
rule is there. Two of them exist because the obvious version loses
photographs:

- **Segments sort alphabetically.** `/street/portrait` and `/portrait/street`
  are one page, not two. A faceted index that skips this invents a factorial of
  duplicates.
- **A listing shows its eighteen rarest frames** — rarest meaning *appears on
  the fewest other listings*. Truncating by archive order instead left seven
  frames reachable from nowhere, which is the exact failure this surface was
  built to end.

`check-browse` fails the build if a path stops building, if a home page stops
linking the one-word listings, or if any published frame becomes unreachable.

So a published frame you add needs no placement: it reaches its listings on the
next build. The pool is now small and deliberate — **19 of 139 frames render on
no page, and all nineteen are held back on purpose**. They still ship 798 KB of
derived files, which is the one thing about them worth fixing.

## Why a picture is not showing up

1. Is it in `FRAMES`, and is it a draft? → `media_list`.
2. Does anything on the page ask for a tag it carries? A frame with no matching
   tag scores zero and is never shown.
3. Did an earlier figure on that page already take it? One frame per page.
4. Did a better-scoring frame win? Score is 10 per shared tag plus up to 3 for
   precision; on a tie a **film beats a photograph**, then the order in
   `FRAMES` decides. A frame tagged identically to one earlier in the file can
   only appear once that one is taken.
5. Is it simply unplaced? Most of the archive is. That is the normal state now,
   not a fault.
