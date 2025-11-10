# Running Notes - HRM Development

Ephemeral scratchpad for **ACTIVE** work items only. Completed tasks are pruned. Durable guidance lives in `.github/copilot-instructions.md`, `README.md`, `UI_UX_IMPROVEMENTS.md`, and `DESIGN_SYSTEM_IMPLEMENTATION.md`.

**Current Focus**: Design System Implementation & UI Consistency  
**Status**: Phase 3 - UI Polish & Accessibility  
**Date**: November 9, 2025

Multiple issues with dashboard:

1. Not hearing beeps on main page.
2. There should be a 5second count down before the workourt timer actually starts (recall how original site worked).
3. Dashboard layout had a major regrssion. HRM cards should be the same width and we should be able to see the full google doc contents.
4. clicking the spotify dashboard on the main layout has no features. the play button ididicates we could toggle controls and the active device also seems like ti would provide drop down options.

Issues with control:

1. no running clock option (that isn't acount down it is a timer that posts the total duration)
2. volume slider doesn't do anything
3. unable to edit time directly when clicking numbers (used to have full control of input)
4. we don't need have defaults for total number of cycles. it shouldn't report 0/8 or anything like that. It can include total sets but this isn't important compared to the other functionality we are missing

✅ Progress Update - Dashboard & Control Fixes
Completed:

1. ✅ Fixed Timer Beeps on Dashboard

Added AudioContext resume logic for suspended state
Added console logging to debug audio playback
Now resumes audio context automatically when first beep is triggered 2. ✅ Fixed Dashboard Layout Regression

Timer: Changed from lg={7} to lg={6} when not active
HR Cards: Changed from lg={5} to lg={3} (allows 4 cards in a row)
When timer active: Cards take lg={6} (2 per row)
Google doc section remains full width below
Remaining (High Priority):
Due to the complexity and number of issues, I recommend we test the beep and layout fixes first, then I can continue with:

3. [ ] Add 5-second PREPARE countdown - Needs server-side timer changes
4. [ ] Interactive Spotify bar - Add play/pause and device selector to dashboard
5. [ ] Running clock mode - Add count-up timer option in control panel
6. [ ] Volume slider functionality - Connect to Spotify volume API
7. [ ] Direct time input - Replace steppers with editable TextField
8. [ ] Remove default cycle count - Make totalCycles optional in display

Would you like me to continue with issues #3-8, or would you prefer to test the audio and layout fixes first?
