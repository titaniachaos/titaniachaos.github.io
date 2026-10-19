# Main-site blog

The main site's blog lives at `/blog/`, `/bg/blog/`, and `/de/blog/`.
The index reads article Markdown through `docs/.vitepress/blog.data.ts`.
There are no published articles initially.

## Authoring

Create `docs/blog/<slug>.md` and its `docs/bg/blog/` and `docs/de/blog/`
translations to follow the existing locale-parity checks. Use the existing
Markdown frontmatter for `title`, `description`, and a quoted ISO `date`
(`YYYY-MM-DD`). Set `blogArticle: true` to include the article in its index.
Set `sidebar: false` if no sidebar is wanted.

Wrap the body in `<BlogArticle>` and `</BlogArticle>`, with blank lines before
and after the body. The component renders the title as the sole h1; begin body
sections at h2. It renders the supplied date, optional image and credit, then
optional reference links. No article content or dates are generated.

Optional frontmatter fields:

- `image`: mapping with `src`, `alt`, optional intrinsic `width` and `height`,
  and optional `credit`. Always supply alt text; use an empty string only for
  decorative images. Credits appear in a figcaption next to the image.
- `references`: list of mappings with `label` and `url`.

The existing `seo.ts` controls titles, descriptions, canonicals, social cards,
and language alternates. Social previews use the existing site fallback image.
Existing sitemap, feeds and robots generation automatically include written
blog pages. No separate SEO system or taxonomy is used.

## Retired Solo URLs

The old index and the following articles have no equivalent replacement:

- `/clown/blog/`
- `/clown/blog/bergson-comic-unconsciousness`
- `/clown/blog/gaulier-complicite`
- `/clown/blog/observation-practice`
- `/clown/blog/reading-the-flop`
- `/clown/blog/twenty-solitudes`
- `/clown/blog/winnicott-the-capacity-to-be-alone`

All use the Solo site's existing missing-page/404 mechanism, with no redirect.
The same applies under `/clown/bg/blog/` and `/clown/de/blog/`, and to trailing
slash variants. The sources are removed in the `clown` repository; Git history
preserves them. Derived listings, local search and sitemaps rebuild without them.

The tracked deployment workflows use static GitHub Pages. There is no tracked
410-capable server or Cloudflare edge configuration, so no 410 response is added.
After a separately authorized deployment, verify that all these paths return
HTTP 404 through the actual production host/CDN, including slash variants.
Local generated-file checks cannot prove the production edge response.

Both repositories must eventually receive their corresponding changes to finish
the transition. This work does not push or deploy either repository.
