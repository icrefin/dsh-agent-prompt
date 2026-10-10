import { readFileSync } from 'node:fs'
import type { UserConfig } from 'tsdown'

/**
 * Version inlined into the browser bundle, read from this package's own
 * manifest so the panel title and the published package cannot disagree.
 */
const version = (
  JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }
).version

export default {
  entry: { client: 'src/client/index.tsx' },
  outDir: 'lib',
  format: ['cjs'],
  platform: 'browser',
  target: 'es2022',
  dts: false,
  sourcemap: true,
  clean: false,
  external: ['react', 'react/jsx-runtime'],
  define: { __DSH_AGENT_PROMPT_VERSION__: JSON.stringify(version) },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({ id: "dsh-agent-prompt", factory: (require) => {',
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
} satisfies UserConfig
