/**
 * Route tests: build the real `/api/agent-prompt` routes against a fake host
 * context (a web-server-free harness that dispatches `req`/`res` the way the
 * real one does), serve them from a real loopback HTTP server, and drive them
 * with `fetch`. Nothing about the handler bodies is stubbed.
 */

import { createServer, type Server } from 'node:http'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { makeRoutes } from '../src/routes.ts'
import type { PromptFilePayload, PromptTree } from '../src/protocol.ts'

/** The shape of one registered workspace, as the routes consume it. */
interface FakeWorkspace {
  id: string
  path: string
  title: string
  createdAt: string
  updatedAt: string
  sessionIds: readonly string[]
}

const workspaceRecord: FakeWorkspace = {
  id: 'ws-1',
  path: '',
  title: 'Demo project',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  sessionIds: [],
}

let root: string
let workspaceDir: string
let dshHome: string
let server: Server
let origin: string
const previousHome = process.env.DSH_HOME

/** The minimum host surface the routes touch. */
function fakeContext(): Context {
  const context = {
    logger: { warn: (): void => {}, info: (): void => {} },
    get: (name: string): unknown => {
      if (name !== 'workspaceRegistry') return undefined
      return {
        list: () => [workspaceRecord],
        get: (id: string) => (id === workspaceRecord.id ? workspaceRecord : undefined),
      }
    },
  }
  return context as unknown as Context
}

beforeAll(async () => {
  server = createServer((req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname
    const route = makeRoutes(fakeContext()).find((candidate) => candidate.path === pathname)
    if (route === undefined) {
      res.writeHead(404).end('no route')
      return
    }
    void route.handler(req, res)
  })
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('no port')
  origin = `http://127.0.0.1:${String(address.port)}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => {
      resolve()
    })
  })
})

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'agent-prompt-routes-'))
  workspaceDir = join(root, 'repo')
  dshHome = join(root, 'dsh-home')
  await mkdir(join(workspaceDir, '.git'), { recursive: true })
  await mkdir(dshHome, { recursive: true })
  workspaceRecord.path = workspaceDir
  process.env.DSH_HOME = dshHome
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

afterAll(() => {
  if (previousHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = previousHome
})

describe('GET /api/agent-prompt/tree', () => {
  it('lists the global file and one project file per workspace', async () => {
    const response = await fetch(`${origin}/api/agent-prompt/tree`)
    expect(response.status).toBe(200)
    const tree = (await response.json()) as PromptTree
    expect(tree.dshHome).toBe(dshHome)
    expect(tree.global.path).toBe(join(dshHome, 'AGENTS.md'))
    expect(tree.global.exists).toBe(false)
    expect(tree.workspaces).toHaveLength(1)
    const node = tree.workspaces[0]
    expect(node?.workspaceId).toBe('ws-1')
    // The registered directory carries `.git`, so it is its own project root.
    expect(node?.projectRoot).toBe(workspaceDir)
    expect(node?.path).toBe(join(workspaceDir, 'AGENTS.md'))
    expect(node?.rootIsWorkspace).toBe(true)
    expect(node?.dirExists).toBe(true)
  })

  it('resolves a nested workspace to its repository root', async () => {
    const nested = join(workspaceDir, 'packages', 'app')
    await mkdir(nested, { recursive: true })
    workspaceRecord.path = nested
    const tree = (await (await fetch(`${origin}/api/agent-prompt/tree`)).json()) as PromptTree
    expect(tree.workspaces[0]?.projectRoot).toBe(workspaceDir)
    expect(tree.workspaces[0]?.rootIsWorkspace).toBe(false)
  })
})

describe('GET /api/agent-prompt/file', () => {
  it('returns an empty body for a file that does not exist', async () => {
    const response = await fetch(`${origin}/api/agent-prompt/file?key=global`)
    expect(response.status).toBe(200)
    const payload = (await response.json()) as PromptFilePayload
    expect(payload.exists).toBe(false)
    expect(payload.content).toBe('')
  })

  it('rejects an unknown target key', async () => {
    const response = await fetch(`${origin}/api/agent-prompt/file?key=/etc/passwd`)
    expect(response.status).toBe(400)
  })

  it('rejects an unregistered workspace id', async () => {
    const response = await fetch(`${origin}/api/agent-prompt/file?key=ws:nope`)
    expect(response.status).toBe(404)
  })
})

describe('POST /api/agent-prompt/file', () => {
  it('creates the global file and round-trips its content', async () => {
    const response = await fetch(`${origin}/api/agent-prompt/file`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'global', content: '# Global rules\n' }),
    })
    expect(response.status).toBe(200)
    const payload = (await response.json()) as PromptFilePayload
    expect(payload.exists).toBe(true)
    expect(payload.content).toBe('# Global rules\n')
    expect(await readFile(join(dshHome, 'AGENTS.md'), 'utf8')).toBe('# Global rules\n')

    const reread = (await (await fetch(`${origin}/api/agent-prompt/file?key=global`)).json()) as PromptFilePayload
    expect(reread.content).toBe('# Global rules\n')
  })

  it('writes a workspace project file inside the repository root', async () => {
    const response = await fetch(`${origin}/api/agent-prompt/file`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'ws:ws-1', content: 'project rules' }),
    })
    expect(response.status).toBe(200)
    expect(await readFile(join(workspaceDir, 'AGENTS.md'), 'utf8')).toBe('project rules')
  })

  it('refuses a body without string content', async () => {
    const response = await fetch(`${origin}/api/agent-prompt/file`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'global', content: 42 }),
    })
    expect(response.status).toBe(400)
  })

  it('refuses unparseable JSON', async () => {
    const response = await fetch(`${origin}/api/agent-prompt/file`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    })
    expect(response.status).toBe(400)
  })
})

describe('method and route fences', () => {
  it('answers 405 for an unsupported method', async () => {
    const response = await fetch(`${origin}/api/agent-prompt/tree`, { method: 'POST' })
    expect(response.status).toBe(405)
  })
})