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

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });

const capture = (cmd, args) =>
  execFileSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' }).trim();

const remote = capture('git', ['remote', 'get-url', 'origin']);
console.log(`\n  Publishing to ${remote} (gh-pages)\n`);

run('npx', ['expo', 'export', '--platform', 'web']);

const staging = mkdtempSync(join(tmpdir(), 'mdf-pages-'));

try {
  cpSync('dist', staging, { recursive: true });

  // Required, and the failure it prevents is invisible: the bundle lives under _expo/, and
  // GitHub Pages runs Jekyll by default, which silently drops every underscore-prefixed
  // directory. Without this the site serves a blank page with 404s for all its scripts.
  writeFileSync(join(staging, '.nojekyll'), '');

  run('git', ['init', '-q', '-b', 'gh-pages'], staging);
  run('git', ['add', '-A'], staging);
  run('git', ['commit', '-q', '-m', `Publish ${new Date().toISOString()}`], staging);
  run('git', ['remote', 'add', 'origin', remote], staging);

  // Force: the published site is a snapshot, not a history worth keeping.
  run('git', ['push', '-f', 'origin', 'gh-pages'], staging);

  console.log('\n  Published. Give Pages a minute, then reload on your phone.\n');
} finally {
  rmSync(staging, { recursive: true, force: true });
}
