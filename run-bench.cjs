const { execSync } = require('child_process');

console.log('Running benchmark multiple times to get a stable baseline...');

for (let i = 0; i < 3; i++) {
  try {
    const output = execSync('pnpm vitest bench tests/performance/benchmarks/RecordingPlugin.bench.ts --run', { encoding: 'utf-8' });
    console.log(output.split('\n').filter(l => l.includes('uninstall with')).join('\n'));
  } catch(e) {
    console.error(e.message);
  }
}
