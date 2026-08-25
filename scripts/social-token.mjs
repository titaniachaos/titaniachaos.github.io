#!/usr/bin/env node
// Keeps the Instagram long-lived token alive, and says so loudly when it cannot.
//
// A long-lived token lasts 60 days. Refreshing returns a NEW token string --
// it does not extend the old one in place -- so something has to store the new
// value. A workflow cannot rewrite its own secret with the default GITHUB_TOKEN,
// which is the honest limit here.
//
// So: if a token with secret-write scope is present as GH_ADMIN_TOKEN, the new
// value is written back and the wall keeps itself running. If it is not, this
// reports the days remaining and FAILS once the token is inside a week of
// expiry, because a feed that silently freezes is worse than a red build.
//
// Usage: IG_TOKEN=... [GH_ADMIN_TOKEN=...] node scripts/social-token.mjs

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const TOKEN = process.env.IG_TOKEN
const ADMIN = process.env.GH_ADMIN_TOKEN
const REPO = process.env.GITHUB_REPOSITORY ?? 'titaniachaos/titaniachaos.github.io'

if (!TOKEN) {
  console.log('social-token: no IG_TOKEN, nothing to refresh')
  process.exit(0)
}

const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${TOKEN}`
const res = await fetch(url)
const body = await res.json().catch(() => ({}))

if (!res.ok || !body.access_token) {
  console.error(`social-token: refresh failed (${res.status})`)
  console.error(`  ${JSON.stringify(body).slice(0, 300)}`)
  console.error('  A token that cannot refresh is a token about to expire. Re-issue it from the Meta app.')
  process.exit(1)
}

const days = Math.round((body.expires_in ?? 0) / 86400)
console.log(`social-token: refreshed, ${days} days remaining`)

if (body.access_token === TOKEN) {
  console.log('  unchanged — nothing to store')
  process.exit(0)
}

if (!ADMIN) {
  console.log('  a new token was issued and cannot be stored: GH_ADMIN_TOKEN is not set.')
  console.log('  Update the IG_TOKEN secret by hand, or add a token with secret-write scope.')
  if (days <= 7) {
    console.error(`  FAILING: ${days} days left and no way to store the refreshed token.`)
    process.exit(1)
  }
  process.exit(0)
}

await run('gh', ['secret', 'set', 'IG_TOKEN', '--repo', REPO, '--body', body.access_token], {
  env: { ...process.env, GH_TOKEN: ADMIN }
})
console.log('  stored the refreshed token in the IG_TOKEN secret')
