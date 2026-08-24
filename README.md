# Titania Chaos

Single VitePress site for Titania Chaos, including the Clown project at `/clown/`.

Run `npm install` once, then `npm run docs` for local development. Use `npm run docs:build` for a production build. GitHub Actions deploys `main`.

## Releases

Releases are automated with Release Please. Use Conventional Commit prefixes:

- `feat:` for a minor release
- `fix:` for a patch release
- `feat!:` or a `BREAKING CHANGE:` footer for a major release
- `docs:`, `chore:`, `refactor:` and similar prefixes for non-release maintenance

After qualifying commits reach `main`, the release workflow opens or updates a release PR. Merging that PR updates `version.txt` and `CHANGELOG.md`, creates the version tag, and publishes the GitHub Release. The normal Pages workflow deploys the merged site automatically.
