import { defineConfig } from 'tsup'
import { dependencies } from './package.json'

export default defineConfig({
  entry: [
    'src/extension/main.ts',
    'src/language/main.ts',
  ],
  outDir: 'out',
  format: ['cjs'],
  clean: true,
  external: ['vscode'],
  noExternal: Object.keys(dependencies),
})
