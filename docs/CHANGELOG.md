# Changelog

## [0.21.0](https://github.com/arii/hrm/compare/hrm-v0.20.0...hrm-v0.21.0) (2026-01-02)

### Features

- **large:** Client-Side Calorie Computation & Data Synchronization ([#3036](https://github.com/arii/hrm/issues/3036)) ([90e1a15](https://github.com/arii/hrm/commit/90e1a154647888e0a156e457ad1b46bfd0386923))
- **medium:** feat: Implement Data Transfer Objects (DTOs) for API Decoupling ([#3033](https://github.com/arii/hrm/issues/3033)) ([a8c0c9b](https://github.com/arii/hrm/commit/a8c0c9bffb00bb0de6a5c251164550d927394f25))
- **medium:** Refactor User Types and Expand Test Data Factories ([#3020](https://github.com/arii/hrm/issues/3020)) ([ba7c91e](https://github.com/arii/hrm/commit/ba7c91e4082f6946faab14f7dc20c009fdbd33ac))
- **small:** [UI] Remove Pulse Animation from Heart Rate Tiles ([#3019](https://github.com/arii/hrm/issues/3019)) ([177fded](https://github.com/arii/hrm/commit/177fded2df47c479b59f0642b4ae83bafc033252))
- **small:** Default to HRM Web Player When No Active Device Is Present ([#3028](https://github.com/arii/hrm/issues/3028)) ([2fad157](https://github.com/arii/hrm/commit/2fad157081955ba3a531bdc272074dfc1b04e610))
- **small:** Fix Excessive Decimal Precision for Calories Burned ([#3017](https://github.com/arii/hrm/issues/3017)) ([b989c0f](https://github.com/arii/hrm/commit/b989c0f483b6890210df847d53892ef4c3a82197))
- **small:** Fix WebSocket Disconnections from Browser Throttling ([#3018](https://github.com/arii/hrm/issues/3018)) ([a4880c2](https://github.com/arii/hrm/commit/a4880c2b2b19cf104ec6e1c5eb3769c6d01f8fae))
- **small:** Make 'Reset Permissions & Settings' button always available ([#3030](https://github.com/arii/hrm/issues/3030)) ([819d9be](https://github.com/arii/hrm/commit/819d9bec50249954b3ea14f7a2ea14dee87bc363))

### Performance Improvements

- **ci:** Migrate lightweight scope check to 'ubuntu-latest' GitHub Actions runners ([#3006](https://github.com/arii/hrm/issues/3006)) ([eadb4e6](https://github.com/arii/hrm/commit/eadb4e6b053e7e3d2ae856be6dc924a8efec25be))

## [0.20.0](https://github.com/arii/hrm/compare/hrm-v0.19.0...hrm-v0.20.0) (2026-01-02)

### Features

- **ci:** Automate issue creation for failed deployments ([#2986](https://github.com/arii/hrm/issues/2986)) ([43f7742](https://github.com/arii/hrm/commit/43f774238d974d7aa97114bb6858d741c298e7d8))
- **medium:** Enhance Mock Client and Fix Flaky Bluetooth ([#2991](https://github.com/arii/hrm/issues/2991)) ([384282b](https://github.com/arii/hrm/commit/384282be50dc6c56a12777340bf0d6afa67d8b02))
- **small:** Fix HRM Dashboard Tile Stale Data on Disconnection ([#2984](https://github.com/arii/hrm/issues/2984)) ([389b42b](https://github.com/arii/hrm/commit/389b42bb3195ea67badcc375b25be4cc6130e471))
- **small:** Fix: Corrects Excessive Decimal Precision on 'Calories Burned' Display ([#2974](https://github.com/arii/hrm/issues/2974)) ([afda350](https://github.com/arii/hrm/commit/afda35008d156735535a26e1725372f0e3909a0e))

## [0.19.0](https://github.com/arii/hrm/compare/hrm-v0.18.0...hrm-v0.19.0) (2026-01-02)

### Features

- add step to apply review labels to PR ([4923542](https://github.com/arii/hrm/commit/4923542f827148dc1591c7d0c9fc678830b28efb))
- add support for [@pr-squash-rebase](https://github.com/pr-squash-rebase) alias ([346be3b](https://github.com/arii/hrm/commit/346be3b83e5736ddde5c6ed7461be414fbc69323))
- Address PR feedback and add unit tests ([#2490](https://github.com/arii/hrm/issues/2490)) ([b89e644](https://github.com/arii/hrm/commit/b89e644187520114ff4f6f793426b67f67aafadc))
- Address PR feedback and add unit tests ([#2660](https://github.com/arii/hrm/issues/2660)) ([e488bc2](https://github.com/arii/hrm/commit/e488bc2eea78e1d040d2468aec32b4b5c79894cf))
- Automate Bluetooth connection on /client/connect ([#2965](https://github.com/arii/hrm/issues/2965)) ([539de8a](https://github.com/arii/hrm/commit/539de8af01c5c0f6a61e6afd8e090fb60c9abcd8))
- automate issue from code review ([982d70c](https://github.com/arii/hrm/commit/982d70c5c621a009410c74221b3e22f91ff5f297))
- Automate Release Management with Release Please ([454b34d](https://github.com/arii/hrm/commit/454b34d1b2ab1572c2e1cf233a1968e059629e05))
- **ci:** implement pnpm build cache in CI ([da080c6](https://github.com/arii/hrm/commit/da080c6c4ac043a575942f3183b15c8a0e95aa19))
- **ci:** prevent reviews on empty commits ([#2826](https://github.com/arii/hrm/issues/2826)) ([98b9b5d](https://github.com/arii/hrm/commit/98b9b5d96e393f82f08f6537b06d86b98cf2426a))
- **ci:** Rebuild AI workflow with clean history ([b356349](https://github.com/arii/hrm/commit/b356349237943996ef189786e74e98b564a4f0ea))
- **ci:** skip ci on empty commits ([5c14412](https://github.com/arii/hrm/commit/5c14412f80a88b9ca7e8949921adfaf2907de94c))
- enhance websockt debugging [#2694](https://github.com/arii/hrm/issues/2694) ([81e5a73](https://github.com/arii/hrm/commit/81e5a736d72e566e13b286cc15d668bf04621cce))
- gemini model update ([6bc79e6](https://github.com/arii/hrm/commit/6bc79e6711b51ae63b8504f3e5771e9bccae4b36))
- **gemini:** Enhance Review with CI Failure Guidance ([#2486](https://github.com/arii/hrm/issues/2486)) ([d9ec602](https://github.com/arii/hrm/commit/d9ec6025db55983bad4e20bae387e7bf7e34b879))
- **gemini:** include failed ci check logs in review ([1aaae17](https://github.com/arii/hrm/commit/1aaae1712135261f22e87dc9e13ae1f6ac5ced6e))
- **gemini:** refactor review prompts [#2696](https://github.com/arii/hrm/issues/2696) ([6172684](https://github.com/arii/hrm/commit/61726841578795961b4be5a86788b201a558b4c5))
- **github:** implement jules session management via PR comments ([0b7daab](https://github.com/arii/hrm/commit/0b7daab61a244f6d4a8355300b13bc82f3a5104e))
- Harden WebSocket implementation with stable IDs and security fixes ([b89e644](https://github.com/arii/hrm/commit/b89e644187520114ff4f6f793426b67f67aafadc))
- Implement AI Merge Conflict Resolver ([03d6180](https://github.com/arii/hrm/commit/03d61804a7905ad78e3c336827751432129dcffe))
- implement AI-powered merge conflict resolver ([07b8a2d](https://github.com/arii/hrm/commit/07b8a2d60c9882a506688f0e17835ac84bd9591f))
- implement AI-powered merge conflict resolver ([7d06136](https://github.com/arii/hrm/commit/7d061361991f6b2570ddc639dc73847baed6ba2c))
- implement AI-powered merge conflict resolver ([0f2f827](https://github.com/arii/hrm/commit/0f2f82701e5f9988470d08dfb0d21981e6794cc5))
- implement AI-powered merge conflict resolver ([8fafe9d](https://github.com/arii/hrm/commit/8fafe9da38d0124e548c6a67d9a4e0a999f2e079))
- implement AI-powered merge conflict resolver ([632acae](https://github.com/arii/hrm/commit/632acaea1da106735f21d835607048c43cc86933))
- Implement Fallback Model in Gemini Client to Handle Rate Limiting Errors ([#2523](https://github.com/arii/hrm/issues/2523)) ([6da95b0](https://github.com/arii/hrm/commit/6da95b08ab3f016fe59b753b4fc5e8e36af2fd96))
- Implement HRM auto-connection and weight storage ([157065c](https://github.com/arii/hrm/commit/157065c2f832296b1310ff84afff484ef30c4ee9))
- Implement HRM auto-connection and weight storage ([157065c](https://github.com/arii/hrm/commit/157065c2f832296b1310ff84afff484ef30c4ee9))
- Implement HRM auto-connection and weight storage ([157065c](https://github.com/arii/hrm/commit/157065c2f832296b1310ff84afff484ef30c4ee9))
- Implement HRM auto-connection and weight storage ([157065c](https://github.com/arii/hrm/commit/157065c2f832296b1310ff84afff484ef30c4ee9))
- Implement Optimistic UI for Timer Controls ([81af6f5](https://github.com/arii/hrm/commit/81af6f54ef3b760378aa21d540fbb9c31f6ec5d4))
- Implement persistence for user settings ([266a281](https://github.com/arii/hrm/commit/266a281b6fd0ff8dd1489fed94b2f11c892f4fb7))
- improve gemini model list ([#2692](https://github.com/arii/hrm/issues/2692)) ([e5c79dd](https://github.com/arii/hrm/commit/e5c79dd8676e25428fda402928fd544c455285df))
- improve smart triage and pr enrichment ([f235b51](https://github.com/arii/hrm/commit/f235b51067fff4226162a73d34398ff2c879a642))
- include git commit hash in gemini review comments ([aa8df93](https://github.com/arii/hrm/commit/aa8df93905aedf072fdebad2b9d85b9e5ea2bee3))
- integrate Accessibility (a11y) checks ([91c2be6](https://github.com/arii/hrm/commit/91c2be68e1cd2b3eb1d0bfff716f264bcb51b8cf))
- migrate test suite from Jest to Vitest ([aea81b7](https://github.com/arii/hrm/commit/aea81b7dbfcbaef7e048102aed19908d7c2efb2c))
- **spotify:** Synchronize volume slider with external changes ([#2340](https://github.com/arii/hrm/issues/2340)) ([6d63806](https://github.com/arii/hrm/commit/6d63806dfe21965b7f24d38ffbf2e3b6ee1999f2))
- stabilize dashboard layout with CSS Grid ([354a5ce](https://github.com/arii/hrm/commit/354a5ce2a0cdac10bed66f437b8286a4121c19a1))
- throttle biometric data publishing ([47bdebe](https://github.com/arii/hrm/commit/47bdebe13ddacf145dcacdf06b32c76a52e53bd1))
- update gemini code review prompts ([e928850](https://github.com/arii/hrm/commit/e928850496d6f61daeb464855182bb54c8bf38ab))
- use ubuntu-latest runner for ci ([ad5d8ad](https://github.com/arii/hrm/commit/ad5d8adac3fdcba7c88532fd59a6294b39286cd7))
- use ubuntu-latest runner for ci ([#2671](https://github.com/arii/hrm/issues/2671)) ([ad5d8ad](https://github.com/arii/hrm/commit/ad5d8adac3fdcba7c88532fd59a6294b39286cd7))

### Bug Fixes

- [#2663](https://github.com/arii/hrm/issues/2663) revert unintentional changes ([#2674](https://github.com/arii/hrm/issues/2674)) ([a3cc866](https://github.com/arii/hrm/commit/a3cc8666b8c458dca23e42e4c01d06fd334e23d6))
- add explicit checkout before setup-env action in gemini review ([4923542](https://github.com/arii/hrm/commit/4923542f827148dc1591c7d0c9fc678830b28efb))
- Add missing has_changes input to pr-quality workflow ([8708e05](https://github.com/arii/hrm/commit/8708e059449ad651838e5ab2276fec2e6c20dc85))
- add PR diff context gathering to gemini review workflow ([#2404](https://github.com/arii/hrm/issues/2404)) ([311b4c4](https://github.com/arii/hrm/commit/311b4c4f2a7f18f7290055cc5b9aa007733463c2))
- add prompt instructions for diff format to gemini coder ([4923542](https://github.com/arii/hrm/commit/4923542f827148dc1591c7d0c9fc678830b28efb))
- add required permissions to release workflow ([4923542](https://github.com/arii/hrm/commit/4923542f827148dc1591c7d0c9fc678830b28efb))
- add step to post review comment from gemini output ([4923542](https://github.com/arii/hrm/commit/4923542f827148dc1591c7d0c9fc678830b28efb))
- Address build and linting failures ([e0877b4](https://github.com/arii/hrm/commit/e0877b41be860698e796268aedadce2a758e5693))
- Address PR feedback and fix CI failures ([b89e644](https://github.com/arii/hrm/commit/b89e644187520114ff4f6f793426b67f67aafadc))
- Address PR feedback and fix CI failures ([157065c](https://github.com/arii/hrm/commit/157065c2f832296b1310ff84afff484ef30c4ee9))
- **bluetooth:** implement secure auto-reconnection and optimize settings input ([157065c](https://github.com/arii/hrm/commit/157065c2f832296b1310ff84afff484ef30c4ee9))
- **build:** Fix linting and build errors ([d63b8ae](https://github.com/arii/hrm/commit/d63b8ae8d7daa939791e67a7f87824191b7a3bd9))
- centralized error boundaries ([01c8796](https://github.com/arii/hrm/commit/01c8796794768bc6133d2b2779d3101470e7735e))
- **ci:** Address critical feedback on AI workflow ([b356349](https://github.com/arii/hrm/commit/b356349237943996ef189786e74e98b564a4f0ea))
- **ci:** align pnpm version in gemini-triage workflow ([#2262](https://github.com/arii/hrm/issues/2262)) ([0734705](https://github.com/arii/hrm/commit/0734705b7a25d116498066f4dddb0d05e16937cf))
- **cicd:** address feedback from PR review ([dd4db43](https://github.com/arii/hrm/commit/dd4db4348f0736eb681956562fa09c64e99a1a85))
- **cicd:** address final PR feedback ([dd4db43](https://github.com/arii/hrm/commit/dd4db4348f0736eb681956562fa09c64e99a1a85))
- **cicd:** address pr feedback and complete ci refactor ([dd4db43](https://github.com/arii/hrm/commit/dd4db4348f0736eb681956562fa09c64e99a1a85))
- **cicd:** address security and functionality feedback ([dd4db43](https://github.com/arii/hrm/commit/dd4db4348f0736eb681956562fa09c64e99a1a85))
- **cicd:** complete CI refactor and address all PR feedback ([dd4db43](https://github.com/arii/hrm/commit/dd4db4348f0736eb681956562fa09c64e99a1a85))
- **cicd:** finalize CI refactor and address all PR feedback ([dd4db43](https://github.com/arii/hrm/commit/dd4db4348f0736eb681956562fa09c64e99a1a85))
- **ci:** correct invalid 'releases' permission in release workflow ([#2809](https://github.com/arii/hrm/issues/2809)) ([5531700](https://github.com/arii/hrm/commit/5531700be3f0be205c1bbfc74fa6a59e760ceab6))
- **ci:** Grant write permissions to PR Label job ([#2858](https://github.com/arii/hrm/issues/2858)) ([9650a29](https://github.com/arii/hrm/commit/9650a29274bef618f55a296fb944296c671b6bad))
- **ci:** improve pr-quality.yml ([#2668](https://github.com/arii/hrm/issues/2668)) ([0030214](https://github.com/arii/hrm/commit/00302144f43e2a519743968c24737bb3f69ef227))
- **ci:** pr-enrichment error and template ([2e93e8b](https://github.com/arii/hrm/commit/2e93e8b13836c1ba2248261c4d526120fd4a1677))
- **ci:** prevent empty job lists in orchestrator workflow ([#2876](https://github.com/arii/hrm/issues/2876)) ([dcaa173](https://github.com/arii/hrm/commit/dcaa17334f369eec9a000fc6677547a2259daf73))
- **ci:** prevent infinite loop in smart triage workflow ([7187eea](https://github.com/arii/hrm/commit/7187eeacad7952bb110b8246fb96fcaa3688dd3f))
- **ci:** prevent infinite loop in smart triage workflow ([7187eea](https://github.com/arii/hrm/commit/7187eeacad7952bb110b8246fb96fcaa3688dd3f))
- **ci:** prevent infinite loop in smart triage workflow ([7187eea](https://github.com/arii/hrm/commit/7187eeacad7952bb110b8246fb96fcaa3688dd3f))
- **ci:** remove manifest-file from release-please action ([af37d57](https://github.com/arii/hrm/commit/af37d57fb7396e0172462c66db232299254a3bb1))
- **ci:** Remove redundant secrets block from workflow call ([#2872](https://github.com/arii/hrm/issues/2872)) ([f9a008e](https://github.com/arii/hrm/commit/f9a008e1f78023c0d0ccc417900a301618a50140))
- **ci:** Resolve immediate failure of pr-squash.yml due to syntax/schema error ([#2853](https://github.com/arii/hrm/issues/2853)) ([95ffb33](https://github.com/arii/hrm/commit/95ffb33a4cf10b97290a1fb524e61286893ef36e))
- **ci:** resolve linting and build errors ([5acc57d](https://github.com/arii/hrm/commit/5acc57dff5306c2a2dd2ec54929c32f90b6f598e))
- **ci:** skip visual tests if build fails ([33f5a61](https://github.com/arii/hrm/commit/33f5a6107e62e174d9ac3dceab33898649115185))
- Clear Cookies Option Unavailable with Warning in UI ([#2929](https://github.com/arii/hrm/issues/2929)) ([538355d](https://github.com/arii/hrm/commit/538355db986febf43e93c667c4a8aa7b01dc526d))
- correct --command to --preset in gemini workflows ([#2401](https://github.com/arii/hrm/issues/2401)) ([91f8828](https://github.com/arii/hrm/commit/91f88288554ffe6020b739f4c4e6e5281ecc04e1))
- Correct HRM Data Handling in WebSocket Reducer ([#2482](https://github.com/arii/hrm/issues/2482)) ([a7a5dae](https://github.com/arii/hrm/commit/a7a5daeeaf6f39b233d941ebd44a9f27631e643e))
- Correct permissions and secret handling in jules-session-manager workflow ([#2800](https://github.com/arii/hrm/issues/2800)) ([54bcc60](https://github.com/arii/hrm/commit/54bcc60f86bd06cc89e96532d5ff05ea92639b27))
- Correct Web Bluetooth Auto-Connect and Improve Settings Performance ([#2488](https://github.com/arii/hrm/issues/2488)) ([157065c](https://github.com/arii/hrm/commit/157065c2f832296b1310ff84afff484ef30c4ee9))
- Correct Web Bluetooth Auto-Connect and Improve Settings Performance ([#2489](https://github.com/arii/hrm/issues/2489)) ([157065c](https://github.com/arii/hrm/commit/157065c2f832296b1310ff84afff484ef30c4ee9))
- Correctly convert imperial height units ([#2406](https://github.com/arii/hrm/issues/2406)) ([356ea84](https://github.com/arii/hrm/commit/356ea84aa62554ce6593016901bc5ea0086f2d4a))
- Corrects syntax error in PR enrichment workflow ([#2457](https://github.com/arii/hrm/issues/2457)) ([41944ab](https://github.com/arii/hrm/commit/41944abfb3970b6cc65e57275c74dc1e23ced436))
- deployment ([44e6493](https://github.com/arii/hrm/commit/44e649327158e048d8aa94b4498c281b1f1b336c))
- **deploy:** use standalone server entrypoint ([a905419](https://github.com/arii/hrm/commit/a905419c52f518bca84fdacf65da37cfa0c16fd9))
- disable bash exit-on-error in context gathering step for better error tolerance ([4923542](https://github.com/arii/hrm/commit/4923542f827148dc1591c7d0c9fc678830b28efb))
- **docs:** Correct Markdown syntax in DEVELOPMENT.md ([6634663](https://github.com/arii/hrm/commit/66346631d9cdcc672c0d362dc7e52087307714e4))
- Ensure Gemini Review Waits for GitHub Checks ([#2507](https://github.com/arii/hrm/issues/2507)) ([423d8ef](https://github.com/arii/hrm/commit/423d8ef2a5b6b19d0ef76b2bf17482743cba3b7a))
- ensure initial review triggers for PRs with no previous reviews ([4923542](https://github.com/arii/hrm/commit/4923542f827148dc1591c7d0c9fc678830b28efb))
- gemin-coder git error ([#2400](https://github.com/arii/hrm/issues/2400)) ([c4e6db2](https://github.com/arii/hrm/commit/c4e6db217c167982bca55bb52d0467cd010b66bc))
- gemini-triage loop ([#2325](https://github.com/arii/hrm/issues/2325)) ([2b810e5](https://github.com/arii/hrm/commit/2b810e54e9bb3ac2996d313f6fdd76664db75000))
- **gemini:** Address all remaining PR feedback and build failures ([#2663](https://github.com/arii/hrm/issues/2663)) ([1aaae17](https://github.com/arii/hrm/commit/1aaae1712135261f22e87dc9e13ae1f6ac5ced6e))
- Implement Architectural Improvements for Stable Client IDs ([#2518](https://github.com/arii/hrm/issues/2518)) ([b89e644](https://github.com/arii/hrm/commit/b89e644187520114ff4f6f793426b67f67aafadc))
- Improve Bluetooth Staleness Detection ([b827a89](https://github.com/arii/hrm/commit/b827a8971cd62d927f063b3f53708bb3d0f9c4ca))
- Improve Error Reporting for Smart Triage Workflow ([#2543](https://github.com/arii/hrm/issues/2543)) ([3280fd2](https://github.com/arii/hrm/commit/3280fd28454e232d30d5ae332dec20f235e623ae))
- improve workflow robustness with timeout, optimize gh commands, and use file for review posting ([4923542](https://github.com/arii/hrm/commit/4923542f827148dc1591c7d0c9fc678830b28efb))
- make sure workflow has review ([d8a8f75](https://github.com/arii/hrm/commit/d8a8f755bbd823806d5e206d3ef9a949726ccded))
- playlist selector ui and details ([91f89a6](https://github.com/arii/hrm/commit/91f89a63bd744933880749cdc6777fdf7b559f6f))
- prevent deployment regression ([ad5d8ad](https://github.com/arii/hrm/commit/ad5d8adac3fdcba7c88532fd59a6294b39286cd7))
- Prevent infinite loop in Gemini triage workflow ([#2295](https://github.com/arii/hrm/issues/2295)) ([7187eea](https://github.com/arii/hrm/commit/7187eeacad7952bb110b8246fb96fcaa3688dd3f))
- reduce decimal points for calorie display ([d08b5f7](https://github.com/arii/hrm/commit/d08b5f752997bf6f53893d382a8af1b8a67b66c0))
- **release:** grant write permissions for releases and issues ([#2484](https://github.com/arii/hrm/issues/2484)) ([ee0ad3b](https://github.com/arii/hrm/commit/ee0ad3b6a391c10adb667610f642764f227f86fb))
- remove duplicate execute-rereview job to prevent duplicate reviews ([4923542](https://github.com/arii/hrm/commit/4923542f827148dc1591c7d0c9fc678830b28efb))
- remove invalid playwright cache path that doesn't exist at cachi… ([#2409](https://github.com/arii/hrm/issues/2409)) ([95c1fd5](https://github.com/arii/hrm/commit/95c1fd55c971082b0f6a6172a664bfa2ac81cbee))
- repair label application logic to avoid subshell variable issues ([4923542](https://github.com/arii/hrm/commit/4923542f827148dc1591c7d0c9fc678830b28efb))
- Repair PR [#2762](https://github.com/arii/hrm/issues/2762) - Skip CI for empty commits ([ac83898](https://github.com/arii/hrm/commit/ac8389881920b1cd68f042092014842de82a168c))
- repair production startup command ([ec23744](https://github.com/arii/hrm/commit/ec23744cd9bb5a14adb159c911431540c7ebbb32))
- repair production startup command and address feedback ([1169b1a](https://github.com/arii/hrm/commit/1169b1add19db3d2156ab15a457d6701fc279128))
- report lint and build failures ([#2675](https://github.com/arii/hrm/issues/2675)) ([b5a6776](https://github.com/arii/hrm/commit/b5a67762a872a2ee8f3f81c3f448e43d8066d253))
- Resolve Spotify Playback Error by Removing Global JSON Parser ([#2402](https://github.com/arii/hrm/issues/2402)) ([3d5f543](https://github.com/arii/hrm/commit/3d5f543ec80e489eca14fea84bc8508a43704d5b))
- Resolve WebSocket "Pong not received" error ([#2291](https://github.com/arii/hrm/issues/2291)) ([a4b6023](https://github.com/arii/hrm/commit/a4b6023d783e124af99e0afe848ec1ff3768747c))
- Restore build-check job and resolve regressions ([9414827](https://github.com/arii/hrm/commit/9414827eb96866988d79d09ad2126cbd51f8c84f))
- Revert lockfile changes and add tests ([157065c](https://github.com/arii/hrm/commit/157065c2f832296b1310ff84afff484ef30c4ee9))
- Revert pnpm-lock.yaml and add code comments ([b89e644](https://github.com/arii/hrm/commit/b89e644187520114ff4f6f793426b67f67aafadc))
- revert standalone changes to 2568 ([6421691](https://github.com/arii/hrm/commit/64216914e2bae767f17f53746d9819047cd27364))
- Revert unrelated changes and add comments ([b89e644](https://github.com/arii/hrm/commit/b89e644187520114ff4f6f793426b67f67aafadc))
- **server:** Remove global JSON parser to prevent request body conflict ([3d5f543](https://github.com/arii/hrm/commit/3d5f543ec80e489eca14fea84bc8508a43704d5b))
- **server:** Remove global JSON parser to prevent request body conflict ([3d5f543](https://github.com/arii/hrm/commit/3d5f543ec80e489eca14fea84bc8508a43704d5b))
- **settings:** improve weight input validation and error message ([157065c](https://github.com/arii/hrm/commit/157065c2f832296b1310ff84afff484ef30c4ee9))
- Skip visual tests if build fails in CI ([#2443](https://github.com/arii/hrm/issues/2443)) ([33f5a61](https://github.com/arii/hrm/commit/33f5a6107e62e174d9ac3dceab33898649115185))
- spotify search playback ([934c743](https://github.com/arii/hrm/commit/934c74373782ce73f1511a6470a8f867c0c46285))
- **spotify:** authentication for playlist ([#2693](https://github.com/arii/hrm/issues/2693)) ([f7c19d1](https://github.com/arii/hrm/commit/f7c19d17c87ce1762b587316b28cb197ec35861a))
- **spotify:** circular dependency in token ([#2581](https://github.com/arii/hrm/issues/2581)) ([042d6be](https://github.com/arii/hrm/commit/042d6befe8a421f4101d405d9069316a8cc40eb1))
- Stabilize Playwright visual regression tests ([#2673](https://github.com/arii/hrm/issues/2673)) ([1ca6df1](https://github.com/arii/hrm/commit/1ca6df1e1f76f2db8c86350d2131dcb3ef60e687))
- stop making weekly triage issues ([1b58540](https://github.com/arii/hrm/commit/1b585408124dc8d3e8d495dc278310ea48c15769))
- **tests:** repair unit tests and resolve CI failures ([b356349](https://github.com/arii/hrm/commit/b356349237943996ef189786e74e98b564a4f0ea))
- Uncaught ReferenceError: DOCS_timing is not defined ([#2290](https://github.com/arii/hrm/issues/2290)) ([b29d2d7](https://github.com/arii/hrm/commit/b29d2d71e2a726707d6a628f8a8a287e359d3c48))
- use comma-separated label format for gh pr edit command ([4923542](https://github.com/arii/hrm/commit/4923542f827148dc1591c7d0c9fc678830b28efb))
- use individual label application with error tolerance ([4923542](https://github.com/arii/hrm/commit/4923542f827148dc1591c7d0c9fc678830b28efb))
- workflow issues ([#2396](https://github.com/arii/hrm/issues/2396)) ([392cc3d](https://github.com/arii/hrm/commit/392cc3d4aee67435bcc43b671d46b88f0daa0995))
- **workflows:** Harden workflow permissions and secrets ([#2879](https://github.com/arii/hrm/issues/2879)) ([08a1621](https://github.com/arii/hrm/commit/08a16211fbe8386dfea768fddcfbdf9d33866f77))

## [0.18.0](https://github.com/arii/hrm/compare/v0.17.0...v0.18.0) (2025-12-26)

### Features

- add debounced spotify search ([#2247](https://github.com/arii/hrm/issues/2247)) ([a95549f](https://github.com/arii/hrm/commit/a95549facb54477f6d84f336b95cfb5bc956170d))
- **api:** Correctly parse dynamic route params in playlist API ([10a39e2](https://github.com/arii/hrm/commit/10a39e2f3d3e56b962c8ecdae78515f4409cb179))
- **audio:** Implement persistent volume controls ([#2202](https://github.com/arii/hrm/issues/2202)) ([a2ac8d9](https://github.com/arii/hrm/commit/a2ac8d945d3a75105c2e56db9667d73875f90c3e))
- Centralize and Validate Environment Variables with Zod ([#2192](https://github.com/arii/hrm/issues/2192)) ([96063b6](https://github.com/arii/hrm/commit/96063b63aa9c9cb7693961e388153b30621344ac))
- Finalize `withValidation` Middleware (Headers, Errors, Docs & Tests) ([7fa5641](https://github.com/arii/hrm/commit/7fa5641c3b1049171a98b70c53cd138824fdabac))
- Standardize Network Layer with Retry Logic ([#2242](https://github.com/arii/hrm/issues/2242)) ([ebaa124](https://github.com/arii/hrm/commit/ebaa1248ecaa6ad2ee62cac273a387d72eb7acae))

### Bug Fixes

- **ci:** upgrade pnpm/action-setup to v4 ([11613d2](https://github.com/arii/hrm/commit/11613d2fa81c2dd66b69043e1eabf957ee8712b2))
- **deploy:** Ensure script permissions and correct startup path ([#2229](https://github.com/arii/hrm/issues/2229)) ([4e30ffc](https://github.com/arii/hrm/commit/4e30ffc1d89b5f822ec8388ed1e77de5df3aa8a2))
- Increase WebSocket pong timeout to prevent premature reconnections ([#2216](https://github.com/arii/hrm/issues/2216)) ([9ed7f68](https://github.com/arii/hrm/commit/9ed7f684368f0dd30ccd95cc31566b74a9adcd77))
- Prevent Automatic Volume Setting on Page Load ([#2226](https://github.com/arii/hrm/issues/2226)) ([b715db1](https://github.com/arii/hrm/commit/b715db1e171a1fa7ceb06ec0cb73dbf7d955f1cf))
- Prevent Timer Display Overlap with Flexbox Layout ([#2241](https://github.com/arii/hrm/issues/2241)) ([c2b0721](https://github.com/arii/hrm/commit/c2b0721d1a5ab95380b470408210f8404758909e))
- **spotify:** Change log level for expected 204 responses ([732caf5](https://github.com/arii/hrm/commit/732caf569d61beefdd262949edde53a448c30e52))
- Timer Display Layout Overlap ([#2225](https://github.com/arii/hrm/issues/2225)) ([4838cd0](https://github.com/arii/hrm/commit/4838cd056cee67a1e8b085adc80dbfe216978f6a))

## [0.17.0](https://github.com/arii/hrm/compare/v0.16.0...v0.17.0) (2025-12-26)

### Features

- add failure comment to auto-fix workflow ([#2156](https://github.com/arii/hrm/issues/2156)) ([ddcb4ea](https://github.com/arii/hrm/commit/ddcb4eafda9ebde5fd0a865f92506b3b1b2f1f12))
- improve lint performance by optimizing ESLint configuration ([#2169](https://github.com/arii/hrm/issues/2169)) ([79c638f](https://github.com/arii/hrm/commit/79c638f9b1ae6807c35338aa5e67520974820f35))
- Spotify Playlist Tracks Display ([#2112](https://github.com/arii/hrm/issues/2112)) ([cf854e9](https://github.com/arii/hrm/commit/cf854e96f0107e0a6dc799187c01d0613e5f1193))

### Bug Fixes

- correct auto-rebase workflow to use leader branch ([#2155](https://github.com/arii/hrm/issues/2155)) ([ee1d457](https://github.com/arii/hrm/commit/ee1d457853ffed5f896a07e0cfd33d59cbcec83e))
- workflow failing on success checks ([#2131](https://github.com/arii/hrm/issues/2131)) ([6a8e304](https://github.com/arii/hrm/commit/6a8e3041291d5722b57fc9fcce19b0753942498d))

## [0.16.0](https://github.com/arii/hrm/compare/v0.15.0...v0.16.0) (2025-12-24)

### Features

- Setup Framer Motion Infrastructure and Page Transitions ([#2098](https://github.com/arii/hrm/issues/2098)) ([b0d6f3d](https://github.com/arii/hrm/commit/b0d6f3d8e92dfd8ccd704edd91964846d054c94d))
- **storybook:** Implement Stories for SpotifyDisplay and TimerDisplay ([#2065](https://github.com/arii/hrm/issues/2065)) ([8e52782](https://github.com/arii/hrm/commit/8e5278276ca3132b169e81c1ba06f849823f88f6))

### Bug Fixes

- **build:** resolve module path for validation schemas ([#2095](https://github.com/arii/hrm/issues/2095)) ([365adbf](https://github.com/arii/hrm/commit/365adbf5b74aa45151b2dda0eef37fec1033470f))
- **infra:** Correct module import to resolve server startup failure ([b5bedd7](https://github.com/arii/hrm/commit/b5bedd752996ddbdcb44791300394e08c9eb9e6b))
- **tests:** update visual regression and unit tests to match new UI ([da83882](https://github.com/arii/hrm/commit/da83882458e3315e1142ba001b47654c83fdec50))
- **tests:** update visual regression and unit tests to match new UI ([da83882](https://github.com/arii/hrm/commit/da83882458e3315e1142ba001b47654c83fdec50))
- **tests:** update visual regression and unit tests to match new UI ([da83882](https://github.com/arii/hrm/commit/da83882458e3315e1142ba001b47654c83fdec50))
- **tests:** Update visual regression test snapshots ([da83882](https://github.com/arii/hrm/commit/da83882458e3315e1142ba001b47654c83fdec50))

## [0.15.0](https://github.com/arii/hrm/compare/v0.14.0...v0.15.0) (2025-12-23)

### Features

- Add AuthButton component for Spotify login/logout ([#2018](https://github.com/arii/hrm/issues/2018)) ([a6629bd](https://github.com/arii/hrm/commit/a6629bd521fb30d89f59fb6374faae0aead1c0e2))
- Implement Authentication Error Notifications ([#2055](https://github.com/arii/hrm/issues/2055)) ([73acd23](https://github.com/arii/hrm/commit/73acd2366f558efa18888ede424875999e4c0cb1))
- Implement Spotify Connect Device Picker ([#2014](https://github.com/arii/hrm/issues/2014)) ([a154729](https://github.com/arii/hrm/commit/a154729ec3b74f761927280794d7cf71c7cd7018))

### Bug Fixes

- **lint:** Address linting errors ([122ccc6](https://github.com/arii/hrm/commit/122ccc618138f83389294a818251ddc52ffd636a))
- **lint:** Address linting errors ([122ccc6](https://github.com/arii/hrm/commit/122ccc618138f83389294a818251ddc52ffd636a))
- **lint:** Address linting errors ([122ccc6](https://github.com/arii/hrm/commit/122ccc618138f83389294a818251ddc52ffd636a))
- **lint:** Address linting errors ([122ccc6](https://github.com/arii/hrm/commit/122ccc618138f83389294a818251ddc52ffd636a))
- **lint:** Address linting errors ([122ccc6](https://github.com/arii/hrm/commit/122ccc618138f83389294a818251ddc52ffd636a))
- **tests:** stabilize visual regression tests ([d2a5675](https://github.com/arii/hrm/commit/d2a5675ef9b9ad678a4a3c874e597a44798bab77))

## [0.14.0](https://github.com/arii/hrm/compare/v0.13.0...v0.14.0) (2025-12-23)

### Features

- add initial test coverage for users and workout APIs ([5e1dfe7](https://github.com/arii/hrm/commit/5e1dfe73025646a67daadb010344b421e305f94e))
- add initial test coverage for users and workout APIs ([5e1dfe7](https://github.com/arii/hrm/commit/5e1dfe73025646a67daadb010344b421e305f94e))
- Implement Robust Test Artifact Management & Exclusion ([#1865](https://github.com/arii/hrm/issues/1865)) ([08e147c](https://github.com/arii/hrm/commit/08e147c2461056fc9fcbf92e4690160357ed68f3))

### Bug Fixes

- **ci:** correct log file parsing in failure report ([5e1dfe7](https://github.com/arii/hrm/commit/5e1dfe73025646a67daadb010344b421e305f94e))
- continue to post errors ([#1827](https://github.com/arii/hrm/issues/1827)) ([055c8db](https://github.com/arii/hrm/commit/055c8db1d555c6aefa1d15b625d788a6033f6ac1))
- continue to post errors ([#1829](https://github.com/arii/hrm/issues/1829)) ([08c183b](https://github.com/arii/hrm/commit/08c183bb30c3cca63fe885352205a9778259e586))
- correct import path in users API test ([5e1dfe7](https://github.com/arii/hrm/commit/5e1dfe73025646a67daadb010344b421e305f94e))
- correct import path in users API test ([5e1dfe7](https://github.com/arii/hrm/commit/5e1dfe73025646a67daadb010344b421e305f94e))

## [0.13.0](https://github.com/arii/hrm/compare/v0.12.0...v0.13.0) (2025-12-18)

### Features

- Set Imperial Units as Default for Weight and Height Input ([#1811](https://github.com/arii/hrm/issues/1811)) ([69bbaba](https://github.com/arii/hrm/commit/69bbaba0860f3c417b9cfe01842d6e99ee1ff2a9))

## [0.12.0](https://github.com/arii/hrm/compare/v0.11.0...v0.12.0) (2025-12-18)

### Features

- **deps:** Optimize knip Configuration and Resolve Dependency Hygiene Issues ([#1747](https://github.com/arii/hrm/issues/1747)) ([9a9a288](https://github.com/arii/hrm/commit/9a9a288b95791e129828a6d8e45b0b204458a0ad))

### Bug Fixes

- Calorie display on /client/connect page ([#1741](https://github.com/arii/hrm/issues/1741)) ([4028f5d](https://github.com/arii/hrm/commit/4028f5d39ed1329c65503f24dcb13afaa2ebd42c))
- check permissions ([#1770](https://github.com/arii/hrm/issues/1770)) ([7975b1b](https://github.com/arii/hrm/commit/7975b1bc6f087bc5bba184cfd7a4c1acd21d3fe5))
- pr review error ([6526d32](https://github.com/arii/hrm/commit/6526d321e1470cab34688fd7de8ca8421552bf2d))
- prevent review loops ([#1751](https://github.com/arii/hrm/issues/1751)) ([67d595e](https://github.com/arii/hrm/commit/67d595ea1483b225ca720ec2adc0312ceb92f977))
- udpate token ([e7e6abd](https://github.com/arii/hrm/commit/e7e6abdbef48a6036b055469dbf4aa9fd2c05c8d))

## [0.11.0](https://github.com/arii/hrm/compare/v0.10.0...v0.11.0) (2025-12-16)

### Features

- add health check endpoints ([5ad99db](https://github.com/arii/hrm/commit/5ad99db44548d34dad618f672907917e6742b70b))
- add health check endpoints ([5ad99db](https://github.com/arii/hrm/commit/5ad99db44548d34dad618f672907917e6742b70b))
- Address PR feedback for volume control consistency ([2a4912f](https://github.com/arii/hrm/commit/2a4912fa18be57e2bb990ba2b8fca89be4661ec0))
- Apply global styling to Snackbar/Alert components ([c2df6cd](https://github.com/arii/hrm/commit/c2df6cddaf92d1c58f346ec703e591fcb46184c1))
- Apply global styling to Snackbar/Alert components ([#1627](https://github.com/arii/hrm/issues/1627)) ([c2df6cd](https://github.com/arii/hrm/commit/c2df6cddaf92d1c58f346ec703e591fcb46184c1))
- Arrange HR tiles horizontally ([#1551](https://github.com/arii/hrm/issues/1551)) ([9a33e0b](https://github.com/arii/hrm/commit/9a33e0bccc8993f18cc8f2e78e12af31e0dfb2e8))
- Establish and Implement Architectural Decision Records (ADR) Process ([#1701](https://github.com/arii/hrm/issues/1701)) ([e8a44a1](https://github.com/arii/hrm/commit/e8a44a1fffd13f1dc6f6aad554c422f9adfbfa08))
- **hooks:** make `useBluetoothHRM` data liveness timeout configurable ([#1536](https://github.com/arii/hrm/issues/1536)) ([6f18eb6](https://github.com/arii/hrm/commit/6f18eb631b09b5e80d8e3c6aff6743b4d1867502))
- Implement Dynamic Port Configuration for Testing ([de84a93](https://github.com/arii/hrm/commit/de84a938740020ebaa84a2c3779a4b3dee4046e6))
- Implement Volume Control Consistency ([2a4912f](https://github.com/arii/hrm/commit/2a4912fa18be57e2bb990ba2b8fca89be4661ec0))

### Bug Fixes

- Address final PR feedback and remove extraneous file ([2a4912f](https://github.com/arii/hrm/commit/2a4912fa18be57e2bb990ba2b8fca89be4661ec0))
- address linting errors and apply PR feedback ([5ad99db](https://github.com/arii/hrm/commit/5ad99db44548d34dad618f672907917e6742b70b))
- Address Next.js middleware file convention deprecation ([#1623](https://github.com/arii/hrm/issues/1623)) ([9a61ca4](https://github.com/arii/hrm/commit/9a61ca46e69de0620938ade5105c91ec48d402a8))
- Address PR feedback and fix linting errors ([2a4912f](https://github.com/arii/hrm/commit/2a4912fa18be57e2bb990ba2b8fca89be4661ec0))
- Apply Rate Limiting to Authentication Routes ([#1644](https://github.com/arii/hrm/issues/1644)) ([2445d71](https://github.com/arii/hrm/commit/2445d7156c6c8c6dcf3cc36841b1a93d468a7814))
- **build:** Resolve TypeScript error in zones.ts ([3d2ad11](https://github.com/arii/hrm/commit/3d2ad117f337e43bd538e30ba2853c6ee8faf7ef))
- **ci:** handle multiline env vars correctly in review workflow ([#1711](https://github.com/arii/hrm/issues/1711)) ([e19ac01](https://github.com/arii/hrm/commit/e19ac0195a65ef72cb25f3fe32ab9771b0c32a8e))
- correct path in health check unit test ([5ad99db](https://github.com/arii/hrm/commit/5ad99db44548d34dad618f672907917e6742b70b))
- **lint:** Correct formatting in zones.ts ([3d2ad11](https://github.com/arii/hrm/commit/3d2ad117f337e43bd538e30ba2853c6ee8faf7ef))
- manually remove semicolons to fix linting errors ([6a85900](https://github.com/arii/hrm/commit/6a85900dbab838e1f296e97e9d13d4ac787af33c))
- reduce gemini review response ([#1716](https://github.com/arii/hrm/issues/1716)) ([063b974](https://github.com/arii/hrm/commit/063b974aa27cd75abb036b14243cb3c5ee426243))
- Remove temporary test file ([c2df6cd](https://github.com/arii/hrm/commit/c2df6cddaf92d1c58f346ec703e591fcb46184c1))
- resolve all linting errors ([492f26d](https://github.com/arii/hrm/commit/492f26d56537e1df0748f816dff7d4b6de1b53b3))
- resolve build error by removing empty hook ([6a85900](https://github.com/arii/hrm/commit/6a85900dbab838e1f296e97e9d13d4ac787af33c))
- resolve build errors ([5ad99db](https://github.com/arii/hrm/commit/5ad99db44548d34dad618f672907917e6742b70b))
- resolve final linting error in detailed health route ([5ad99db](https://github.com/arii/hrm/commit/5ad99db44548d34dad618f672907917e6742b70b))
- resolve final linting errors ([492f26d](https://github.com/arii/hrm/commit/492f26d56537e1df0748f816dff7d4b6de1b53b3))
- resolve final linting errors ([5ad99db](https://github.com/arii/hrm/commit/5ad99db44548d34dad618f672907917e6742b70b))
- resolve final linting issue ([5ad99db](https://github.com/arii/hrm/commit/5ad99db44548d34dad618f672907917e6742b70b))
- resolve linting errors ([492f26d](https://github.com/arii/hrm/commit/492f26d56537e1df0748f816dff7d4b6de1b53b3))
- resolve remaining linting errors ([492f26d](https://github.com/arii/hrm/commit/492f26d56537e1df0748f816dff7d4b6de1b53b3))
- **test:** fix flaky calorie accumulation test ([#1553](https://github.com/arii/hrm/issues/1553)) ([3e3778a](https://github.com/arii/hrm/commit/3e3778ad14db66bd5b8c866c7f1480d9d230ce54))
- Total Calories Mismatch on Client Connect Tile ([#1706](https://github.com/arii/hrm/issues/1706)) ([98e9c28](https://github.com/arii/hrm/commit/98e9c288a8825670cc62a3b8e1af38b68af61b2e))
- **workflow:** fix Gemini review diff input and update models ([#1674](https://github.com/arii/hrm/issues/1674)) ([6ecd9e1](https://github.com/arii/hrm/commit/6ecd9e134b5df789ee4f22bf7254f200e478533c))

## [0.10.0](https://github.com/arii/hrm/compare/v0.9.1...v0.10.0) (2025-12-14)

### Features

- Implement ghost state for disconnected HRM tiles ([fbe34bd](https://github.com/arii/hrm/commit/fbe34bd6463a1dd3b1b3ee487a875849c907fe9b))
- Implement Global Loading State with LoadingContext ([#1507](https://github.com/arii/hrm/issues/1507)) ([1d1bb7a](https://github.com/arii/hrm/commit/1d1bb7a0ba4aa85acef29c99644578e6cbb934bf))
- refactor layout for Next.js 16 client/server boundaries ([1d1bb7a](https://github.com/arii/hrm/commit/1d1bb7a0ba4aa85acef29c99644578e6cbb934bf))
- refactor layout for Next.js 16 client/server boundaries ([4820988](https://github.com/arii/hrm/commit/48209883f27d2e3956c0fee20e63aa32f1f10c2e))

### Bug Fixes

- Address PR feedback for ghost state feature ([fbe34bd](https://github.com/arii/hrm/commit/fbe34bd6463a1dd3b1b3ee487a875849c907fe9b))
- Correct TypeScript errors in theme and remove unused imports ([1d1bb7a](https://github.com/arii/hrm/commit/1d1bb7a0ba4aa85acef29c99644578e6cbb934bf))
- Correctly handle INITIAL_STATE in MockWebSocketProvider ([fbe34bd](https://github.com/arii/hrm/commit/fbe34bd6463a1dd3b1b3ee487a875849c907fe9b))
- Resolve linting errors ([fbe34bd](https://github.com/arii/hrm/commit/fbe34bd6463a1dd3b1b3ee487a875849c907fe9b))
- Run `lint --fix` to correct formatting ([1d1bb7a](https://github.com/arii/hrm/commit/1d1bb7a0ba4aa85acef29c99644578e6cbb934bf))
- Update LoadingIndicator test to reflect new implementation ([1d1bb7a](https://github.com/arii/hrm/commit/1d1bb7a0ba4aa85acef29c99644578e6cbb934bf))
- Update MockWebSocketProvider to fix build failure ([fbe34bd](https://github.com/arii/hrm/commit/fbe34bd6463a1dd3b1b3ee487a875849c907fe9b))

## [0.9.1](https://github.com/arii/hrm/compare/v0.9.0...v0.9.1) (2025-12-14)

### Bug Fixes

- Prevent initial volume command to reduce Spotify API calls ([#1472](https://github.com/arii/hrm/issues/1472)) ([a8a67f2](https://github.com/arii/hrm/commit/a8a67f21e6dc421929c305d19cf4229682194fa5))

## [0.9.0](https://github.com/arii/hrm/compare/v0.8.0...v0.9.0) (2025-12-14)

### Features

- Implement PR Scope Validation and Review Checklist ([#1456](https://github.com/arii/hrm/issues/1456)) ([bfd3d41](https://github.com/arii/hrm/commit/bfd3d41826f8d7919c1f88e966012a1671443708))

## [0.6.0](https://github.com/arii/hrm/compare/v0.5.0...v0.6.0) (2025-12-14)

### Features

- Add API test coverage for Spotify endpoints ([#1319](https://github.com/arii/hrm/issues/1319)) ([31f194d](https://github.com/arii/hrm/commit/31f194db8339c025cefbd0bd70a04b930d2df703))
- Add Playwright tests for Web Bluetooth connection ([#1304](https://github.com/arii/hrm/issues/1304)) ([7b8cade](https://github.com/arii/hrm/commit/7b8cadec846494f8e77f421f8ff117915d14a73b))
- enhance Storybook with auto-open and Button stories ([#1275](https://github.com/arii/hrm/issues/1275)) ([329428b](https://github.com/arii/hrm/commit/329428b5627b8db157a77de1987595ba28c50a26))
- Implement Gemini-Powered Release Management Workflow ([#1303](https://github.com/arii/hrm/issues/1303)) ([acd97aa](https://github.com/arii/hrm/commit/acd97aa4519383279fe7d18aaf098ab28b429f25))

## [0.5.0](https://github.com/arii/hrm/compare/v0.4.1...v0.5.0) (2025-12-13)

### Features

- Add AGENTS.md for agentic instructions ([#1285](https://github.com/arii/hrm/issues/1285)) ([ec9a59b](https://github.com/arii/hrm/commit/ec9a59b8af972c3638095a05ac81733bf5fd8b2d))

## [0.4.1](https://github.com/arii/hrm/compare/v0.4.0...v0.4.1) (2025-12-13)

### Bug Fixes

- remove package-lock.json from pnpm project ([#1295](https://github.com/arii/hrm/issues/1295)) ([00e84b4](https://github.com/arii/hrm/commit/00e84b490d61a7e06d5317660b62d8c2193a964d))

## [0.4.0](https://github.com/arii/hrm/compare/v0.3.0...v0.4.0) (2025-12-13)

### Features

- Create audit reports from specialized AI agents ([#1250](https://github.com/arii/hrm/issues/1250)) ([a11b019](https://github.com/arii/hrm/commit/a11b0191597042f7974ba6caf200743949e329f0))
- Reintroduce Reset Button ([#1247](https://github.com/arii/hrm/issues/1247)) ([90de26c](https://github.com/arii/hrm/commit/90de26c0604948ab8fac2f6e920d613150120197))
- Use configurable API and WebSocket URLs ([#1231](https://github.com/arii/hrm/issues/1231)) ([6d5c7db](https://github.com/arii/hrm/commit/6d5c7db7a4bd1362160fd1ddb3f9fda37dd93136))

### Bug Fixes

- useWebSocket to useReducer with proper state and merge logic ([#1227](https://github.com/arii/hrm/issues/1227)) ([47d1e79](https://github.com/arii/hrm/commit/47d1e79e909fc078cb2ffe6e1020ac9f688eefec))

## [0.3.0](https://github.com/arii/hrm/compare/v0.2.2...v0.3.0) (2025-12-11)

### Features

- add manual release workflow for local deployment ([#1065](https://github.com/arii/hrm/issues/1065)) ([0dea948](https://github.com/arii/hrm/commit/0dea94822af6f15d0cc8d4876fe9d81f24cf11a6))

## [0.2.2](https://github.com/arii/hrm/compare/v0.2.1...v0.2.2) (2025-12-11)

### Bug Fixes

- **ci:** update release-please action to v4 ([#1047](https://github.com/arii/hrm/issues/1047)) ([ac85b23](https://github.com/arii/hrm/commit/ac85b2303dd2c7f847c1a2a9823290cc219f285f))

## [0.2.1](https://github.com/arii/hrm/compare/v0.2.0...v0.2.1) (2025-12-11)

### Bug Fixes

- remove --frozen-lockfile from deploy workflow ([4addf88](https://github.com/arii/hrm/commit/4addf889c7b09968624108e43fd62bbc0da0cbfa))

## [0.2.0](https://github.com/arii/hrm/compare/v0.1.4...v0.2.0) (2025-12-09)

### Features

- ✨ Implement Glassmorphism Theme ([4bc9c1a](https://github.com/arii/hrm/commit/4bc9c1aed14b28e93bd11132ae3d0da1202d3060))
- **a11y:** Add ARIA live regions for real-time updates ([b3950d3](https://github.com/arii/hrm/commit/b3950d352752b2c60ed4d57879b718e23b33c13b))
- Add "Select Music" navigation to Control Panel Spotify Card ([6eda55f](https://github.com/arii/hrm/commit/6eda55fb4951cd67b58ebd17fa38bcd85a581932))
- Add animation dependencies and design system structure ([bc6839d](https://github.com/arii/hrm/commit/bc6839d36e94eff370cda8845f9b1f025148f0bb))
- Add aria-label attributes to iconic buttons ([7e4667d](https://github.com/arii/hrm/commit/7e4667d8f175070003443589271cd08659b8cf45))
- Add automatic pnpm enforcement and npm migration tools ([e44def7](https://github.com/arii/hrm/commit/e44def7983aa80230a1d3c2edde3c667cce1c178))
- Add basic hover and focus states ([445e79a](https://github.com/arii/hrm/commit/445e79a4c5dcb945b4b69d910a89f56a850b74f3))
- Add clean OAuth local testing infrastructure ([7c7e03c](https://github.com/arii/hrm/commit/7c7e03ccde0daa44a7bca9af8a5e60f483059f53))
- Add clear button to Spotify search input ([4deca3f](https://github.com/arii/hrm/commit/4deca3f64c6474ca624d1f5fc9dbaf415764adac))
- Add copilot-instructions.md to ESLint ignore ([cbf9355](https://github.com/arii/hrm/commit/cbf93559c9ece3df91de383a06199081cbfe2127))
- Add Dev Container configuration ([c3053f8](https://github.com/arii/hrm/commit/c3053f8673ec876b884c00f79b699fac2cb9d83c))
- Add development seed data script ([3796652](https://github.com/arii/hrm/commit/37966522ad5ccc2b7279058ad847069898975bd5))
- Add forceConsistentCasingInFileNames to tsconfig.json ([dc0c7d7](https://github.com/arii/hrm/commit/dc0c7d79425498d1ea77f4d83f50593dec16d83e))
- Add health check and readiness endpoints ([fe834f8](https://github.com/arii/hrm/commit/fe834f8cf66b21bb0b26bc7153f8da0cf8f0bd22))
- Add linting script and CI workflow ([e556f03](https://github.com/arii/hrm/commit/e556f0397a6c3846054c2eb6ed780b2a16995f39))
- Add loading spinner to HRM connect button ([8b3771c](https://github.com/arii/hrm/commit/8b3771cb4aeae51607d641cf9e60a79a39fe166a))
- Add micro-interactions and loading states ([25ab79f](https://github.com/arii/hrm/commit/25ab79f726ffbcd05f28faf5e99e1341d816599a))
- Add npm scripts for semantic versioning ([8c1871c](https://github.com/arii/hrm/commit/8c1871c8c9554bf77eb552c1ebf6ab86256e95db))
- Add OpenAPI (Swagger) Documentation ([cc4922a](https://github.com/arii/hrm/commit/cc4922ae2c3f9855256f82092952da5a6c0f41cb))
- Add request validation middleware ([#140](https://github.com/arii/hrm/issues/140)) ([edd56ca](https://github.com/arii/hrm/commit/edd56ca22539970035a41072e8b02bee344f843f))
- Add script for verifying nginx config and setting up .env ([de9178a](https://github.com/arii/hrm/commit/de9178a02f5eaa3eb51987c9ba5f4ccfaac63fad))
- add server reset option ([#177](https://github.com/arii/hrm/issues/177)) ([03ccf2f](https://github.com/arii/hrm/commit/03ccf2f36d2f3f85923f1f5d50e527b00e1ef2cc))
- add Storybook for component development ([bcc0928](https://github.com/arii/hrm/commit/bcc09287b50eca9ed7f383940ca7c499a910469d))
- Add Tabata audio cues and fix build issues ([f232cd5](https://github.com/arii/hrm/commit/f232cd54d3ed0f56e3bc8450d4d463e435317df4))
- Add user preferences persistence ([b14ea33](https://github.com/arii/hrm/commit/b14ea3349fa42b62a47a45a6f9e34aa989f5233c))
- Add visual feedback to selected Spotify items ([16e9814](https://github.com/arii/hrm/commit/16e9814bb12d5d8d6b494aa275712cdffe4b267a))
- apply high-impact UI enhancements ([633e23f](https://github.com/arii/hrm/commit/633e23feb0389fd94593ac2f47c6023e1685affd))
- Automate CI verification and proof submission ([589fc17](https://github.com/arii/hrm/commit/589fc176b7e03f262261c5365a6b709fab250f26))
- comprehensive test infrastructure improvements and screenshot regeneration ([8824f38](https://github.com/arii/hrm/commit/8824f384c00ba73ec080dc46f91f21d11514c5ec))
- Configure NextAuth SpotifyProvider for PKCE compliance ([10a3ddb](https://github.com/arii/hrm/commit/10a3ddbbbef621ac338c559ebc13070020cc979b))
- Create Docker Compose for Development ([d22c876](https://github.com/arii/hrm/commit/d22c876387ca34d5302f1fde72dbeb1fca1b4ac8))
- Create infrastructure test suite ([d4abf82](https://github.com/arii/hrm/commit/d4abf82be4bd140addcd7dc1a3a6d969c2f0a260))
- Create infrastructure test suite ([92750b4](https://github.com/arii/hrm/commit/92750b4d4bc321952f3e1b3a8486786c11a5b8da))
- Create infrastructure test suite ([2a86dc2](https://github.com/arii/hrm/commit/2a86dc27921cb0880716fb281f43de02021ff242))
- **devcontainer:** Implement automated DevContainer setup ([8d940d2](https://github.com/arii/hrm/commit/8d940d218dcc47e7fe86905c58d4eb22efd9f8b7))
- enable concurrent sessions in pr-quality workflow ([2bdb5bd](https://github.com/arii/hrm/commit/2bdb5bd9639e3ef16149f48e979e370f978a0d67))
- Enforce NEXTAUTH_SECRET check on server startup ([c73e4a6](https://github.com/arii/hrm/commit/c73e4a694f6c125cfa3ad366a9d359f43453e834))
- Enhance Dependabot configuration with grouping and schedule ([964cb43](https://github.com/arii/hrm/commit/964cb43309781537873e0db112c2afe352191157))
- enhance developer experience and add CI ([0a254a7](https://github.com/arii/hrm/commit/0a254a7b51a316b9dcb512209ecc10eab56705e5))
- establish shared UI component library ([6256c61](https://github.com/arii/hrm/commit/6256c61247b156168ec84d007914640df9c82cf6))
- extract auth logic to service ([ea69076](https://github.com/arii/hrm/commit/ea69076852a0fa07ecb06d26c9191f33720ce2f3))
- Fix re-rendering loop on connect page ([3534b8e](https://github.com/arii/hrm/commit/3534b8e30d86e71a0e618b9c74d71151ef43a159))
- **frontend:** Improve mobile usability of TimerControls ([c6f66eb](https://github.com/arii/hrm/commit/c6f66eb74fb1d21ad559ba29620e077f8c28318f))
- Implement all actionable steps from CODE_REVIEW.md ([c32e028](https://github.com/arii/hrm/commit/c32e02884857bc1a7663f05009bc52e9b61b2241))
- Implement API and WebSocket Rate Limiting ([03d26e1](https://github.com/arii/hrm/commit/03d26e113ce71a2c26cd35be7c81319d6daf0536))
- Implement automatic reconnection on /client/control ([1d4de06](https://github.com/arii/hrm/commit/1d4de064b18a2899850268a97c02a5479fc7e58e))
- Implement client-side state request for WebSocket ([62e2a91](https://github.com/arii/hrm/commit/62e2a9158ce69d0b49859433e2ddad722e4683af))
- Implement code splitting for Spotify components ([599e305](https://github.com/arii/hrm/commit/599e3051aced946ed6df5698200e2afab164a8a4))
- Implement Error Boundaries ([#141](https://github.com/arii/hrm/issues/141)) ([a547db6](https://github.com/arii/hrm/commit/a547db63ca58bcc722f4ec9cd32a5268710ebb61))
- implement exponential backoff for bluetooth auto-reconnect ([5f11c7f](https://github.com/arii/hrm/commit/5f11c7f9fc27eec02d899809bbe25134817d036e))
- Implement Generic Timer and Stopwatch Utility Service ([516ba58](https://github.com/arii/hrm/commit/516ba581674f29402dbbd78e04c499e6c99e81c2))
- Implement local test reporter and verifier ([89b9cbb](https://github.com/arii/hrm/commit/89b9cbb140055fbea687ed8b420bfef4197905f3))
- Implement modern color system and typography hierarchy ([02fa6f2](https://github.com/arii/hrm/commit/02fa6f292b78c58dcfe0c83be04300f7aa11dfc3))
- Implement rate limiting for API and WebSockets ([3f24f76](https://github.com/arii/hrm/commit/3f24f76b12175afb6be3ddfe2677fd1875dd3f1b))
- implement structured logging with pino ([5ed2f60](https://github.com/arii/hrm/commit/5ed2f60d5890401fe8de75e4062e328903163b61))
- implement structured logging with pino ([7e4563e](https://github.com/arii/hrm/commit/7e4563e18df87a4381f50582570e8069f0e40223))
- implement structured logging with pino ([b1e860c](https://github.com/arii/hrm/commit/b1e860c3cd974d875911b9a0056d946d5fa93a4e))
- Implement System Token Fallback for Device API ([de3ac3e](https://github.com/arii/hrm/commit/de3ac3e5d39f7b32059f0f4538d1021332214500))
- implement test improvement plan phase 1 ([4be521b](https://github.com/arii/hrm/commit/4be521bf3e77307815f49c8a37e05266f0a97ac9))
- Implement UI updates for connect and dashboard pages ([c6ba59b](https://github.com/arii/hrm/commit/c6ba59beec72a1c27c490e1015172e3feda27f88))
- implement WebSocket Command Relay for remote Spotify control ([13a78df](https://github.com/arii/hrm/commit/13a78dfbcc8bb4e5d28b5cd7cea58452a0fda7f1))
- implement WebSocket reconnection with exponential backoff ([022435f](https://github.com/arii/hrm/commit/022435fbdc88949c387c0161266a4d3eab7b3da3))
- Implemented exponential backoff for Bluetooth HRM auto-reconnection ([7271de4](https://github.com/arii/hrm/commit/7271de4aab545e92aa8dd60a40eeee38f71a640d))
- improve Connect Page UX and Bluetooth reliability ([ad126d6](https://github.com/arii/hrm/commit/ad126d6a51d9ab8e29ef0d8e039ed460587f267f))
- improve Connect Page UX and Bluetooth reliability ([2896ff4](https://github.com/arii/hrm/commit/2896ff4a414a35df127912f3488303b738f005be))
- Improve Control UI and add Storybook ([#827](https://github.com/arii/hrm/issues/827)) ([dc07ded](https://github.com/arii/hrm/commit/dc07ded9cb6f60fa82a41a1b1826f75600668b05))
- Improve dashboard UI and replace Tailwind with MUI sx prop ([af22bc9](https://github.com/arii/hrm/commit/af22bc9e199191619af7c0f6e4f2b276c6309f82))
- improve HrTile component size and readability ([b9231eb](https://github.com/arii/hrm/commit/b9231eb0a2c153b2264d5077f9b0e0245c552e20))
- Improve testing infrastructure ([#56](https://github.com/arii/hrm/issues/56)) ([c17388d](https://github.com/arii/hrm/commit/c17388df59f7edeef2750003f3c3fd3443def4e4))
- improve verification script feedback ([970cf2e](https://github.com/arii/hrm/commit/970cf2ecff404e92bc1ff8a6a79c87f3ad867e61))
- Increase font size of name on HR card ([5672b22](https://github.com/arii/hrm/commit/5672b22160ff25d1a2cb8925a516ef46a700d1d8))
- Increase font size of name on HR card ([5e3fa5d](https://github.com/arii/hrm/commit/5e3fa5d0628912b4bbd93190f772c73d378d34ed))
- memoize components ([#139](https://github.com/arii/hrm/issues/139)) ([2a9f916](https://github.com/arii/hrm/commit/2a9f9163ac3c514d4fbf79b370b265f9bfbe4b4f))
- Modernize UI with Glassmorphism and Interactive Buttons ([31d8392](https://github.com/arii/hrm/commit/31d83928e5ad75ba21957e5e150ebb97a4a552ec))
- Optimize MUI imports for tree-shaking ([33957ad](https://github.com/arii/hrm/commit/33957ad591cbcba347e57ebe389eacaacfd96d41))
- Optimize server performance and configurability ([0b51af0](https://github.com/arii/hrm/commit/0b51af05c17a1e799df84bb39e5b15840edac451))
- **performance:** Memoize and lazy-load Dashboard components ([4d4043f](https://github.com/arii/hrm/commit/4d4043f2b8d7e5cc9154ce8831a8c8e6bd2ea80b))
- Phase 1 Test Performance Optimizations ([69c507d](https://github.com/arii/hrm/commit/69c507dd894d0b88b62c1fb2c32df35c8d3e4a07))
- Preload digital-7-mono font ([006bc1b](https://github.com/arii/hrm/commit/006bc1bde25602c1f0410c52d11ac6bf0d111ea0))
- provide automatic connection on /client/control ([200a020](https://github.com/arii/hrm/commit/200a0208e82600125050bf97d220a2a494dcb0a5))
- Remove cycle logic from Tabata timer ([6b9c929](https://github.com/arii/hrm/commit/6b9c9295dee3910137c7c61b65c6acd83a716741))
- Remove cycles from Tabata timer for infinite operation ([fffb54f](https://github.com/arii/hrm/commit/fffb54f049996fa6c4145e152f8ac0415dd4a014))
- Rename ambiguous variables for clarity ([ef6e645](https://github.com/arii/hrm/commit/ef6e645de027d8805a34eadc8da4b616ae0f4b8b))
- replace console.log with structured logger in API routes ([32aa6ea](https://github.com/arii/hrm/commit/32aa6eaaef0ff7e779bca24dc2e80e737d990f6f))
- Scale workout timer sounds with volume controls ([#17](https://github.com/arii/hrm/issues/17)) ([9841d43](https://github.com/arii/hrm/commit/9841d43e7717197ff7005e6710452923af1a0075))
- Speed up TimerControls test with fake timers ([402bd5f](https://github.com/arii/hrm/commit/402bd5f3d282a392fd34c8145db145b27f540b62))
- **spotify:** Enhance SpotifyControls visual design ([978b0fe](https://github.com/arii/hrm/commit/978b0fe7959758585577c5cee52de931781ebfd4))
- Standardize and centralize error handling ([b40bc0d](https://github.com/arii/hrm/commit/b40bc0d9b4f20e501a35a7ffccf685daec60d63f))
- Standardize input field border-radius ([a47e30f](https://github.com/arii/hrm/commit/a47e30fe7c5bd964f136d9f25b6f9d58cbece4b1))
- sync tabata timer controls with dashboard ([f012a68](https://github.com/arii/hrm/commit/f012a689afdd412cd06b3a7a6724baf15741e019))
- **test:** add dormant WebSocket integration test ([703ee57](https://github.com/arii/hrm/commit/703ee57ae44d77b447753c592905a12dda14741f))
- **testing:** Consolidate E2E tests and improve unit test coverage ([3e460bf](https://github.com/arii/hrm/commit/3e460bf917b07e747be28537d1df367c0311e42e))
- Throttle WebSocket updates to improve performance ([3e56ff4](https://github.com/arii/hrm/commit/3e56ff4e1007d75dd1b43ea4ad931c4b356fae40))
- **timer:** Add EMOM/Tabata presets and input validation ([63eaf28](https://github.com/arii/hrm/commit/63eaf28a180060b9d4ad34d327768759ae18a5f3))
- **ui:** Refine placeholder text for various input fields ([726d75c](https://github.com/arii/hrm/commit/726d75ca05c733b0e8005d78295e19b4c764f06c))
- **ui:** standardize button and heading capitalization ([f8f2e50](https://github.com/arii/hrm/commit/f8f2e507c481858d9b53199d126bfef876c524fc))
- **ui:** Standardize vertical spacing in forms ([a8bb080](https://github.com/arii/hrm/commit/a8bb080e7b858dbc81b39cf5e3df76b294c85b12))
- Update default page title ([36cec7b](https://github.com/arii/hrm/commit/36cec7b047c82a30a2ddf0334bd64c8f2f6c57c1))
- Use ready signal instead of timers in tests ([3b836d7](https://github.com/arii/hrm/commit/3b836d72cc95512eb5e3c77d861f9ac6c394ad7c))

### Bug Fixes

- 308: Configure ESLint rule for trailing commas ([#334](https://github.com/arii/hrm/issues/334)) ([52ebcb6](https://github.com/arii/hrm/commit/52ebcb689765f9a7050b2354dc498a1b278c10dd))
- 310: Add .editorconfig for consistent coding styles ([2f23d05](https://github.com/arii/hrm/commit/2f23d05f7b02a631c8b3a5046eda7af7ff6eaf11))
- Add missing @emotion/cache dependency for ThemeRegistry ([970ffeb](https://github.com/arii/hrm/commit/970ffeb370efc7dfe361c64652c2d9e9690880d2))
- add server readiness check and proper page cleanup to Playwright fixtures ([089a065](https://github.com/arii/hrm/commit/089a065c9a9fa3e53f441834a59de1d6bed38226))
- Allow Spotify commands without deviceId to target active device ([a227b13](https://github.com/arii/hrm/commit/a227b13d15a8addcec6a1a05a3b4fc3cd67729fd))
- Apply OAuth redirect fix for NEXTAUTH_URL prioritization ([3cea0b9](https://github.com/arii/hrm/commit/3cea0b94d179ad52363b7ac0a2c7d4489d58b974))
- Apply OAuth redirect fix from leader branch ([0bd4288](https://github.com/arii/hrm/commit/0bd4288b03a5ea5ba4af0cc4c2e45aab750ddc62))
- **build:** resolve duplicate disconnect function definition ([cb86e10](https://github.com/arii/hrm/commit/cb86e108999d2da036adb89a69c95580bd47586f))
- **build:** Resolve TypeScript errors in PlaylistSelector ([3ea344d](https://github.com/arii/hrm/commit/3ea344de75535876ac090356323b21f28979b776))
- **ci:** disable cancel-in-progress for PR workflows ([bf8b25f](https://github.com/arii/hrm/commit/bf8b25f4b5928fa9d4862ba9d026ab18d8cc4786))
- **ci:** redirect test logs to logs/ directory ([890a75e](https://github.com/arii/hrm/commit/890a75eece94773b7696ecc0e6bcdec756afb4f4))
- complete remaining visual regression tests ([bc7e5e8](https://github.com/arii/hrm/commit/bc7e5e8fa378cad729bf59518756dd2ee72798df))
- Correct linting error in test helper ([b01577a](https://github.com/arii/hrm/commit/b01577ad7080cb9f9e7cf1b6c67710bf468ac4b7))
- Correct minor typos and inconsistencies ([ee27c5e](https://github.com/arii/hrm/commit/ee27c5ebef4d61a2ce18a72286c4a7fafa1aeff9))
- Correct OAuth test path and API endpoint expectations ([7be99b2](https://github.com/arii/hrm/commit/7be99b29026b55fe2f2b9e712047cbd7b3bf214a))
- Correct type definitions to resolve build failure ([dfe03eb](https://github.com/arii/hrm/commit/dfe03ebb7851e05397f4ab0daf818b96e9a2c19d))
- **dashboard:** ensure spotify player is visible when authenticated ([4e03746](https://github.com/arii/hrm/commit/4e037465c7de9d84faf74e98029e44e42940a3ff))
- ensure node_modules available across CI jobs ([3cba91e](https://github.com/arii/hrm/commit/3cba91e1d86914c491fbbfb4b7ac490c1599d7f9))
- force release workflow trigger ([2e5abe5](https://github.com/arii/hrm/commit/2e5abe5bdc0a3951a675801ecd17af74bf1b7817))
- improve branch checking in PR update script ([022435f](https://github.com/arii/hrm/commit/022435fbdc88949c387c0161266a4d3eab7b3da3))
- improve branch checking in PR update script ([006bc1b](https://github.com/arii/hrm/commit/006bc1bde25602c1f0410c52d11ac6bf0d111ea0))
- increase visual regression tolerance for HR tiles ([0d96be8](https://github.com/arii/hrm/commit/0d96be8b816601a15fe9857ba0e50edb066647b2))
- **lint:** Narrow scope of lint command to prevent crashing ([a7b9b9c](https://github.com/arii/hrm/commit/a7b9b9c3c35ec60761139456f117229e2f851a4e))
- Playwright configuration and package.json scripts (re-applied) ([0cb52d2](https://github.com/arii/hrm/commit/0cb52d28c6dba9a29329eaea8f4d4e2a9694237e))
- refactor visual regression tests to remove fixture dependency ([9c4d17a](https://github.com/arii/hrm/commit/9c4d17a6fda17cfde1fe45b19eee054998c85b3a))
- Remove hardcoded URL and port values ([f3159e8](https://github.com/arii/hrm/commit/f3159e8933d6866a699a8799eb3cbfe9e0411956))
- remove manual page.close() to prevent fixture cleanup race conditions ([504c5c3](https://github.com/arii/hrm/commit/504c5c3b9d9deef0b0f5bf4098735e6683cdcc6a))
- Remove redundant webServer config from playwright.config.ts ([351bf53](https://github.com/arii/hrm/commit/351bf53f88f1cb54b86f06bca3f6d4450a9b676d))
- resolve all build issues and update visual regression tests ([d4cedc4](https://github.com/arii/hrm/commit/d4cedc492eb6acb673eb8c593d92b963e94df471))
- Resolve bring up errors with a new build process ([9eb2bb4](https://github.com/arii/hrm/commit/9eb2bb4d6f2c1f30e87f9d4a714c919b1bcf2edc))
- resolve ESLint errors in logger.ts ([649fa5b](https://github.com/arii/hrm/commit/649fa5be7c97a27448bb020714e3579044b37e85))
- Resolve package.json merge conflicts and npm lint issues ([881e9b7](https://github.com/arii/hrm/commit/881e9b74481ac58251cb41e2d53a5e90b8d7c893))
- Resolve RangeError: Maximum call stack size exceeded in server.ts ([502b173](https://github.com/arii/hrm/commit/502b1730ac788e8da5ad713a9940d86b946a1800))
- resolve testing script errors and restore visual regression tests ([4f38f29](https://github.com/arii/hrm/commit/4f38f299a47025ae18b07bd4e1256afb4f7457c4))
- resolve timeout and race conditions in visual regression tests ([e8f27e1](https://github.com/arii/hrm/commit/e8f27e16cbaf33e4c447c90e2e181a78b4994e28))
- Resolve TS7006 error by moving UnifiedStateMessage definition to server.ts ([0bc1101](https://github.com/arii/hrm/commit/0bc1101a2170de46606b8b8e2461b93c01fcd199))
- resolve TypeScript strict mode errors, ESLint config issues, and Playwright test failures ([5ec2d4c](https://github.com/arii/hrm/commit/5ec2d4c65c28621812ed58b10a1c500b2fd8b641))
- Resolve visual regression test issues ([a187b87](https://github.com/arii/hrm/commit/a187b875b778785d84d5a8ba74e23ae44322edc5))
- Separate server error handling from listen callback in server.ts ([e9d566b](https://github.com/arii/hrm/commit/e9d566b7c873fab77e7bb9e9d4d79f3b423a67e1))
- Stabilize Playwright test environment ([0d2cd15](https://github.com/arii/hrm/commit/0d2cd15d4f263db4e2408ecc470b074134215288))
- Update all remaining npm commands to pnpm in shell scripts and Docker ([110c05f](https://github.com/arii/hrm/commit/110c05f68b3dfa0291715a4746e7d86a3f9c9f36))
- Update kill-all script to only target isolated Chrome browsers ([35236bc](https://github.com/arii/hrm/commit/35236bce4ae04f1d260bc5dfdd443b00e1103e0d))
- update PM2 deployment configuration to serve static files ([b803cd3](https://github.com/arii/hrm/commit/b803cd3ad85a7cbda0963f3de8479695ecd76c74))
- use event-driven health check polling instead of timeouts ([ceca89b](https://github.com/arii/hrm/commit/ceca89b0ab6a0e9ee8f8e0262c31bae27fee888c))
- **visual-regression:** update snapshot for HR Tiles ([96789db](https://github.com/arii/hrm/commit/96789db7b252bac0229e317c0e040ae1f3111214))

### Reverts

- Revert to pm2 for dev script to unblock development ([18ed375](https://github.com/arii/hrm/commit/18ed375d9b5c7ef66373017995d92608d8c4062b))
