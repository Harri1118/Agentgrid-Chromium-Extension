import { build } from 'esbuild'

const reactShim = {
  name: 'react-shim',
  setup(b) {
    b.onResolve({ filter: /^react(\/.*)?$/ }, (args) => ({
      path: args.path,
      namespace: 'react-shim',
    }))

    b.onLoad({ filter: /.*/, namespace: 'react-shim' }, () => ({
      contents: 'module.exports = globalThis.__agentgrid_react',
      loader: 'js',
    }))
  },
}

await build({
  entryPoints: ['src/renderer/index.tsx'],
  bundle: true,
  format: 'iife',
  outfile: 'dist/renderer.js',
  plugins: [reactShim],
  jsx: 'transform',
  target: 'es2022',
  minify: false,
})
