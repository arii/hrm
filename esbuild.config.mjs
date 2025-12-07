import esbuild from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';

esbuild.build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  outfile: 'dist/server.mjs',
  format: 'esm',
  plugins: [nodeExternalsPlugin()],
}).catch(() => process.exit(1));
