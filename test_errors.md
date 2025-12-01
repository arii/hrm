npm run test:infra

> hrm@0.1.0 test:infra
> playwright test tests/playwright/infrastructure.spec.ts


Running 4 tests using 4 workers

  ✘  1 …ructure.spec.ts:62:3 › Infrastructure & Scripts › npm run dev should start and listen (10.0s)
  ✘  2 …ec.ts:87:3 › Infrastructure & Scripts › start-production.sh should start successfully (10.0s)
     3 …/playwright/infrastructure.spec.ts:35:3 › Infrastructure & Scripts › npm run lint should pass
  ✓  3 …ght/infrastructure.spec.ts:35:3 › Infrastructure & Scripts › npm run lint should pass (12.1s)



  1) [chromium] › tests/playwright/infrastructure.spec.ts:62:3 › Infrastructure & Scripts › npm run dev should start and listen 

    Error: Timeout waiting for port 3005

      22 |         if (Date.now() - start > timeout) {
      23 |           clearInterval(interval);
    > 24 |           reject(new Error(`Timeout waiting for port ${port}`));
         |                  ^
      25 |         }
      26 |       });
      27 |     }, 500);
        at Socket.<anonymous> (/home/ari/hrm-workspace/lead/tests/playwright/infrastructure.spec.ts:24:18)

    attachment #1: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/infrastructure-Infrastruct-28902-dev-should-start-and-listen-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/infrastructure-Infrastruct-28902-dev-should-start-and-listen-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  2) [chromium] › tests/playwright/infrastructure.spec.ts:87:3 › Infrastructure & Scripts › start-production.sh should start successfully 

    Error: Timeout waiting for port 3006

      22 |         if (Date.now() - start > timeout) {
      23 |           clearInterval(interval);
    > 24 |           reject(new Error(`Timeout waiting for port ${port}`));
         |                  ^
      25 |         }
      26 |       });
      27 |     }, 500);
        at Socket.<anonymous> (/home/ari/hrm-workspace/lead/tests/playwright/infrastructure.spec.ts:24:18)

    attachment #1: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/infrastructure-Infrastruct-25bf9-h-should-start-successfully-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/infrastructure-Infrastruct-25bf9-h-should-start-successfully-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  2 failed
    [chromium] › tests/playwright/infrastructure.spec.ts:62:3 › Infrastructure & Scripts › npm run dev should start and listen 
    [chromium] › tests/playwright/infrastructure.spec.ts:87:3 › Infrastructure & Scripts › start-production.sh should start successfully 
  2 passed (12.9s)

To open last HTML report run:

  npx playwright show-report

ari@facer:~/hrm-workspace/lead$ 
ari@facer:~/hrm-workspace/lead$ npm run dev

> hrm@0.1.0 dev
> cross-env NODE_ENV=development TS_NODE_TRANSPILE_ONLY=true node --env-file=.env.local --loader ts-node/esm server.ts | pnpm exec pino-pretty

(node:250123) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("ts-node/esm", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
(node:250123) [DEP0180] DeprecationWarning: fs.Stats constructor is deprecated.
(Use `node --trace-deprecation ...` to show where the warning was created)
[13:01:36.641] INFO (250123): Starting server in development mode
[13:01:36.641] INFO (250123): Environment: NODE_ENV=development
[13:01:36.641] INFO (250123): NEXTAUTH_URL: http://127.0.0.1:3000
[13:01:36.641] INFO (250123): Hostname: 127.0.0.1, Port: 3000
[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
 ⚠ The "middleware" file convention is deprecated. Please use "proxy" instead. Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
[13:01:37.298] DEBUG (250123): Spotify Polling Service Initialized.
[Broadcaster] Initialized successfully.
[13:01:37.301] INFO (250123): > Ready on http://127.0.0.1:3000
[13:01:37.301] INFO (250123): > WebSocket Server listening on ws://127.0.0.1:3000/ws
^C
ari@facer:~/hrm-workspace/lead$ 

