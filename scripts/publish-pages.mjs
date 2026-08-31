// Rebuilds the web export and publishes it to the gh-pages branch.
//
//   npm run publish
//
// Deployed as a branch rather than a GitHub Actions workflow on purpose: publishing a workflow
// file needs a token with the `workflow` scope, and this needs none - it is an ordinary push.
// The trade is that the site updates when you run this, not when you push to main.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// git runs without a shell. On Windows `shell: true` re-splits the arguments, which breaks any
// argument containing a space - the commit message was being cut at the first one.
const git = (args, cwd) => execFileSync('git', args, { cwd, stdio: 'inherit' });

// npx IS a shim on Windows and does need one.
const run = (cmd, args) =>
  execFileSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });

const capture = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();

// Which remote hosts the Pages site. `origin` is right for a normal clone; PAGES_REMOTE exists
// because a working copy can have several remotes, and publishing to the wrong one succeeds
// quietly - it pushes a real branch to a real repository, just not the one serving the site.
const remoteName = process.env.PAGES_REMOTE || 'origin';
const remote = capture('git', ['remote', 'get-url', remoteName]);
console.log(`\n  Publishing to ${remote} (${remoteName} -> gh-pages)\n`);

run('npx', ['expo', 'export', '--platform', 'web']);

const staging = mkdtempSync(join(tmpdir(), 'mdf-pages-'));

try {
  cpSync('dist', staging, { recursive: true });

  // Required, and the failure it prevents is invisible: the bundle lives under _expo/, and
  // GitHub Pages runs Jekyll by default, which silently drops every underscore-prefixed
  // directory. Without this the site serves a blank page with 404s for all its scripts.
  writeFileSync(join(staging, '.nojekyll'), '');

  git(['init', '-q', '-b', 'gh-pages'], staging);

  // A fresh repository inherits global config, which a CI machine or a new checkout may not
  // have - and git refuses to commit without an identity.
  const identity = (key, fallback) => {
    try {
      return capture('git', ['config', '--get', key]) || fallback;
    } catch {
      return fallback;
    }
  };
  git(['config', 'user.name', identity('user.name', 'My Daily Fitness')], staging);
  git(['config', 'user.email', identity('user.email', 'noreply@example.com')], staging);

  git(['add', '-A'], staging);
  git(['commit', '-q', '-m', `Publish ${new Date().toISOString()}`], staging);
  git(['remote', 'add', 'origin', remote], staging);

  // Force: the published site is a snapshot, not a history worth keeping.
  git(['push', '-f', 'origin', 'gh-pages'], staging);

  console.log('\n  Published. Give Pages a minute, then reload on your phone.\n');
} finally {
  rmSync(staging, { recursive: true, force: true });
}
