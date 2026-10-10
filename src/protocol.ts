/**
 * Wire contract shared by the host routes and the browser panel: the API base
 * paths, the instruction file name this plugin owns, and the JSON shapes both
 * halves agree on. Kept dependency-free so the client bundle can import it
 * without pulling any host module into the browser.
 */

/** Browser-facing paths of the Agent Prompt API family. */
export const AGENT_PROMPT_API = {
  /** Workspace + global tree with per-file existence and size. */
  tree: '/api/agent-prompt/tree',
  /** Read one instruction file (GET) or write it (POST). */
  file: '/api/agent-prompt/file',
} as const

/**
 * The instruction file this plugin edits. DSH's agent-instructions loader also
 * accepts `CLAUDE.md` and the `.local` overlays; `AGENTS.md` is the base
 * candidate and the one this panel owns.
 */
export const AGENTS_FILE = 'AGENTS.md'

/** Largest request body the write route accepts, in bytes. */
export const MAX_BODY_BYTES = 4 * 1024 * 1024

/** File-level state shared by the tree node and the read payload. */
export interface PromptFileState {
  /** Stable target key: `global` or `ws:<workspaceId>`. */
  key: string
  /** Absolute path of the instruction file. */
  path: string
  /** Home-abbreviated path shown in the UI (`~/.dsh/AGENTS.md`). */
  displayPath: string
  /** Whether the file exists on disk right now. */
  exists: boolean
  /** File size in bytes, or null when the file does not exist. */
  bytes: number | null
  /** Last modification time in epoch milliseconds, or null. */
  mtimeMs: number | null
}

/** The user-global instruction file (`$DSH_HOME/AGENTS.md`). */
export interface GlobalPromptNode extends PromptFileState {
  kind: 'global'
  /** Display form of the harness home (`~/.dsh` or `$DSH_HOME`). */
  homeDisplay: string
}

/** One registered workspace's project-level instruction file. */
export interface WorkspacePromptNode extends PromptFileState {
  kind: 'workspace'
  workspaceId: string
  workspaceTitle: string
  /** The registered workspace directory. */
  workspacePath: string
  /** Nearest ancestor of the workspace holding `.git`, else the workspace itself. */
  projectRoot: string
  /** True when the project root is the workspace directory. */
  rootIsWorkspace: boolean
  /** False when the registered directory is gone from disk. */
  dirExists: boolean
}

/** The full left-pane tree. */
export interface PromptTree {
  /** Resolved harness home (absolute). */
  dshHome: string
  /** Display form of the harness home. */
  homeDisplay: string
  global: GlobalPromptNode
  workspaces: WorkspacePromptNode[]
  /** Workspaces whose registration could not be read at all (diagnostics only). */
  skipped: string[]
}

/** `GET`/`POST` response of the file route, adding the body to the state. */
export interface PromptFilePayload extends PromptFileState {
  content: string
}

/** Error body of every failing route. */
export interface PromptErrorPayload {
  error: string
}