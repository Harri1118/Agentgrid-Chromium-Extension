import { build } from 'esbuild'

const reactShim = {
  name: 'react-shim',
  setup(b) {
    b.onResolve({ filter: /^react(\/.*)?$/ }, (args) => ({
      path: args.path,
      namespace: 'react-shim',
    }))

    b.onLoad({ filter: /^react$/, namespace: 'react-shim' }, () => ({
      contents: 'module.exports = globalThis.__agentgrid_react',
      loader: 'js',
    }))

    b.onLoad({ filter: /^react\/jsx-runtime$/, namespace: 'react-shim' }, () => ({
      contents: `
        var React = globalThis.__agentgrid_react;
        function jsx(type, props, key) {
          if (key !== undefined) { props = Object.assign({}, props, { key: key }); }
          return React.createElement(type, props);
        }
        exports.jsx = jsx;
        exports.jsxs = jsx;
        exports.Fragment = React.Fragment;
      `,
      loader: 'js',
    }))

    b.onLoad({ filter: /^react\/jsx-dev-runtime$/, namespace: 'react-shim' }, () => ({
      contents: `
        var React = globalThis.__agentgrid_react;
        function jsxDEV(type, props, key) {
          if (key !== undefined) { props = Object.assign({}, props, { key: key }); }
          return React.createElement(type, props);
        }
        exports.jsxDEV = jsxDEV;
        exports.Fragment = React.Fragment;
      `,
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
  jsx: 'automatic',
  jsxImportSource: 'react',
  target: 'es2022',
  minify: false,
})
