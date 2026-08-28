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

Everything below is available as MCP tools on the **`titania-media`** server.
Prefer them: they enforce the invariants that are easy to break by hand.

## The shape of it

| Where | What |
|---|---|
| `docs/.vitepress/media.data.ts` | the archive: `TAGS` (closed vocabulary) and `FRAMES` (every picture and film), plus the loader that reads every page and resolves each figure |
| `media/make-media.mjs` | derives the published files from archives **outside** the repository |
| `docs/public/images/media/` | what is served: one `<id>.webp` per frame, plus `<id>.mp4` for films |
| `docs/.vitepress/theme/MediaFigure.vue` | one picture, floated, with the prose closing around it |
| `docs/.vitepress/theme/MediaHero.vue` | the slider over a page's figures |
| `scripts/feed-sync.mjs` | Instagram and Facebook posts → frames, tagged from their captions |
| `media/README.md` | **who is allowed to be in a photograph.** Read before adding one |

## The rules that will bite you

- **Tags are a closed vocabulary.** A typo fails the build; `check-ecosystem.mjs`
  fails first.
- **Two figures on one page may not ask for the same tags.** That string is how
  a component finds its own placement.
- **One page never shows the same frame twice.** The loader takes the next-best.
- **All three languages or none.** A figure in `docs/` needs the same figure in
  `docs/bg/` and `docs/de/`. Use `media_place`, which writes all three or
  refuses and writes nothing.
- **Alt text and caption in all three languages**, or the build fails.
- **Every figure costs the page ~50 KB** against a 500 KB budget. The home page
  has the least room. Check with `page_weight` before adding a fifth.
- **Consent.** Only frames Titania appears in *alone* are published. Two
  predate the rule and are marked `consentOwed`; every build prints them.

## Category pages

Every tag also has its own generated page per language (`/street`, `/bg/street`,
`/de/street`) listing everything that carries it. Nobody maintains them.
`docs/.vitepress/categories.ts` holds the vocabulary and its names — the single
source the loader, the three `[category].paths.ts` files, the navigation and
the components all import.

A **new category** is: one word in `TAGS`, three names in `TAG_NAMES`, and at
least one frame tagged with it. Twelve pages appear. (A tag nothing carries
fails the build — except `feed`, which is empty until someone syncs.)

## Doing things

**See what exists** → `media_list` (add `unplaced: true` for frames no page
renders — they still ship).

**Work out what a file is** → `media_import`, with a local path or a URL. It
returns a catalogue record filled in as far as the file allows, and warns if
the original is geotagged.

**Add a photograph**
1. Put the source where `media/make-media.mjs` can see it and add it to
   `PHOTOS`.
2. `media_derive`.
3. Add a record to `FRAMES` in `media.data.ts`: `id`, `kind`, `tags`, and
   `alt` + `caption` in `en`/`bg`/`de`. Do not declare dimensions — the loader
   reads them off the file.
4. `media_place` to put it on a page, or leave it in the pool for a page that
   asks later.

**Add a film** — same, but it goes in `VIDEOS` in `make-media.mjs` with a
poster (a timestamp, or the name of a jpg in `media/posters`), and the frame
needs `seconds`. Films are served from this domain; nothing on a page ever
reaches Google.

**Pull the YouTube channel** → `media_fetch_youtube`, then add each to `VIDEOS`
and `FRAMES` and run `media_derive`.

**Pull the social feeds** → `feed_sync`. Needs `IG_TOKEN`, or `FB_PAGE_ID` and
`FB_TOKEN`; neither account is readable without them. Synced posts get their
tags from their captions, matched against the vocabulary in all three
languages, and reach the category pages automatically. To put the newest post
**inline in a section**, place `<MediaFigure tags="feed" />` — that query is
scored on recency, and it is the one placement allowed to find nothing, so the
build stays green without a token.

Nobody vets who is in a synced photograph. See `media/README.md`.

**Use a picture in another project** → `media_use`. This site is the origin;
other projects link to it rather than copying, and the tool returns the
absolute URL, the alt text in the language asked for, and pasteable markup. It
warns when a frame owes consent.

**After changing a caption or a tag** → `media_export`. Every published file
carries its own XMP (three languages, keywords, credit, licence) and
`/media.json` is the public index. It skips what is already current, because
re-encoding a lossy file costs quality — `make-media.mjs` stamps during the
derive for the same reason.

**Before finishing** → `site_check`. It runs locale parity, the media
couplings, dead links and anchors, alt text, image budgets, page weight and
contrast — the same thing CI runs.

## Why a picture is not showing up

1. Is it in `FRAMES`? → `media_list`.
2. Does anything on the page ask for a tag it carries? A frame with no matching
   tag scores zero and is never shown.
3. Did an earlier figure on that page already take it? One frame per page.
4. Did a better-scoring frame win? Score is 10 per shared tag plus up to 3 for
   precision; on a tie a **film beats a photograph**, then the order in
   `FRAMES` decides. A frame tagged identically to one earlier in the file can
   only appear once that one is taken.
