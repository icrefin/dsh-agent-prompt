/**
 * Render the built client bundle outside the GUI and screenshot it.
 *
 * The panel's slot wiring is verified against the live app through the Cordis
 * Inspect providers; this harness answers the other half — that the component
 * tree and stylesheet actually paint. It loads `lib/client.js` through a stub
 * `window.__ModuleLoader__`, calls the plugin's `apply` with a minimal fake
 * client context whose `slots.register` just records the entries, then mounts
 * the `main` entry with a stubbed `fetch` that replays a captured tree.
 *
 * Usage (needs `pnpm build` first, and Google Chrome on the host):
 *
 *     node tools/preview.mjs [--out <dir>] [--png <file>] [--open]
 *
 * @module dsh-agent-prompt/tools/preview
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(here, '..')
const bundle = join(packageRoot, 'lib', 'client.js')

/** Chrome binaries to try, in order. */
const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
]

/** A captured tree with the shape the host route really returns. */
const TREE = {
  dshHome: join(homedir(), '.dsh'),
  homeDisplay: '~/.dsh',
  global: {
    kind: 'global',
    key: 'global',
    homeDisplay: '~/.dsh',
    path: join(homedir(), '.dsh', 'AGENTS.md'),
    displayPath: '~/.dsh/AGENTS.md',
    exists: true,
    bytes: 412,
    mtimeMs: Date.now() - 86_400_000,
  },
  workspaces: [
    {
      kind: 'workspace',
      key: 'ws:dsh-plugins',
      workspaceId: 'dsh-plugins',
      workspaceTitle: 'dsh-plugins',
      workspacePath: join(homedir(), 'workspace', 'dsh-plugins'),
      projectRoot: join(homedir(), 'workspace', 'dsh-plugins'),
      rootIsWorkspace: true,
      dirExists: true,
      path: join(homedir(), 'workspace', 'dsh-plugins', 'AGENTS.md'),
      displayPath: '~/workspace/dsh-plugins/AGENTS.md',
      exists: true,
      bytes: 1204,
      mtimeMs: Date.now() - 3_600_000,
    },
    {
      kind: 'workspace',
      key: 'ws:harness',
      workspaceId: 'harness',
      workspaceTitle: 'harness',
      workspacePath: join(homedir(), 'code', 'repo', 'packages', 'app'),
      projectRoot: join(homedir(), 'code', 'repo'),
      rootIsWorkspace: false,
      dirExists: true,
      path: join(homedir(), 'code', 'repo', 'AGENTS.md'),
      displayPath: '~/code/repo/AGENTS.md',
      exists: false,
      bytes: null,
      mtimeMs: null,
    },
  ],
  skipped: [],
}

/** Body served for the selected file. */
const CONTENT = `# dsh-agent-prompt

Instructions for agents working in this repository.

## Ground rules

- Run \`pnpm check\` before every commit.
- Keep \`lib/\` out of the diff: it is a build product.
- Prefer a focused edit over a rewrite; the reviewers read diffs, not files.

## Layout

| Path | Role |
|---|---|
| \`src/index.ts\` | host plugin body: the route effect |
| \`src/routes.ts\` | the /api/agent-prompt route family |
| \`src/client/\` | the browser panel |

> Editing this file changes what the agent reads at the start of every session.
`

/** English dictionary, mirrored from src/client/locales.ts. */
const DICT = {
  panel: 'Agent Prompt',
  title: 'Agent Prompt',
  intro:
    'Edit the AGENTS.md instruction files DSH loads: one user-global file for every session, plus one project-level file per workspace.',
  globalGroup: 'Global',
  globalName: 'User-global instructions',
  workspacesGroup: 'Workspaces',
  filterPlaceholder: 'Filter workspaces…',
  notCreated: 'not created',
  missingDir: 'directory missing',
  unsaved: 'Unsaved changes',
  saved: 'Saved',
  save: 'Save',
  reload: 'Reload',
  undo: 'Undo',
  redo: 'Redo',
  wrap: 'Wrap',
  lines: 'lines',
  chars: 'chars',
}

/** The harness page: stub loader, fake context, stubbed fetch, then mount. */
function page(reactReact, reactDomDir, bundleSource) {
  const react = readFileSync(join(reactReact, 'umd', 'react.development.js'), 'utf8')
  const reactDom = readFileSync(join(reactDomDir, 'umd', 'react-dom.development.js'), 'utf8')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Agent Prompt preview</title>
<style>html,body{margin:0;height:100%;background:var(--dsw-alias-bg-base)}
:root{--dsw-alias-bg-base:#fff;--dsw-alias-bg-layer-1:#fbfbfc;--dsw-alias-bg-layer-2:#f1f2f4;
--dsw-alias-border-l1:#e4e5e8;--dsw-alias-border-l2:#d2d4d8;--dsw-alias-brand-primary:#3b6df5;
--dsw-alias-label-primary:#1a1b1e;--dsw-alias-label-secondary:#71737a;
--dsw-alias-state-error-primary:#d93b36;--dsw-alias-state-warn-primary:#c07c12;
--dsw-alias-state-success-primary:#1f9d55;--dsw-alias-state-idle-primary:#c3c5ca;
--dsw-specific-sidebar-fill:#f7f7f9}</style></head>
<body><div id="root" style="height:100vh"></div>
<script>${react}</script>
<script>${reactDom}</script>
<script>
window.__ModuleLoader__ = { load: (definition) => { window.__definition = definition } }
const jsxRuntime = {
  Fragment: React.Fragment,
  jsx: (type, props) => React.createElement(type, props || {}),
  jsxs: (type, props) => React.createElement(type, props || {}),
}
window.__harnessRequire = (name) => {
  if (name === 'react') return React
  if (name === 'react/jsx-runtime') return jsxRuntime
  throw new Error('unexpected require: ' + name)
}
</script>
<script>${bundleSource}</script>
<script>
const DICT = ${JSON.stringify(DICT)}
const TREE = ${JSON.stringify(TREE)}
const CONTENT = ${JSON.stringify(CONTENT)}

// Replay the host's JSON responses without a server.
const byKey = { global: TREE.global, 'ws:dsh-plugins': TREE.workspaces[0] }
for (const node of TREE.workspaces) byKey[node.key] = node
window.fetch = async (url, init) => {
  const target = String(url)
  const payload = target.includes('/tree')
    ? TREE
    : (() => {
        const key = init && init.body ? JSON.parse(init.body).key : new URL('http://x' + target).searchParams.get('key')
        const node = byKey[key] || TREE.global
        return { ...node, content: CONTENT }
      })()
  return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify(payload) }
}

const registered = []
const effects = []
const ctx = {
  effect: (callback) => { effects.push(callback()) },
  locale: { register: () => () => {}, bind: () => (key) => DICT[key] || key },
  slots: {
    register: (options, component) => { registered.push({ options, component }); return () => {} },
    inject: (_key, callback) => callback(),
  },
}

const mod = window.__definition.factory(window.__harnessRequire)
mod.apply(ctx)
const main = registered.find((entry) => entry.options.name === 'main')
if (!main) throw new Error('no main registration')
const t = (key) => DICT[key] || key
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(main.component, { t, usePanelInfo: () => ({}) }))
window.__ready = true
</script>
</body></html>`
}

/** Run the screenshot through a headless Chrome. */
function screenshot(chrome, file, png, width, height) {
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=2',
      `--window-size=${String(width)},${String(height)}`,
      '--virtual-time-budget=8000',
      `--screenshot=${png}`,
      `file://${file}`,
    ],
    { stdio: 'pipe' },
  )
}

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const index = argv.indexOf(name)
  return index === -1 ? fallback : argv[index + 1]
}

if (!existsSync(bundle)) {
  console.error('lib/client.js is missing — run `pnpm build` first.')
  process.exit(1)
}

// The version tag is inlined by tsdown from package.json. Nothing else in the
// test suite can see that wiring, so the guard lives here: a bundle built
// without the define would render a bare "v" and pass every other check.
const manifestVersion = (JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))).version
const bundleSource = readFileSync(bundle, 'utf8')
if (!bundleSource.includes(JSON.stringify(manifestVersion))) {
  console.error(`lib/client.js does not carry the manifest version ${manifestVersion} — is the tsdown \`define\` wired up?`)
  process.exit(1)
}
const chrome = CHROME_CANDIDATES.find((candidate) => existsSync(candidate))
if (chrome === undefined) {
  console.error('No Chrome-family browser found; looked at:\n  ' + CHROME_CANDIDATES.join('\n  '))
  process.exit(1)
}

const outDir = resolve(flag('--out', join(tmpdir(), 'dsh-agent-prompt-preview')))
const png = resolve(flag('--png', join(outDir, 'panel.png')))
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const file = join(outDir, 'index.html')
const modules = join(packageRoot, 'node_modules')
writeFileSync(
  file,
  page(join(modules, 'react'), join(modules, 'react-dom'), bundleSource),
)
screenshot(chrome, file, png, 1440, 900)
console.log(`preview html: ${file}`)
console.log(`screenshot:   ${png}`)
if (argv.includes('--open')) execFileSync('open', [png])