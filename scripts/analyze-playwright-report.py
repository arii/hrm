import json
import sys
import os

def process_suite(suite, stats):
    """
    Recursively process a suite and its children to find all specs and tests.
    stats is a dictionary to keep track of counts.
    """
    # Process specs in the current suite level
    for spec in suite.get('specs', []):
        title = spec.get('title')
        file_path = spec.get('file')

        for test in spec.get('tests', []):
            status = test.get('status')
            outcome = test.get('outcome')
            project_name = test.get('projectName', '')
            full_title = f"[{project_name}] {file_path} › {title}" if project_name else f"{file_path} › {title}"

            if status == 'expected':
                stats['passed'] += 1
                print(f"✅ PASS: {full_title}")
            elif status == 'unexpected':
                stats['failed'] += 1
                print(f"❌ FAIL: {full_title}")
                for result in test.get('results', []):
                    for error in result.get('errors', []):
                            print(f"   Error: {error.get('message', '').strip()}")
            elif status == 'flaky':
                stats['flaky'] += 1
                print(f"⚠️ FLAKY: {full_title}")
            elif status == 'skipped':
                stats['skipped'] += 1
                print(f"⏭️ SKIP: {full_title}")
            else:
                print(f"❓ UNKNOWN ({status}): {full_title}")

    # Recursively process child suites (e.g., describe blocks)
    for child_suite in suite.get('suites', []):
        process_suite(child_suite, stats)

def analyze_report(report_path):
    if not os.path.exists(report_path):
        print(f"Error: Report file not found at {report_path}")
        sys.exit(1)

    try:
        with open(report_path, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error: Failed to decode JSON report: {e}")
        sys.exit(1)

    stats = {
        'passed': 0,
        'failed': 0,
        'flaky': 0,
        'skipped': 0
    }

    print("\n================ TEST RESULTS ================\n")

    for suite in data.get('suites', []):
        process_suite(suite, stats)

    print("\n================ SUMMARY ================")
    total = stats['passed'] + stats['failed'] + stats['flaky'] + stats['skipped']
    print(f"Total: {total}")
    print(f"Passed: {stats['passed']}")
    print(f"Failed: {stats['failed']}")
    print(f"Flaky: {stats['flaky']}")
    print(f"Skipped: {stats['skipped']}")
    print("=========================================\n")

    if stats['failed'] > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_report.py <path_to_playwright_report.json>")
        sys.exit(1)

    analyze_report(sys.argv[1])
