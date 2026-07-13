import { createRequire } from 'node:module'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const require = createRequire(import.meta.url)

/**
 * Two markdown dependencies ship a "browser" export condition that touches the DOM
 * at *module scope* — `document.createElement` in decode-named-character-reference,
 * `new DOMParser()` in hast-util-from-html-isomorphic. Vite's library build picks
 * the browser condition, so those lines get inlined into the published bundle, and
 * merely `import`ing @pi-outpost/embed throws `document is not defined` in Node:
 * during Next.js/Remix/Astro SSR, and in any node-environment test — long before
 * mount() is ever called, and with no way for the consumer to re-resolve the module.
 *
 * Both packages' *default* entries do the same job in pure JS and run in a browser
 * just as well, so the library build pins them. Neither exports map allows the
 * subpath directly, hence the resolved file paths.
 */
const pureJsEntry = (pkg: string, file: string) =>
  path.join(path.dirname(require.resolve(pkg)), file)

const domFreeMarkdownDeps = {
  'decode-named-character-reference': pureJsEntry('decode-named-character-reference', 'index.js'),
  'hast-util-from-html-isomorphic': pureJsEntry('hast-util-from-html-isomorphic', 'index.js'),
}

// Library build: mount(container, options) — bundles everything (Tailwind CSS
// inlined at runtime, shared protocol types, markdown/mermaid/highlight.js) except
// React, which the host app supplies as a peer dependency.
export default defineConfig({
  resolve: {
    alias: domFreeMarkdownDeps,
  },
  plugins: [
    react(),
    tailwindcss(),
    // bundleTypes rolls src/**/*.d.ts into a single mount.d.ts — it needs
    // @microsoft/api-extractor installed, and silently emits unbundled types if
    // it is missing. The published entry must import nothing but React.
    dts({ tsconfigPath: './tsconfig.app.json', include: ['src'], bundleTypes: true }),
  ],
  build: {
    lib: {
      entry: 'src/mount.tsx',
      name: 'PiOutpostEmbed',
      fileName: 'pi-outpost-embed',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
    },
  },
})
