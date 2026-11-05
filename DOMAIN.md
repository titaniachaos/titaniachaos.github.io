# Domain and deployment: titaniachaos.com

## Current configuration

The main site is published at <https://titaniachaos.com>. Its VitePress
configuration uses that origin by default in `docs/.vitepress/seo.ts`:

```ts
export const HOSTNAME = (process.env.SITE_ORIGIN ?? 'https://titaniachaos.com').replace(/\/$/, '')
```

The `clown` repository is a separate VitePress project under `/clown/`.
The main site's navigation treats `/clown/` and `/aequator/` as separate
site roots on the same host.

Both the main site and the Clown project deploy through GitHub Actions to
GitHub Pages. The main repository deploy workflow builds on pushes to
`main` after source and build checks.

**Scope of verification:** These statements reflect repository source as
reviewed on 2026-11-05 and the publicly reachable domain. DNS records,
Cloudflare proxy and redirect rules, GitHub Pages custom-domain settings,
certificate configuration and the live Search Console property were **not**
verified through their respective admin interfaces.

## Origin portability

The source of truth for generated absolute URLs is `SITE_ORIGIN`, with the
production-domain default in `seo.ts`. This controls canonical URLs,
language alternates, social metadata, structured data and sitemap generation.
For a test build against another origin:

```sh
SITE_ORIGIN=https://example.at npm run docs:build
npm run check:origin
```

Do not hard-code the production host into newly authored pages or metadata.
The normal locale structure is English at the root, German under `/de/`,
and Bulgarian under `/bg/`.

## If the domain configuration changes again

Before changing DNS or deployment settings, check the **actual** values in
Cloudflare, GitHub Pages and the deploy workflows; do not assume the old
migration steps are still pending.

1. Confirm the intended canonical hostname (`www` versus apex), DNS target,
   TLS mode and redirects in Cloudflare.
2. Confirm GitHub Pages custom-domain and HTTPS settings for the main
   repository, and the separate project-site configuration for `/clown/`.
3. Verify `SITE_ORIGIN` in both repositories and the resulting canonicals,
   `hreflang`, sitemap entries, schema.org identifiers and cross-site links.
4. Check redirect behaviour for any legacy hostnames, then verify relevant
   Search Console properties and indexing.
5. Run each repository's checks and verify the public sites after deployment.

Keep the existing paths stable. A host change should be handled through
configuration and redirects rather than hand-editing links across pages.

## Permanent identifiers

The `tag:` identifiers in the Clown project's `citations.atom` are
intentionally permanent; they must not be rewritten just because a domain
changes. Changing them could make existing entries appear new to subscribers.
