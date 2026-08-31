/**
 * Unified Test Runner for Arum Seduh 4-Tier E2E Testing Suite
 * Command: npx tsx tests/run-all-tests.ts
 */

import { runSuites } from './test-framework';

// Import all test suites
import './redis-cache.test';
import './cache-invalidation.test';
import './swr-hooks.test';
import './bundle-optimization.test';
import './shimmer-skeleton.test';
import './brand-integrity.test';
import './tier2-boundary.test';
import './tier3-integration.test';
import './tier4-workflows.test';
import './challenger-concurrency-stress';

async function main() {
  console.log('\x1b[33m============================================================\x1b[0m');
  console.log('\x1b[1m\x1b[33m   ARUM SEDUH — 4-TIER COMPREHENSIVE E2E TEST SUITE   \x1b[0m');
  console.log('\x1b[33m============================================================\x1b[0m\n');

  const startTime = Date.now();
  const suiteResults = await runSuites();
  const totalDuration = Date.now() - startTime;

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSuites = suiteResults.length;
  let passedSuites = 0;

  for (const s of suiteResults) {
    totalTests += s.totalTests;
    totalPassed += s.passedTests;
    totalFailed += s.failedTests;
    if (s.passed) {
      passedSuites++;
    }
  }

  console.log('\n\x1b[33m============================================================\x1b[0m');
  console.log('\x1b[1mTEST EXECUTION SUMMARY\x1b[0m');
  console.log('\x1b[33m============================================================\x1b[0m');
  console.log(`Suites:       ${passedSuites === totalSuites ? '\x1b[32m' : '\x1b[31m'}${passedSuites}/${totalSuites} passed\x1b[0m`);
  console.log(`Tests:        ${totalFailed === 0 ? '\x1b[32m' : '\x1b[31m'}${totalPassed}/${totalTests} passed\x1b[0m (${totalFailed} failed)`);
  console.log(`Duration:     \x1b[90m${(totalDuration / 1000).toFixed(2)}s\x1b[0m`);
  console.log('\x1b[33m============================================================\x1b[0m\n');

  if (totalFailed > 0) {
    console.error(`\x1b[31m✖ Suite execution failed with ${totalFailed} errors.\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m✔ 100% of test suites passed successfully for Arum Seduh.\x1b[0m\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
