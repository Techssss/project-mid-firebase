const { spawnSync } = require('node:child_process');
const { copyFileSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

// On Windows the Java emulator can misread paths with Vietnamese characters.
const temp = mkdtempSync(join(tmpdir(), 'project-mid-firebase-'));
try {
  for (const file of ['firebase.json', 'firestore.rules']) {
    copyFileSync(resolve(__dirname, '..', file), join(temp, file));
  }

  const result = spawnSync(
    'npx',
    ['--yes', 'firebase-tools@15.35.0', 'emulators:start', '--only', 'auth,firestore', '--project', 'demo-project-mid'],
    { cwd: temp, stdio: 'inherit', shell: process.platform === 'win32' },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
