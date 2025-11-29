const { execSync, spawn } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');

// --- Configuration ---
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
function publishStatus(sha, context, state, description) {
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

  return new Promise((resolve) => {
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
  console.log('🚀 Starting Self-Certifying Verifier...');

  // 1. Cleanup & Preparation
  if (fs.existsSync(REPORT_FILE)) fs.unlinkSync(REPORT_FILE);
  const sourceHash = getSourceHash();

  // 2. Run Tests
  console.log('\n🧪 Running Tests...');
  let globalSuccess = true;
  try {
    execSync('npm run test:json', { stdio: 'inherit' });
  } catch (e) {
    console.log('⚠️  Tests finished with failures.');
  }

  // 3. Parse Results (Existing logic)
  if (!fs.existsSync(REPORT_FILE)) {
    console.error('❌ Critical: No report generated.');
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'));
  const resultsByFile = {};
  const allFailures = []; // New array to store detailed failures

  function processSuite(suite, fileName) {
    if (!resultsByFile[fileName]) {
      resultsByFile[fileName] = { total: 0, passed: 0, failed: 0 };
    }
    if (suite.specs) {
      suite.specs.forEach(s => {
        resultsByFile[fileName].total++;
        if (s.ok) {
          resultsByFile[fileName].passed++;
        } else {
          resultsByFile[fileName].failed++;
          globalSuccess = false;

          // Capture detailed error info
          if (s.tests) {
            s.tests.forEach(t => {
              if (t.results) {
                t.results.forEach(r => {
                  if (r.status === 'failed' || r.status === 'timedOut') {
                    allFailures.push({
                      file: fileName,
                      title: s.title,
                      message: r.error ? r.error.message : `Status: ${r.status}`
                    });
                  }
                });
              }
            });
          }
        }
      });
    }
    if (suite.suites) {
      suite.suites.forEach(s => processSuite(s, fileName));
    }
  }
  if (report.suites) report.suites.forEach(s => processSuite(s, path.basename(s.title, '.spec.ts')));
  else globalSuccess = false;

  // Print Failures to Console
  if (allFailures.length > 0) {
    console.log('\n❌ Failed Tests Details:');
    allFailures.forEach((f, index) => {
      console.log(`\n${index + 1}. [${f.file}] ${f.title}`);
      console.log('   Error:');
      // Indent error message for better readability
      const lines = f.message.split('\n');
      lines.forEach(line => console.log(`     ${line}`));
    });
    console.log(''); // Empty line separator
  }

  // 4. Generate & Save Proof
  const manifest = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    sourceHash: sourceHash,
    status: globalSuccess ? 'success' : 'failure',
    details: resultsByFile
  };
  fs.writeFileSync(PROOF_FILE, JSON.stringify(manifest, null, 2));

  // 5. (Skipped) Commit & Push
  // test-proof.json is no longer committed to the repo.

  // 6. Get the current SHA
  const finalSha = execSync('git rev-parse HEAD').toString().trim();

  // 7. Publish Status
  console.log('\n☁️  Publishing checks to GitHub...');
  const promises = [];

  // Global Status
  promises.push(publishStatus(finalSha, 'verifier/global', globalSuccess ? 'success' : 'failure', globalSuccess ? 'Verified Safe' : 'Tests Failed'));

  // File Statuses
  for (const [name, stats] of Object.entries(resultsByFile)) {
    const state = stats.failed === 0 ? 'success' : 'failure';
    promises.push(publishStatus(finalSha, `verifier/${name}`, state, `${stats.passed}/${stats.total} passed`));
  }

  await Promise.all(promises);
  console.log(globalSuccess ? '\n✅ Verification Complete.' : '\n❌ Verification Failed.');

  // Cleanup
  if (fs.existsSync(REPORT_FILE)) {
    fs.unlinkSync(REPORT_FILE);
  }

  process.exit(globalSuccess ? 0 : 1);
}

main().catch(console.error);
