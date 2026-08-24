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

## Deployment

A single GitHub Actions workflow builds the site from `main` on Node.js 26 and
deploys only `docs/.vitepress/dist` to GitHub Pages. Hand-written HTML source
files are rejected.
