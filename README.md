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
`check-ecosystem.mjs` fails first: it also catches a page with figures and no
hero, a hero with nothing to slide, and three languages that have drifted into
placing different figures.

Two figures on one page may not ask for the same thing — that is how a
component finds its own placement — and one page never gets the same
photograph twice.

### Category pages, generated

Every word in the vocabulary has its own page, in every language —
`/street`, `/bg/street`, `/de/street` — listing everything that carries it,
with links to the pages where each picture is actually shown. That is
**39 pages nobody maintains**: adding a frame adds it to every category it
belongs to, and a new category is one word in `TAGS` plus three names.

They are real static files, generated by `docs/[category].paths.ts` and its two
translations, so each has its own canonical, its own `hreflang` alternates and
its own line in the sitemap. The tag chips under every inline figure link into
them, which is how the site got internal linking it never had.

`docs/.vitepress/categories.ts` is the single home of the vocabulary and its
names — the loader, the three paths files, the navigation and the components
all import it, so there is no copy to drift.

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

`.mcp.json` registers a **`titania-media`** MCP server (`tools/media-mcp.mjs`,
no dependencies) with seven tools: `media_list`, `media_derive`, `media_place`,
`media_fetch_youtube`, `feed_sync`, `site_check` and `page_weight`. They shell
out to the same scripts rather than reimplementing them; what they add is a
door. `media_place` in particular writes a figure into all three languages or
refuses and writes nothing — the edit that is easiest to do in one locale and
forget in the other two.

`.claude/skills/titania-media/` is the matching skill: the rules that will bite
you, and what to check when a picture is not showing up.

### What it costs

Every frame a page places is counted against that page's weight budget, so the
number of figures on a page is a real number with a real price — about 50 KB
each. The hero and the figure show the same file at about the same size, so a
frame is fetched once however many times it appears. No film, self-hosted or on
YouTube, is fetched until someone presses play.

### Who is in the frame

`media/README.md` holds the rule: only frames Titania appears in alone are
published, because the archive has consent for nothing else. Two frames break
it — both were on the site before any of this existed. They are marked
`consentOwed` in `media.data.ts`, and every build prints them:

```
media: 45 placements across 12 pages. 2 frame(s) still owe consent
  juggling-pass: a second person, clearly identifiable, is in the frame
  impact-hub: a seated audience, several of them identifiable, including a child
```

The debt stays visible until it is paid or the frames are dropped.

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
