import process from 'node:process'
import chalk from 'chalk'
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
        const elapsedTime = (performance.now() - startTime).toFixed(0)

        const date = new Date()
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        const seconds = date.getSeconds().toString().padStart(2, '0')
        const dateTime = `${hours}:${minutes}:${seconds}`

        const errors = result.errors.length
        console.log(`[${chalk.gray(dateTime)}] Built ${errors ? chalk.red('failed') : chalk.green('successfully')} in ${elapsedTime}ms`)
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
