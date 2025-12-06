import * as esbuild from 'npm:esbuild@0.24.0';
import { denoPlugins } from 'jsr:@luca/esbuild-deno-loader@0.11.0';

const result = await esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints: ['./mod.mjs'],
  outfile: './bundle.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
});

await esbuild.stop();
console.log('Bundle created successfully!');
