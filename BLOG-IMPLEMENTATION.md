# Blog implementation report

The approved baseline merge preserved the local media guidance commit. This report records the blog implementation and its verification before the approved local commits. No push, PR, merge to a remote branch, deployment or publication was performed. A local baseline merge was explicitly approved and performed.

## Files changed for the blog

### Main site

- `BLOG-IMPLEMENTATION.md`

- `docs/.vitepress/config.mts`
- `docs/.vitepress/theme/index.ts`
- `BLOG.md`
- `docs/.vitepress/blog.data.ts`
- `docs/.vitepress/theme/BlogArticle.vue`
- `docs/.vitepress/theme/BlogIndex.vue`
- `docs/blog/index.md`
- `docs/bg/blog/index.md`
- `docs/de/blog/index.md`

### Solo site

- `docs/.vitepress/config.mts`
- `docs/.vitepress/theme/BlogTopic.vue`
- `docs/.vitepress/theme/NotFound.vue`
- `docs/bg/blog/bergson-comic-unconsciousness.md`
- `docs/bg/blog/gaulier-complicite.md`
- `docs/bg/blog/index.md`
- `docs/bg/blog/observation-practice.md`
- `docs/bg/blog/reading-the-flop.md`
- `docs/bg/blog/twenty-solitudes.md`
- `docs/bg/blog/winnicott-the-capacity-to-be-alone.md`
- `docs/blog/bergson-comic-unconsciousness.md`
- `docs/blog/gaulier-complicite.md`
- `docs/blog/index.md`
- `docs/blog/observation-practice.md`
- `docs/blog/reading-the-flop.md`
- `docs/blog/twenty-solitudes.md`
- `docs/blog/winnicott-the-capacity-to-be-alone.md`
- `docs/de/blog/bergson-comic-unconsciousness.md`
- `docs/de/blog/gaulier-complicite.md`
- `docs/de/blog/index.md`
- `docs/de/blog/observation-practice.md`
- `docs/de/blog/reading-the-flop.md`
- `docs/de/blog/twenty-solitudes.md`
- `docs/de/blog/winnicott-the-capacity-to-be-alone.md`

## Verification

- Both VitePress builds pass.
- Desktop (1280px) and mobile (390px) index and article layouts inspected in a browser. Mobile About → Blog link verified. No browser warnings or errors observed.
- A temporary article verified title, date, alt text, image credit, reference links and canonical URL. Removed before final delivery.
- Main locale, topic, ecosystem, media-word and factual checks pass. Main sitemap and accessibility checks pass.
- Solo locale, ecosystem, collection, citations receipt, image, page-weight and accessibility checks pass.
- Solo generated output contains no retired blog pages, no active blog sitemap entries and no rendered internal links to the old blog.

## Existing blockers to full regression checks

- Main full built-link check encounters missing `docs/.vitepress/dist/aequator/performance.html`; the independent Äquatormaßband build is not present in that output.
- Solo shared-file check reports pre-existing differences in `LocalePreference.vue` and `scripts/check-build.mjs` between repositories.
- Untracked `filing 2.md` files in Solo create extra routes, missing tags and encoded dead links; duplicate untracked dynamic-route files also produce warnings. These user files were preserved.
- Main source-check chain was interrupted during its unrelated media import scan after the earlier source checks passed. No tracked edits resulted from the scan.
- Production Cloudflare/host status codes cannot be established from these repository builds. Verify HTTP 404 after a separately authorized deployment. See BLOG.md for exact paths and authoring instructions.

The seven retired English paths and their German/Bulgarian counterparts have no replacement redirects. Their source files are deleted from active publication and recoverable in Git history. Existing missing-page behavior supplies the intended 404; 410 would require a server/edge mechanism absent from tracked configuration.
