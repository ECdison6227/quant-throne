import { defineConfig } from 'vitest/config';
export default defineConfig({ base:'./', build:{ sourcemap:false }, server:{port:5173},test:{include:['src/**/*.test.ts','tools/data/*.test.mjs','services/quant-api/*.test.mjs','integrations/vivic/*.test.mjs'],exclude:['**/node_modules/**','.work/**','deliverables/**','android/**']} });
