/**
 * The `/api/agent-prompt` route family: the tree of user-global and
 * per-workspace instruction files, plus read and write of one of them.
 *
 * Every route carries a loopback-only fence. The write route rewrites a file
 * the agent reads as instructions, so a LAN-exposed dsh web deployment must
 * never serve it.
 *
 * @module dsh-agent-prompt/routes
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { join, resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import type { Workspace, WorkspaceId } from '@deepseek-ai/dsh-workspace'
import {
  AGENT_PROMPT_API,
  AGENTS_FILE,
  MAX_BODY_BYTES,
  type GlobalPromptNode,
  type PromptErrorPayload,
  type PromptFilePayload,
  type PromptTree,
  type WorkspacePromptNode,
} from './protocol.ts'
import {
  abbreviateHome,
  directoryExists,
  dshHomeDisplay,
  findProjectRoot,
  readInstructionFile,
  resolveDshHome,
  statInstructionFile,
  writeInstructionFile,
} from './files.ts'

/** The target key addressing the user-global instruction file. */
const GLOBAL_KEY = 'global'

/** Prefix of a target key addressing one registered workspace. */
const WORKSPACE_PREFIX = 'ws:'

/** One resolved instruction-file target. */
interface PromptTarget {
  key: string
  path: string
  displayPath: string
}

/** A resolution failure carrying the HTTP status the route should answer with. */
class TargetError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'TargetError'
    this.status = status
  }
}

/** Write one JSON response body. */
function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
  })
  res.end(text)
}

/** Write one JSON error body. */
function writeError(res: ServerResponse, status: number, message: string): void {
  const body: PromptErrorPayload = { error: message }
  writeJson(res, status, body)
}

/** Whether the request arrived over the loopback interface. */
function isLoopbackRequest(req: IncomingMessage): boolean {
  const address = req.socket.remoteAddress
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

/** Read and parse a JSON request body, refusing anything oversized. */
async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown> | undefined> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    const buffer = chunk as Buffer
    total += buffer.length
    if (total > MAX_BODY_BYTES) return undefined
    chunks.push(buffer)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.trim().length === 0) return {}
  try {
    const parsed: unknown = JSON.parse(text)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
    return parsed as Record<string, unknown>
  } catch {
    return undefined
  }
}

/** The live workspace registry, or undefined when the deployment omits it. */
function workspaceRegistry(ctx: Context): { list(): Workspace[]; get(id: WorkspaceId): Workspace | undefined } | undefined {
  return ctx.get('workspaceRegistry')
}

/**
 * Resolve one target key to the instruction file it addresses.
 *
 * `global` maps to `$DSH_HOME/AGENTS.md`. `ws:<id>` maps to `AGENTS.md` at the
 * project root of that registered workspace — the nearest ancestor carrying
 * `.git`, else the workspace directory itself. Only registered workspace ids
 * are accepted, so the panel can never be pointed at an arbitrary path.
 * @param ctx - host plugin context.
 * @param key - the target key from the request.
 * @returns the resolved target with its display path.
 * @throws TargetError for a malformed key or an unknown workspace.
 */
async function resolveTarget(ctx: Context, key: string): Promise<PromptTarget> {
  const home = resolveDshHome()
  if (key === GLOBAL_KEY) {
    const path = join(home, AGENTS_FILE)
    return { key, path, displayPath: `${dshHomeDisplay(home)}/${AGENTS_FILE}` }
  }
  if (!key.startsWith(WORKSPACE_PREFIX)) {
    throw new TargetError(400, `unknown target key: ${key || '(empty)'}`)
  }
  const workspaceId = key.slice(WORKSPACE_PREFIX.length)
  const registry = workspaceRegistry(ctx)
  if (registry === undefined) throw new TargetError(503, 'the workspace registry is not available in this composition')
  const workspace = registry.get(workspaceId as WorkspaceId)
  if (workspace === undefined) throw new TargetError(404, `unknown workspace: ${workspaceId}`)
  const directory = resolve(workspace.path)
  const projectRoot = await findProjectRoot(directory)
  const path = join(projectRoot, AGENTS_FILE)
  return { key, path, displayPath: abbreviateHome(path) }
}

/** Build one workspace tree node, degrading gracefully for a missing directory. */
async function workspaceNode(workspace: Workspace): Promise<WorkspacePromptNode> {
  const directory = resolve(workspace.path)
  const dirExists = await directoryExists(directory)
  const projectRoot = await findProjectRoot(directory)
  const path = join(projectRoot, AGENTS_FILE)
  const info = await statInstructionFile(path)
  return {
    kind: 'workspace',
    key: `${WORKSPACE_PREFIX}${workspace.id}`,
    workspaceId: workspace.id,
    workspaceTitle: workspace.title,
    workspacePath: directory,
    projectRoot,
    rootIsWorkspace: projectRoot === directory,
    dirExists,
    path,
    displayPath: abbreviateHome(path),
    exists: info.exists,
    bytes: info.bytes,
    mtimeMs: info.mtimeMs,
  }
}

/** Assemble the whole tree: the global file plus one node per registered workspace. */
async function buildTree(ctx: Context): Promise<PromptTree> {
  const home = resolveDshHome()
  const globalPath = join(home, AGENTS_FILE)
  const globalInfo = await statInstructionFile(globalPath)
  const global: GlobalPromptNode = {
    kind: 'global',
    key: GLOBAL_KEY,
    homeDisplay: dshHomeDisplay(home),
    path: globalPath,
    displayPath: `${dshHomeDisplay(home)}/${AGENTS_FILE}`,
    exists: globalInfo.exists,
    bytes: globalInfo.bytes,
    mtimeMs: globalInfo.mtimeMs,
  }
  const registry = workspaceRegistry(ctx)
  const workspaces: WorkspacePromptNode[] = []
  const skipped: string[] = []
  for (const workspace of registry?.list() ?? []) {
    try {
      workspaces.push(await workspaceNode(workspace))
    } catch (error) {
      skipped.push(`${workspace.title}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return { dshHome: home, homeDisplay: dshHomeDisplay(home), global, workspaces, skipped }
}

/** Build the read/write payload for one resolved target. */
async function filePayload(target: PromptTarget): Promise<PromptFilePayload> {
  const info = await statInstructionFile(target.path)
  const content = await readInstructionFile(target.path)
  return {
    key: target.key,
    path: target.path,
    displayPath: target.displayPath,
    exists: info.exists,
    bytes: info.bytes,
    mtimeMs: info.mtimeMs,
    content,
  }
}

/** Wrap one handler in the shared request fences. */
function createRoute(
  ctx: Context,
  spec: { path: string; methods: readonly string[]; handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> },
): WebRoute {
  return {
    kind: 'exact',
    path: spec.path,
    handler: async (req, res) => {
      if (!isLoopbackRequest(req)) {
        writeError(res, 403, 'forbidden: loopback-only')
        return
      }
      if (!spec.methods.includes(req.method ?? '')) {
        writeError(res, 405, `method not allowed: ${req.method ?? ''}`)
        return
      }
      try {
        await spec.handler(req, res)
      } catch (error) {
        if (error instanceof TargetError) {
          writeError(res, error.status, error.message)
          return
        }
        ctx.logger.warn('[dsh-agent-prompt] route failed', error)
        writeError(res, 500, error instanceof Error ? error.message : String(error))
      }
    },
  }
}

/**
 * Build every route of the `/api/agent-prompt` family.
 * @param ctx - host plugin context carrying the web server and workspace registry.
 * @returns the exact-path routes to register.
 */
export function makeRoutes(ctx: Context): WebRoute[] {
  return [
    createRoute(ctx, {
      path: AGENT_PROMPT_API.tree,
      methods: ['GET'],
      handler: async (_req, res) => {
        writeJson(res, 200, await buildTree(ctx))
      },
    }),
    createRoute(ctx, {
      path: AGENT_PROMPT_API.file,
      methods: ['GET', 'POST'],
      handler: async (req, res) => {
        const url = new URL(req.url ?? AGENT_PROMPT_API.file, 'http://localhost')
        if (req.method === 'GET') {
          const key = url.searchParams.get('key') ?? GLOBAL_KEY
          writeJson(res, 200, await filePayload(await resolveTarget(ctx, key)))
          return
        }
        const body = await readJsonBody(req)
        if (body === undefined) {
          writeError(res, 400, `invalid JSON body, or larger than ${MAX_BODY_BYTES} bytes`)
          return
        }
        const key = typeof body.key === 'string' && body.key.length > 0 ? body.key : GLOBAL_KEY
        if (typeof body.content !== 'string') {
          writeError(res, 400, 'body.content must be a string')
          return
        }
        const target = await resolveTarget(ctx, key)
        await writeInstructionFile(target.path, body.content)
        writeJson(res, 200, await filePayload(target))
      },
    }),
  ]
}