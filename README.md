# Titania Chaos

The VitePress source for [titaniachaos.github.io](https://titaniachaos.github.io), including the
Clown project pages served at `/clown/`.

## Development

Requires Node.js 26.

```sh
npm ci
npm run docs:dev
```

Create a production build with `npm run docs:build` and preview it with `npm run docs:preview`.

## Deployment

A single GitHub Actions workflow builds the site from `main` on Node.js 26 and deploys only
`docs/.vitepress/dist` to GitHub Pages. Hand-written HTML source files are rejected.

`cleanUrls` is enabled, so every page resolves without a trailing slash — `/events`, not
`/events/`. Only `docs/clown/index.md` maps to a directory URL (`/clown/`).

> **GitHub Pages must stay disabled on the `titaniachaos/clown` repository.** A repository named
> `clown` claims the `titaniachaos.github.io/clown/` path and shadows `docs/clown/` here.
