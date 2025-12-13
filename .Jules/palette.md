# Palette's Journal

## 2024-05-22 - [Project Inception]
**Learning:** This is the start of the UX journal for this project.
**Action:** I will document critical UX learnings here as I discover them.

## 2024-05-22 - [Fixing Broken ARIA References]
**Learning:** The playback controls used `aria-labelledby` referencing non-existent IDs. This creates a worse experience than no label at all, as screen readers may read nothing or read the reference ID.
**Action:** When using compact UI components, prefer direct `aria-label` unless there is a visible text label that must be kept in sync.
