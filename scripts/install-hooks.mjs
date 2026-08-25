// Installs .githooks/pre-commit into this clone's hooks directory.
// Wired to npm `prepare`, so `npm ci` / `npm install` sets it up.
//
// Deliberately does NOT set core.hooksPath. This machine may set that
// globally to a dispatcher that chains to .git/hooks/<name>; overriding it
// per repository would silently disable the dispatcher. Installing into the
// path git already consults keeps both working.
import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// A shim rather than a copy or a relative symlink: it resolves the repository
// at run time, so it survives the checkout being moved and works in worktrees.
const SHIM = `#!/bin/sh
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
[ -x "$root/.githooks/pre-commit" ] || exit 0
exec "$root/.githooks/pre-commit" "$@"
`

try {
  const gitDir = execFileSync('git', ['rev-parse', '--absolute-git-dir'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim()

  const hooks = join(gitDir, 'hooks')
  mkdirSync(hooks, { recursive: true })
  const target = join(hooks, 'pre-commit')
  writeFileSync(target, SHIM)
  chmodSync(target, 0o755)
  console.log('install-hooks: pre-commit installed')
} catch {
  // Not a git checkout (a tarball, a CI export). Nothing to install.
}
