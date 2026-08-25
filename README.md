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
| `check-ecosystem.mjs` | the couplings no single file shows: the navbar's link to the Clown site losing its per-locale prefix, the structured job title in `seo.ts` going stale, a Work with Titania description that has stopped mentioning team workshops, and the typography contract in `custom.css` — measure, balance, hyphenation — being edited away |
| `check-build.mjs` | a dead `#anchor`, which VitePress does not check; images without alt text; duplicate ids |
| `check-a11y.mjs` | the accessibility properties a diff cannot show. Contrast is recomputed from the CSS tokens on every build, because the brand red passes AA on white at 5.03:1 and fails it on the dark ground at 3.41:1 — nothing about editing a colour tells you which of the two grounds you just broke. Also, cheaply: every page declares a language and carries exactly one `h1` |
| `check-external.mjs` | link rot, told apart from a host refusing an automated request or serving an incomplete certificate chain — only the first fails the job |
| `check-images.mjs` | an image over the weight budget, pixel dimensions far past any slot on the page, a picture that costs too many bytes per pixel, and — the one no diff shows — `seo.ts` declaring dimensions the file does not have, which is what a social platform reads before it fetches anything. Unreferenced images are reported, not failed: a file may be linked from somewhere this repository cannot see |
| `check-page-weight.mjs` | a page that costs too much to open. It sums what a browser fetches before it can paint — the HTML, the stylesheets, the module preload chain, the preloaded fonts, every image — counting text compressed, because that is how it is served. The file check and this one come apart: an image well inside its own budget can still be why a page is the heaviest on the site |
| `check-origin.mjs` | a URL that would not survive a domain move. It rebuilds the site against a deliberately wrong origin and fails if the real host survives anywhere in the HTML, which keeps `SITE_ORIGIN` the single variable a move has to change. Thirty references once survived a switch because they were literal hosts in Markdown |

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
