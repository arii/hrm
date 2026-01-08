/**
 * @jest-environment node
 */
import { filterDiff } from '../../../scripts/identify-tech-debt'

describe('filterDiff', () => {
  it('should return an empty string when diff contains only non-production code', () => {
    const diffContent = `
diff --git a/.github/workflows/main.yml b/.github/workflows/main.yml
index 1234567..890abcd 100644
--- a/.github/workflows/main.yml
+++ b/.github/workflows/main.yml
@@ -1,1 +1,1 @@
-old content
+new content
diff --git a/src/component.stories.tsx b/src/component.stories.tsx
index 1234567..890abcd 100644
--- a/src/component.stories.tsx
+++ b/src/component.stories.tsx
@@ -1,1 +1,1 @@
-old content
+new content
diff --git a/src/feature.test.ts b/src/feature.test.ts
index 1234567..890abcd 100644
--- a/src/feature.test.ts
+++ b/src/feature.test.ts
@@ -1,1 +1,1 @@
-old content
+new content
diff --git a/tests/e2e/test.spec.ts b/tests/e2e/test.spec.ts
index 1234567..890abcd 100644
--- a/tests/e2e/test.spec.ts
+++ b/tests/e2e/test.spec.ts
@@ -1,1 +1,1 @@
-old content
+new content
`
    const filteredDiff = filterDiff(diffContent)
    expect(filteredDiff).toEqual('')
  })

  it('should not filter out production code', () => {
    const diffContent = `
diff --git a/src/production-code.ts b/src/production-code.ts
index 1234567..890abcd 100644
--- a/src/production-code.ts
+++ b/src/production-code.ts
@@ -1,1 +1,1 @@
-old content
+new content
diff --git a/src/another-file.js b/src/another-file.js
index 1234567..890abcd 100644
--- a/src/another-file.js
+++ b/src/another-file.js
@@ -1,1 +1,1 @@
-old content
+new content
`
    const filteredDiff = filterDiff(diffContent)
    expect(filteredDiff).toContain('diff --git a/src/production-code.ts b/src/production-code.ts')
    expect(filteredDiff).toContain('diff --git a/src/another-file.js b/src/another-file.js')
  })

  it('should handle a mix of production and non-production code', () => {
    const diffContent = `
diff --git a/src/production-code.ts b/src/production-code.ts
index 1234567..890abcd 100644
--- a/src/production-code.ts
+++ b/src/production-code.ts
@@ -1,1 +1,1 @@
-old content
+new content
diff --git a/src/feature.test.ts b/src/feature.test.ts
index 1234567..890abcd 100644
--- a/src/feature.test.ts
+++ b/src/feature.test.ts
@@ -1,1 +1,1 @@
-old content
+new content
`
    const filteredDiff = filterDiff(diffContent)
    expect(filteredDiff).toContain('diff --git a/src/production-code.ts b/src/production-code.ts')
    expect(filteredDiff).not.toContain('diff --git a/src/feature.test.ts b/src/feature.test.ts')
  })

  it('should handle an empty diff', () => {
    const diffContent = ''
    const filteredDiff = filterDiff(diffContent)
    expect(filteredDiff).toEqual('')
  })

  it('should handle a diff with a preamble', () => {
    const diffContent = `
This is a preamble.
It should be ignored.

diff --git a/src/production-code.ts b/src/production-code.ts
index 1234567..890abcd 100644
--- a/src/production-code.ts
+++ b/src/production-code.ts
@@ -1,1 +1,1 @@
-old content
+new content
`
    const filteredDiff = filterDiff(diffContent)
    expect(filteredDiff).not.toContain('This is a preamble.')
    expect(filteredDiff).toContain('diff --git a/src/production-code.ts b/src/production-code.ts')
  })
})
