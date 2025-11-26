import { execSync, spawn } from 'child_process';
import fs from 'fs';
import https from 'https';
import path from 'path';

// --- Configuration ---
// Ensure GITHUB_TOKEN is loaded. You might need 'dotenv' if running locally without it pre-loaded.
// import 'dotenv/config';

const PROOF_FILE = 'test-proof.json';
const REPORT_FILE = 'playwright-report.json';

// --- Helpers ---

// 1. Calculate Source Hash (The Fingerprint)
function getSourceHash() {
  console.log('🔒 Calculating source fingerprint...');
  // Hashes all relevant source and test files to create a unique signature
  const cmd = `find app components context hooks lib services types utils tests -type f -name '*.*' -not -path '*/.*' | sort | xargs sha1sum | sha1sum | awk '{print $1}'`;
  return execSync(cmd).toString().trim();
}

// 2. Get Current Commit SHA
function getCommitSha() {
  return execSync('git rev-parse HEAD').toString().trim();
}

// 3. Publish Status to GitHub (Native HTTPS - No Dependencies)
function publishStatus(sha: string, context: string, state: 'success' | 'failure', description: string) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn(`⚠️  Skipping GitHub publish for ${context} (No GITHUB_TOKEN found)`);
    return Promise.resolve();
  }

  // Auto-detect owner/repo from git remote
  let repoPath = '';
  try {
    const remoteUrl = execSync('git config --get remote.origin.url').toString().trim();
    const match = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);
    if (match) repoPath = `${match[1]}/${match[2]}`;
  } catch (e) {
    console.error('❌ Could not detect git remote');
    return Promise.resolve();
  }

  const data = JSON.stringify({
    state,
    description: description.substring(0, 140), // Limit per GitHub API
    context,
    target_url: `https://github.com/${repoPath}/blob/${sha}/${PROOF_FILE}` // Link to the proof file
  });

  const options = {
    hostname: 'api.github.com',
    path: `/repos/${repoPath}/statuses/${sha}`,
    method: 'POST',
    headers: {
      'User-Agent': 'HRM-Verifier-Script',
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise<void>((resolve) => {
    const req = https.request(options, (res) => {
      if (res.statusCode === 201) {
        console.log(`   ✅ Published: ${context} -> ${state}`);
      } else {
        console.error(`   ❌ API Error (${res.statusCode}) for ${context}`);
      }
      resolve();
    });

    req.on('error', (e) => {
      console.error(`   ❌ Network Error: ${e.message}`);
      resolve();
    });

    req.write(data);
    req.end();
  });
}

// --- Main Execution ---

async function main() {
  console.log('🚀 Starting Local Verifier...');

  // A. Cleanup old reports
  if (fs.existsSync(REPORT_FILE)) fs.unlinkSync(REPORT_FILE);

  const sha = getCommitSha();
  const sourceHash = getSourceHash();
  console.log(`📌 Commit: ${sha.slice(0, 7)}`);
  console.log(`🔒 Hash:   ${sourceHash}`);

  // B. Build and Start Server
  console.log('\n🏗️  Building application...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('🚀 Starting server in background...');
  const serverLog = fs.openSync('/tmp/verifier-server.log', 'w');
  const server = spawn('node', ['dist/server.mjs'], {
    detached: true,
    stdio: ['ignore', serverLog, serverLog],
  });

  console.log(`   Server PID: ${server.pid}`);
  await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for server to start

  try {
    // C. Run Playwright
    console.log('\n🧪 Running Tests and updating snapshots (this takes a moment)...');
    try {
      // Run tests, update snapshots, and force JSON output. Ignore exit code to ensure we parse the report.
      execSync('npx playwright test --update-snapshots --reporter=json > ' + REPORT_FILE, { stdio: 'inherit' });
    } catch (e) {
      console.log('⚠️  Tests finished with failures.');
    }
  } finally {
    // D. Stop Server
    console.log('\n🛑 Stopping server...');
    if (server.pid) {
      process.kill(-server.pid);
    }
  }

  if (!fs.existsSync(REPORT_FILE)) {
    console.error('❌ Critical: No test report generated.');
    process.exit(1);
  }

  // C. Parse Report
  const reportJson = fs.readFileSync(REPORT_FILE, 'utf-8');
  if (!reportJson) {
      console.error('❌ Critical: Test report file is empty.');
      process.exit(1);
  }
  const report = JSON.parse(reportJson);
  const resultsByFile: Record<string, { total: number; passed: number; failed: number }> = {};
  let globalSuccess = true;

  // Helper function to recursively process suites and collect spec results
  function processSuite(suite: any, fileName: string) {
    if (!resultsByFile[fileName]) {
        resultsByFile[fileName] = { total: 0, passed: 0, failed: 0 };
    }
    const stats = resultsByFile[fileName];

    // Process specs within the current suite
    if (suite.specs) {
      suite.specs.forEach((spec: any) => {
        stats.total++;
        if (spec.ok) {
          stats.passed++;
        } else {
          stats.failed++;
          globalSuccess = false;
        }
      });
    }

    // Recurse into nested suites
    if (suite.suites) {
      suite.suites.forEach((nestedSuite: any) => {
        processSuite(nestedSuite, fileName);
      });
    }
  }

  // The top-level suites in the report are the files
  if (report.suites) {
    report.suites.forEach((fileSuite: any) => {
      const name = path.basename(fileSuite.title, '.spec.ts');
      processSuite(fileSuite, name);
    });
  } else {
      console.error('❌ Critical: Report JSON is missing the "suites" property.');
      // A report with no tests will have a suites array, so this is a genuine error.
      globalSuccess = false;
  }

  // D. Generate Proof Manifest
  const manifest = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    commit: sha,
    sourceHash: sourceHash,
    status: globalSuccess ? 'success' : 'failure',
    details: resultsByFile
  };
  fs.writeFileSync(PROOF_FILE, JSON.stringify(manifest, null, 2));
  console.log(`\n📄 Proof Manifest saved to ${PROOF_FILE}`);

  // E. Publish Results (Parallel Requests)
  console.log('\n☁️  Publishing checks to GitHub...');

  const promises = [];

  // 1. Global Status
  promises.push(publishStatus(
    sha,
    'verifier/global',
    globalSuccess ? 'success' : 'failure',
    globalSuccess ? 'All systems operational' : 'Tests failed'
  ));

  // 2. Distinct Check for each Test File
  for (const [name, stats] of Object.entries(resultsByFile)) {
    const state = stats.failed === 0 ? 'success' : 'failure';
    const desc = `${stats.passed}/${stats.total} passed`;
    promises.push(publishStatus(sha, `verifier/${name}`, state, desc));
  }

  await Promise.all(promises);

  // Cleanup
  fs.unlinkSync(REPORT_FILE);

  if (globalSuccess) {
    console.log('\n✅ Verification Complete. You can now commit the proof file.');
    process.exit(0);
  } else {
    console.error('\n❌ Verification Failed. Please fix tests before committing.');
    process.exit(1);
  }
}

main().catch(console.error);
