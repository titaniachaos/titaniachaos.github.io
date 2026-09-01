# Titania Chaos

The VitePress source for [titaniachaos.github.io](https://titaniachaos.github.io).

## Development

Requires Node.js 26.

```sh
npm ci
npm run docs:dev
```

Create a production build with `npm run docs:build` and preview it with `npm run docs:preview`.

## Languages

The site is published in English (root), Bulgarian (`/bg/`) and German (`/de/`).
Page slugs are identical in every language so the language switcher can map a
page to its counterpart by swapping the path prefix. A new page therefore needs
`docs/<slug>.md`, `docs/bg/<slug>.md` and `docs/de/<slug>.md`, plus a nav entry
in each locale in `docs/.vitepress/config.mts`.

`cleanUrls` is enabled, so pages resolve without a trailing slash — `/events`,
not `/events/`. Only locale roots are directory URLs (`/bg/`, `/de/`).

## Checks

```sh
npm run check        # locale parity, ecosystem couplings, build, section ids, alt text, contrast, images, page weight
npm run check:links  # every outward link still resolves (network)
npm run check:origin # the domain can still move (builds twice)
```

`npm run check` runs on every pull request, and CI then runs `npm run
check:origin` as a separate step — it is kept out of `check` because it builds
the site twice. The link check runs weekly from
`.github/workflows/maintenance.yml`, and can be started by hand from the Actions
tab; it matters most for the press citations on the About page, which are the
part of this site most likely to rot.

| Script | What it catches |
| --- | --- |
| `check-locales.mjs` | a missing translation; heading structures that have drifted apart; a page that is half-translated |
| `check-ecosystem.mjs` | the couplings no single file shows: the navbar's link to the Clown site losing its per-locale prefix, the structured job title in `seo.ts` going stale, a Work with Titania description that has stopped mentioning team workshops, the typography contract in `custom.css` — measure, balance, hyphenation — being edited away, and the media couplings: a `<MediaFigure>` asking for a tag no photograph carries, a page with figures and no `<MediaHero />` or a hero with nothing to slide, and three languages placing different figures |
| `check-build.mjs` | a dead `#anchor`, which VitePress does not check; images without alt text; duplicate ids |
| `check-a11y.mjs` | the accessibility properties a diff cannot show. Contrast is recomputed from the CSS tokens on every build, because the brand red passes AA on white at 5.03:1 and fails it on the dark ground at 3.41:1 — nothing about editing a colour tells you which of the two grounds you just broke. Also, cheaply: every page declares a language and carries exactly one `h1` |
| `check-external.mjs` | link rot, told apart from a host refusing an automated request or serving an incomplete certificate chain — only the first fails the job |
| `check-images.mjs` | an image over the weight budget, pixel dimensions far past any slot on the page, a picture that costs too many bytes per pixel, and — the one no diff shows — `seo.ts` declaring dimensions the file does not have, which is what a social platform reads before it fetches anything. Unreferenced images are reported, not failed: a file may be linked from somewhere this repository cannot see |
| `check-page-weight.mjs` | a page that costs too much to open. It sums what a browser fetches before it can paint — the HTML, the stylesheets, the module preload chain, the preloaded fonts, every image — counting text compressed, because that is how it is served. The file check and this one come apart: an image well inside its own budget can still be why a page is the heaviest on the site |
| `check-origin.mjs` | a URL that would not survive a domain move. It rebuilds the site against a deliberately wrong origin and fails if the real host survives anywhere in the HTML, which keeps `SITE_ORIGIN` the single variable a move has to change. Thirty references once survived a switch because they were literal hosts in Markdown |

## Pictures and films

No page names a photograph, and no page has a gallery. A section says what it
is about, and the archive answers:

```md
## Perform & play

<MediaFigure tags="performance stage" />

Titania can appear at festivals, weddings, corporate events…
```

The figure floats, and the section's prose closes around it. Below 720px it
stops floating and becomes a full-width break instead — a 320px picture beside
a 40-character line is two columns of neither.

At the top of every page, `<MediaHero />` slides all of them.

### What the hero shows

Each slide is one figure, shown with the words that surround it further down
the page: **the section's heading as the title, and the section's first
paragraph as the text**. Both are read out of the Markdown at build time, so
the hero is in the served HTML — it works with JavaScript off and a crawler
sees it.

The title is rendered **one level below the heading it came from**: a figure in
the page's `h1` section gets an `h2`, one in an `h2` section gets an `h3`, one
under an `h3` gets an `h4`. The hero is therefore a map of the page drawn in
the page's own type, and the size of a slide's title tells you how deep the
picture sits before you have scrolled to it.

A section with no paragraph still has a first thing it says. The home page's
testimonials are three quotations and "What to expect" is a list, so a
quotation stands in, and then a list item, in that order.

It advances by itself every eight seconds — paused while the pointer or the
keyboard is inside it, paused while the tab is hidden, stopped for good the
moment the reader takes control, and never started under
`prefers-reduced-motion`. `<MediaHero :every="0" />` turns it off.

### Adding a picture

Put the derived file in `docs/public/images/media` (`media/make-media.mjs`
makes it from the archives outside this repository), then add a record to
`FRAMES` with its tags and its alt text and caption in all three languages.
Dimensions are not declared — the loader reads them off the file, through the
same header parser `check-images.mjs` uses, so the two cannot disagree.

Tags are a closed vocabulary. A typo fails the build, and
`check-ecosystem.mjs` fails first — as does an `id=` naming a frame that does
not exist. It also catches a page with **two or more** figures and no hero (one
figure needs none: a slider of a single slide is not a slider), a hero with
nothing to slide, and three languages that have drifted into placing different
figures.

Every crop that throws part of a frame away — the square tile, and any
`object-fit: cover` at display size — uses the frame's declared `focus`, so the
face stays in shot at every screen size. It is declared rather than detected:
the default follows entropy, and entropy kept the balloons and cut the head off
the person holding them.

Two figures on one page may not ask for the same thing — that is how a
component finds its own placement — and one page never gets the same
photograph twice.

### Naming a picture

`tags` asks for *something like this* and lets the archive choose. When a
page's words are about a particular photograph, it can say so:

```md
<MediaFigure id="dressing-room" />
```

Tags cannot express that. Three frames are tagged exactly `portrait solitude`,
so only the first is ever reachable by tag — fine for a service page that wants
a portrait, useless for a journal entry about a dressing room. The journal's
twelve posts each name their own picture, which is why they show twelve
different ones.

### Keyword paths

The vocabulary once had one page per word, and those pages plus the `/pictures`
index above them were removed as a gallery nobody read. Removing them left the
archive with nowhere to appear: 109 of 139 frames shipped and rendered on no
page.

What replaced them is not the gallery again. A path is a question, and the
question is parsed out of the URL:

    /street                     every frame carrying the word
    /portrait/street            every frame carrying both
    /de/performance/stage       the same question, in German

Thirteen words, 8191 subsets, 90 of them non-empty, 42 with enough in them to
be a page — in three languages, generated, unmaintained. It is a faceted index,
not a page generator: bounded by the vocabulary, AND-semantics so the paths do
not all answer the same thing, and one canonical alphabetical order so
`/street/portrait` is a synonym rather than a duplicate.

Each listing shows the eighteen frames that appear on the *fewest other*
listings, so what truncation cuts is what you would have met next door anyway.
That ordering is the difference between every published frame being reachable
and seven of them not; `scripts/lib/browse.mjs` explains it, `check-browse`
enforces it, and `browse.test.mjs` asserts it.

The count `check-images` prints on every build is now **19 of 139**, and those
nineteen are the frames deliberately held back.

`docs/.vitepress/categories.ts` is still the single home of the vocabulary and
its names; the loader, the routes, the navigation and the components all import
it, so there is no copy to drift.

### Instagram, Facebook and YouTube

The five films on the [YouTube
channel](https://www.youtube.com/@titaniachaosofficial346) are **served from
this domain**. `media_fetch_youtube` downloads them into
`media-archive/youtube` and `media/make-media.mjs` re-encodes them to 720p;
their posters are YouTube's own thumbnails, because those frames were chosen by
her. Nothing on any page reaches Google — not on load, not on play — and each
film carries a link back to the channel, which is a link the reader chooses to
follow. The privacy policy says exactly this now; it used to describe a
facade that no longer exists.

Instagram and Facebook photographs become frames through
`scripts/feed-sync.mjs`, which writes `docs/.vitepress/media-manifest.json` and
the derived files, both committed. **It needs credentials**: neither account
can be read without them — instagram.com serves a login shell to an anonymous
request and facebook.com answers `400`.

```sh
IG_TOKEN=… FB_PAGE_ID=… FB_TOKEN=… node scripts/feed-sync.mjs 6
```

A synced post has no tags, so they are read out of its caption against the
vocabulary in all three languages — a caption saying *Kindergeburtstag* is
tagged `children birthday`. What matches nothing carries `feed` alone.

Synced posts reach the site in three places: the category page for every tag
their caption earned them, `/feed`, and — where a section opts in with
`<MediaFigure tags="feed" />` — **inline in the prose**. A feed query is scored
on recency rather than precision, because "the feed" means "what is new", and
a placement that finds nothing is skipped rather than fatal, so a clone with no
token still builds. This is separate from `social-sync.mjs`, which
keeps the wall at the foot of the home page: those are posts shown as posts,
these are frames placed in prose.

### Working on it by tool

`.mcp.json` at the repository root registers a **`titania-media`** MCP server
(`tools/media-mcp.mjs`, no dependencies) with seven tools: `media_list`, `media_derive`, `media_place`,
`media_fetch_youtube`, `feed_sync`, `site_check` and `page_weight`. They shell
out to the same scripts rather than reimplementing them; what they add is a
door. `media_place` in particular writes a figure into all three languages or
refuses and writes nothing — the edit that is easiest to do in one locale and
forget in the other two.

`.claude/skills/titania-media/` is the matching skill: the rules that will bite
you, and what to check when a picture is not showing up. Both are checked in,
so cloning the repository and opening it is enough — there is nothing to set
up. `.claude/launch.json` starts the dev and preview servers the same way.

### Importing and exporting

**In.** `media/import-media.mjs` reads a file and writes the record for it,
filled in as far as the file can fill it in — dimensions, kind, length, capture
date, camera — leaving alt text and caption as gaps, which are the parts a
machine has no business inventing. The source may be a **local path or a URL**;
a URL is fetched to a temporary file first, so both behave the same.

```sh
node media/import-media.mjs https://example.com/photo.jpg --tags "street performance"
node media/import-media.mjs ~/Pictures/IMG_2193.jpeg --write
```

With `--write` it does the writing: the source goes into the right map in
`make-media.mjs`, the record into `FRAMES`, a URL is kept in `media/imported/`,
and the derive runs for that one frame — `--only <id>`, because importing a
photograph should not re-encode forty megabytes of film. What it cannot write
is the alt text and the caption, so it leaves those marked `TODO`, **and the
loader refuses to build while a TODO is still there**. A placeholder that looks
filled in is worse than a gap.

It reports geotagging rather than keeping it. A phone photograph of a
children's party carries the coordinates of the party, and the person deciding
whether to publish it should be told rather than have to know to ask.

**Out.** Every published file carries its own description. `media/export-media.mjs`
writes an XMP packet into each image — title, description in all three
languages as an `rdf:Alt`, tags as keywords, credit, licence, and the URL it is
served from — and the same through the container for films. Standard Dublin
Core, so Bridge, Lightroom, Finder's Get Info and `mdls` all read it. Save a
picture from the site and it still knows what it is.

It starts from empty and writes a chosen list; it never carries the original's
metadata forward, which is how device identifiers and coordinates stay out of
anything the site serves.

The packet is written **during** the derive, in `make-media.mjs`, not stamped
on afterwards: stamping means decoding and re-encoding a lossy file, and three
passes drifted pixels by a mean of 1.5 levels and compound from there.
`export-media.mjs` re-stamps only what has actually changed, so running it
twice costs nothing. Metadata costs about 2 KB a file, ~100 KB across the site.

**The index.** The same run writes `docs/public/media.json` — every frame, its
tags, captions in three languages, dimensions and absolute URLs — served at
[`/media.json`](https://titaniachaos.github.io/media.json). Another project can
read one file over HTTP instead of running the MCP server, and the two agree
because they come from the same source.

### Using this media from another project

This site is the origin. Other projects — the Clown site, anything else — link
to it rather than keeping copies, so a picture replaced here is replaced
everywhere at once and there is one place where consent is tracked.

Register the server in the other project's `.mcp.json`, by absolute path:

```json
{
  "mcpServers": {
    "titania-media": {
      "command": "node",
      "args": ["/path/to/titaniachaos.github.io/tools/media-mcp.mjs"]
    }
  }
}
```

It resolves this repository from its own location, so it works whatever the
caller's working directory is. Then `media_use` hands back what a consumer
needs — the absolute URL, the film's URL if it is one, alt text in the language
asked for, and markup ready to paste:

```
showreel  video 55s  workshop performance
  https://titaniachaos.github.io/images/media/showreel.webp
  https://titaniachaos.github.io/images/media/showreel.mp4
  <video src="…" poster="…" controls playsinline preload="none" aria-label="…"></video>
```

URLs follow `SITE_ORIGIN`, read from `seo.ts`, so a domain move takes the
consumers with it. A frame that owes consent says so in the output, where
whoever is about to embed it will see it.

### What it costs

Every frame a page places is counted against that page's weight budget, so the
number of figures on a page is a real number with a real price — about 50 KB
each. The hero and the figure show the same file at about the same size, so a
frame is fetched once however many times it appears. No film, self-hosted or on
YouTube, is fetched until someone presses play.

### Who is in the frame

`media/README.md` holds the rule about who has to agree before a photograph
goes on a page. This was once an archive of Titania alone; it is not any more.
51 of the 139 frames have other people in them — fellow performers, workshop
participants, audiences and children — and each says what a viewer would see in
`othersInFrame`. Every build prints all of them:

```
media: 108 placements across 12 pages. 52 frame(s) have somebody other than Titania in them
  juggling-pass: a second person, clearly identifiable, is in the frame
  impact-hub: a seated audience, several of them identifiable, including a child
  a-img-8211: a class of young children, clearly identifiable
  …
```

That field is not a verdict and not a debt. It is a note of what is in the
picture, kept because a filename cannot tell you a photograph has a child in
it, and because knowing which frames those are is what makes a withdrawal
request answerable in minutes.

A frame may also carry `heldBack` — a reason it is not published that is not
"the words are unwritten". Those are printed separately.

## SEO

`docs/.vitepress/seo.ts` generates, per page: a canonical URL, the full Open
Graph and Twitter card set, `hreflang` alternates for every language that
actually has the page, and schema.org JSON-LD describing the person, the page
and — on the two service pages — the offer. `robots.txt` and a `sitemap.xml`
carrying `xhtml:link` alternates are emitted at build time.

To verify the site in Google Search Console, paste the token from the **HTML
tag** method into `GOOGLE_SITE_VERIFICATION` in that file. The HTML-file method
cannot be used here, because the deploy workflow rejects `.html` sources.

## The Clown project

*Solo Titania Chaos 2026* is a separate VitePress site, built from the
[`clown`](https://github.com/titaniachaos/clown) repository and served at
`/clown/`. That path belongs to the `clown` repository, so pages placed in
`docs/clown/` here would never be reachable.

## Moving to a custom domain

A `github.io` address is a real cost on a business card and in search results,
and nothing in this setup prevents the move. Three things change, in this order.

1. **The origin.** `HOSTNAME` in `docs/.vitepress/seo.ts` reads
   `SITE_ORIGIN` and falls back to today's value, so the build takes it from the
   environment. Verify before committing anything:

   ```sh
   SITE_ORIGIN=https://example.at npm run docs:build
   ```

   Canonicals, `hreflang`, the sitemap and every schema.org `@id` follow it.
   Set the same variable in both deploy workflows.

2. **The DNS and the Pages setting**, on this repository only. The Clown
   project site follows automatically at `example.at/clown/`; setting a custom
   domain on *that* repository instead would break its `/clown/` base.

3. **Search Console**: add the new property and use the change-of-address tool.
   The old `github.io` URLs keep working, so nothing 404s during the move.

What does **not** change: **the three absolute links** in the Clown
repository's `docs/production.md` and its two translations, which point at this
site by absolute URL. They are not edited by hand. A `link_open` rule in
`clown/docs/.vitepress/config.mts` rewrites any href beginning with
`WRITTEN_HOST` to `HOSTNAME` as the page renders, so they follow `SITE_ORIGIN`
along with every canonical and `hreflang`, and keep their same-site treatment —
same tab, no external-link icon.

`WRITTEN_HOST` is the pattern that rewrite matches, not a destination. Hardcode
the new domain into the Markdown and `written.startsWith(WRITTEN_HOST)` stops
matching, so the links quietly stop following the origin and the *next* move
leaves them pointing at a site that has already moved on. `npm run check:origin`
in that repository is what proves the property: it rebuilds against a
deliberately wrong origin and fails if a literal `titaniachaos.github.io`
survives anywhere in the HTML, and it passes today precisely because none does.

## Deployment

A single GitHub Actions workflow builds the site from `main` on Node.js 26 and
deploys only `docs/.vitepress/dist` to GitHub Pages. Hand-written HTML source
files are rejected.
