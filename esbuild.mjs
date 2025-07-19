import process from 'node:process'
import * as esbuild from 'esbuild'

const watch = process.argv.includes('--watch')
const production = process.argv.includes('--production')

async function main() {
  const esbuildProblemMatcherPlugin = {
    name: 'esbuild-problem-matcher',
    setup(build) {
      let startTime
      build.onStart(() => {
        startTime = performance.now()
      })
      build.onEnd((result) => {
        result.errors.forEach(({ text, location }) => {
          console.error(`✘ [ERROR] ${text}`)
          console.error(`    ${location.file}:${location.line}:${location.column}:`)
        })
        const endTime = performance.now()
        const duration = (endTime - startTime).toFixed(0)
        console.log(`Build finished in ${duration}ms`)
      })
    },
  }

  const ctx = await esbuild.context({
    entryPoints: [
      'src/extension/main.ts',
      'src/language/main.ts',
    ],
    outdir: 'out',
    bundle: true,
    target: 'ES2020',
    format: 'cjs',
    outExtension: {
      '.js': '.cjs',
    },
    loader: { '.ts': 'ts' },
    external: ['vscode'],
    platform: 'node',
    sourcemap: !production,
    minify: production,
    plugins: [
      esbuildProblemMatcherPlugin,
    ],
  })

  if (watch) {
    await ctx.watch()
  }
  else {
    await ctx.rebuild()
    await ctx.dispose()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
