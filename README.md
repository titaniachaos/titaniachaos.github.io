# Titania Chaos

The VitePress source for [titaniachaos.github.io](https://titaniachaos.github.io), with the Clown project as a subsite at `/clown/`.

## Development

Requires Node.js 26.

```sh
npm ci
npm run docs
```

Create a production build with `npm run docs:build` and preview it with `npm run docs:preview`.

## Deployment

The single GitHub Actions workflow builds the VitePress site from `main` with Node.js 26 and deploys only `docs/.vitepress/dist` to GitHub Pages. Hand-written HTML source files are rejected.
