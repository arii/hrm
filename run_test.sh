export NEXT_PUBLIC_TESTING=true
pnpm run test:unit tests/unit/app/client/connect/page.test.tsx tests/unit/hooks/useBluetoothHRM.test.ts tests/unit/hooks/useBluetoothHRM.race.test.ts
