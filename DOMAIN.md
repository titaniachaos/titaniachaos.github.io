# Moving to titaniachaos.com

**Not set yet, and nothing depends on it.** Both sites build against
`titaniachaos.github.io` today and will keep doing so until the day someone
changes one variable. This is what that day looks like, written down now while
it is calm.

## The switch

Both repositories read their origin from the environment:

```sh
SITE_ORIGIN=https://www.titaniachaos.com npm run docs:build
```

Every canonical URL, `hreflang`, sitemap entry, `robots.txt` line, schema.org
`@id`, Atom feed link and cross-site link follows it. Verified in both
repositories: built against the production domain, **zero** `github.io`
references remain in any HTML page.

What deliberately does **not** follow it: the `tag:` URIs that identify entries
in `citations.atom`. Atom identifiers are permanent. Changing them on a domain
move would make every entry look new to every subscriber, so they stay pinned
to `titaniachaos.github.io,2026` for good. That is correct, not an oversight.

## Order matters

Pointing `SITE_ORIGIN` at a domain that does not resolve yet publishes
canonical URLs to a dead host. So:

1. **DNS first.** Point the apex and `www` at GitHub Pages, per GitHub's own
   documented A records and CNAME. Wait for it to resolve.
2. **Pages settings** on `titaniachaos.github.io`: set the custom domain. Leave
   the clown repository's custom domain **empty** — project pages are served at
   `titaniachaos.com/clown/` automatically, which is why `base` stays `/clown/`.
3. **Enforce HTTPS**, once the certificate is issued.
4. **Then** set `SITE_ORIGIN` in both deploy workflows and push.
5. **Retire the IONOS site.** Until it goes, two live sites compete for the same
   searches. Redirect it rather than deleting it, so existing links survive.
6. **Search Console**: add the new property and use Change of Address. The
   verification token in `seo.ts` is per-property.

## Why it is not urgent

The sites are correct on the current domain: canonicals, `hreflang`, sitemaps
and structured data all agree with where the pages actually are. The move
improves the address, not the correctness.
