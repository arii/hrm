# Project Vision

Read this before proposing, building, auditing or reviewing anything in this repository. When a request, issue or audit finding conflicts with this file, this file wins until the owner changes it.

## How the app is used

One instructor (the owner) runs a live group workout over Zoom with 3 to 4 remote attendees.

| Surface                      | Who                    | Where they are                                                               | What it must do                                                                                                |
| :--------------------------- | :--------------------- | :--------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| Dashboard (`/`)              | Everyone, through Zoom | The owner's desktop browser, captured by OBS and streamed into Zoom as video | Be readable from across a room and through a compressed Zoom video tile. Nobody touches it during the workout. |
| Control (`/client/control`)  | Owner                  | Phone, on the workout mat                                                    | Start and stop the timer, pick the interval, change music volume. This is the only in-workout input surface.   |
| Connect (`/client/connect`)  | Each attendee          | Their own computer, set up once before the workout                           | Pair a Bluetooth heart rate strap once and stay connected for the whole workout with no further interaction.   |
| Spotify, settings, playlists | Owner                  | Desktop or phone, before the workout                                         | One-time setup: connect Spotify, set beep volume, refresh the workout doc.                                     |

The dashboard is a broadcast screen, not an app. Interactive controls on it are used only during setup (beep volume, Spotify connection, workout doc refresh) and occasionally between sets.

## What matters, in priority order

1. **Reliability during a live session.** The timer is accurate, beeps are audible, Bluetooth stays connected, music keeps playing. A regression here ruins a live class.
2. **Legibility from a distance.** Every pixel on the 1600x900 dashboard canvas competes for space. Bigger text beats more information. Text that cannot be read through a Zoom tile from the mat is a bug.
3. **Workout content fidelity.** Exercise cards show what the owner wrote in the Google Doc, as large as it fits. The doc is a table with one header row and one content row with 4 to 6 columns; cards are sized from that table.
4. **Privacy.** Heart rate is health data. It is shown live and then discarded (see Privacy below).
5. **Simplicity.** Every new control, badge or code path is a new place for bugs and security issues. Fewer moving parts is the default.

## Recent wins (the model for good changes)

- Bluetooth auto-connect: attendees pair once and the strap reconnects without them touching anything.
- Workout doc rendered as a native table with deterministic font fitting, so 4 to 6 columns fill their cards at the largest readable size.
- Beep regression fixed with an end-to-end CI guard that the dashboard actually plays timer beeps.

## Examples of changes that should not have shipped

- A Start/Stop button on the dashboard timer card. The owner is never at the computer when starting the timer.
- "Start 30/10" interval buttons on workout cards. Same reason, plus it coupled the cards to the timer and Spotify.
- Appending "(50 reps)" to exercise text. It changed the owner's content and made text longer, which shrinks the fitted font.
- High-contrast pill styling on the dashboard footer nav. It draws the eye away from the timer and HR tiles on the stream.
- Removing the timer config slider as "unnecessary". It was the only way to set the dashboard timer. Load-bearing controls were removed without checking what depended on them.

## Rules for agents

- **Owner-reported dashboard issues come first.** Fixing dashboard problems the owner has highlighted always takes priority over new features.
- **Build what was asked.** No unrequested features, badges, buttons, icons, animations, labels or copy. If you think something is missing, open an issue that cites this file and wait for the owner.
- **Name the surface.** Every PR and issue states which surface it affects (dashboard, control, connect, setup) and which priority above it serves. Dashboard changes must not add in-workout interactivity.
- **Do not rewrite workout content.** Render the doc text as written. Parsing may split cells into lines; it must not add, reword or decorate text.
- **Do not remove existing controls without proof.** Before deleting a control, list every action it performs and show where each is still reachable. If a control is the only way to do something, it is load-bearing.
- **Measure legibility.** Dashboard changes include a 1600x900 screenshot and state the rendered size of any text touched. Shrinking text to fit more content needs owner approval.
- **Bugs get a test.** Every bug fix adds a test that fails without the fix.
- **One concern per PR.** Small, focused diffs. No drive-by refactors.
- Audits (impeccable, anti-slop, hostile review) are scored against this file first: a polished feature that does not serve a surface above is slop.

## Privacy

- Heart rate data is never written to a server database, file or log. The server keeps only the latest readings in memory for live display and drops them when a device goes offline or idles out.
- Browser storage holds only what a page needs to resume after a reload (for example the paired device id). Prefer `sessionStorage` over `localStorage`; do not keep HR histories after the session ends unless the owner explicitly asks to export one.
- Logs must not contain HR values, names or ages at info level or above.

## Direction (owner-approved, not yet scheduled)

- Strava: upload a completed workout on request (write-only).
- Previous workouts: pull an earlier revision of the workout doc, or reuse workouts from `arii/previous_workouts`, to pick or generate today's workout.
- Decouple timer, Spotify and workout cards so each can change without touching the others, with no behavior change.
- Extract the Bluetooth HRM code into a reusable standalone package.
- A lightweight static demo on GitHub Pages: a timer plus a local Bluetooth HR panel that connects to nobody else.
- Cheaper or free hosting once performance and data models allow it.
- Make HR tile labels (BPM, KCAL) and the timer work/rest times readable from a distance.
