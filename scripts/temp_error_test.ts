
import { exec } from 'child_process';
import assert from 'assert';
console.log('Verifying the new error handling...');
const scriptPath = 'scripts/gemini-client.ts';
// Test 1: Invalid JSON should cause the script to exit with a non-zero status code
const invalidJsonTest = `npx tsx ${scriptPath} --task 'return invalid json' --output test.json`;
// Mock the call to the generative AI, and instead just return a fixed string
const invalidJsonContent = '```json\\n{\\"key\\": \\"value\\",}\\n```';
const invalidJsonCommand = `sed -i "s/await generateContentWithFallback(genAI, prompt)/'${invalidJsonContent}'/" ${scriptPath}} && ${invalidJsonTest}`;
exec(invalidJsonCommand, (error, stdout, stderr) => {
    assert(error, 'Test 1 Failed: Script should have exited with an error.');
    assert.strictEqual(error.code, 1, 'Test 1 Failed: Script should have exited with code 1.');
    console.log('✅ Test 1 Passed: Script correctly exited with a non-zero status code for invalid JSON.');
    // Test 2: Valid JSON should exit cleanly
    const validJsonTest = `npx tsx ${scriptPath} --task 'return valid json' --output test.json`;
    const validJsonContent = '```json\\n{\\"key\\": \\"value\\"}\\n```';
    const validJsonCommand = `sed -i "s/'${invalidJsonContent}'/'${validJsonContent}'/" ${scriptPath}} && ${validJsonTest}`;
    exec(validJsonCommand, (error, stdout, stderr) => {
        assert.ifError(error, 'Test 2 Failed: Script should have exited cleanly for valid JSON.');
        console.log('✅ Test 2 Passed: Script correctly handled valid JSON.');
        // cleanup
        exec(`git restore ${scriptPath}`);
    });
});
