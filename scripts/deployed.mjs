#!/usr/bin/env node
// Did the commit that was just pushed actually deploy?
//
// pre-push guarantees the tree was green when it left. It cannot guarantee the
// deploy: the workflow runs on GitHub, minutes later, against a runner with a
// different Node, a cold cache and whatever the network is doing. A push whose
// checks all passed can still end up with the site not rebuilt, and nothing
// says so unless somebody looks.
//
// So this looks. It finds the workflow run for the commit at HEAD, waits for
// it to finish, and exits non-zero if it did not succeed.
//
// Usage:
//   npm run deployed          wait for HEAD's run
//   npm run deployed -- --sha <sha>
//   npm run deployed -- --no-wait   report and exit rather than waiting

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const at = args.indexOf(name)
  return at < 0 ? fallback : args[at + 1]
}
const WAIT = !args.includes('--no-wait')

const sha = flag('--sha', (await run('git', ['rev-parse', 'HEAD'])).stdout.trim())

async function runFor(commit) {
  const { stdout } = await run('gh', [
    'run', 'list', '--limit', '20',
    '--json', 'headSha,status,conclusion,displayTitle,workflowName,url'
  ])
  return JSON.parse(stdout).find((r) => r.headSha === commit) ?? null
}

const short = sha.slice(0, 8)
let found = await runFor(sha)

if (!found) {
  // A push that has not registered yet looks the same as a commit that was
  // never pushed. Say which rather than guessing.
  const { stdout } = await run('git', ['branch', '--contains', sha, '-r']).catch(() => ({ stdout: '' }))
  const pushed = stdout.trim().length > 0
  console.error(
    pushed
      ? `deployed: ${short} is on the remote but no workflow run has appeared yet — try again in a moment`
      : `deployed: ${short} is not on the remote. Nothing to deploy.`
  )
  process.exit(1)
}

// GitHub reports queued and in_progress before it reports a conclusion.
while (WAIT && found.status !== 'completed') {
  console.log(`deployed: ${short} — ${found.workflowName} is ${found.status}`)
  await new Promise((r) => setTimeout(r, 15000))
  found = (await runFor(sha)) ?? found
}

const line = `${found.workflowName}: ${found.conclusion ?? found.status}`
if (found.conclusion === 'success') {
  console.log(`deployed: ${short} — ${line}`)
  console.log(`  ${found.displayTitle}`)
  process.exit(0)
}

console.error(`deployed: ${short} — ${line}`)
console.error(`  ${found.displayTitle}`)
console.error(`  ${found.url}`)
process.exit(1)
