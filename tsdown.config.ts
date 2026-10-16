import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: {
    generator: 'tsgo'
  },
  exports: true,
  sourcemap: true,
  format: ['cjs', 'esm'],
  publint: true,
  target: 'es2023'
});
