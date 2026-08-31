import { runSuites } from './test-framework';
import './challenger-concurrency-stress';

async function main() {
  console.log('\x1b[35m============================================================\x1b[0m');
  console.log('\x1b[1m\x1b[35m   ARUM SEDUH — CHALLENGER 1 EMPIRICAL STRESS SUITE   \x1b[0m');
  console.log('\x1b[35m============================================================\x1b[0m\n');

  const startTime = Date.now();
  const suiteResults = await runSuites();
  const totalDuration = Date.now() - startTime;

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  for (const s of suiteResults) {
    totalTests += s.totalTests;
    totalPassed += s.passedTests;
    totalFailed += s.failedTests;
  }

  console.log('\n\x1b[35m============================================================\x1b[0m');
  console.log('\x1b[1mCHALLENGER STRESS EXECUTION SUMMARY\x1b[0m');
  console.log('\x1b[35m============================================================\x1b[0m');
  console.log(`Suites:       ${suiteResults.length} total`);
  console.log(`Tests:        ${totalFailed === 0 ? '\x1b[32m' : '\x1b[31m'}${totalPassed}/${totalTests} passed\x1b[0m (${totalFailed} failed)`);
  console.log(`Duration:     \x1b[90m${(totalDuration / 1000).toFixed(2)}s\x1b[0m`);
  console.log('\x1b[35m============================================================\x1b[0m\n');

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal challenger execution error:', err);
  process.exit(1);
});
