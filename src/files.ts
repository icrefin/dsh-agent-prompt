/**
 * Filesystem side of the Agent Prompt panel: locate the exact instruction
 * files DSH's `@deepseek-ai/dsh-agent-instructions` loader reads, and read or
 * write them. The resolution rules are mirrors of that package's — the
 * user-global file is `$DSH_HOME/AGENTS.md` (falling back to `~/.dsh`), and a
 * workspace's project file sits at the nearest ancestor of the session working
 * directory that carries a `.git` marker, or at the directory itself when no
 * marker exists.
 *
 * @module dsh-agent-prompt/files
 */

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { AGENTS_FILE } from './protocol.ts'

/** Directory name of the default harness home under the OS home. */
const DSH_HOME_DIR_NAME = '.dsh'

/** Environment variable that overrides the default harness home. */
const DSH_HOME_ENV = 'DSH_HOME'

/** Child name that marks a project root, matching the loader's default. */
const PROJECT_ROOT_MARKER = '.git'

/**
 * Resolve the harness home with the loader's precedence: `$DSH_HOME` when it
 * is set and non-blank, then `~/.dsh`. A deployer that pins `dshHome` in the
 * agent-instructions config would diverge; the shipped composition does not.
 * @param env - environment mapping to read `DSH_HOME` from.
 * @returns the normalized absolute harness home.
 */
export function resolveDshHome(env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = env[DSH_HOME_ENV]
  const base = fromEnv !== undefined && fromEnv.trim().length > 0 ? fromEnv : join(homedir(), DSH_HOME_DIR_NAME)
  return resolve(base)
}

/**
 * Describe a harness home for display without leaking an absolute path.
 * @param home - a path returned by {@link resolveDshHome}.
 * @returns `~/.dsh` for the default home, `$DSH_HOME` otherwise.
 */
export function dshHomeDisplay(home: string): string {
  return home === resolve(join(homedir(), DSH_HOME_DIR_NAME)) ? `~/${DSH_HOME_DIR_NAME}` : `$${DSH_HOME_ENV}`
}

/**
 * Abbreviate the OS home to `~` for display, leaving any other path alone.
 * @param path - absolute path.
 * @returns the display form.
 */
export function abbreviateHome(path: string): string {
  const home = homedir()
  if (path === home) return '~'
  const rest = relative(home, path)
  if (rest.length === 0 || rest.startsWith('..') || isAbsolute(rest)) return path
  return `~${sep}${rest}`
}

/** Whether a path exists, whatever its type. */
async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/**
 * Walk upward to the first directory containing a project root marker,
 * exactly as the instruction loader does.
 * @param cwd - absolute workspace directory where the walk begins.
 * @returns the discovered project root, or `cwd` when no marker exists.
 */
export async function findProjectRoot(cwd: string): Promise<string> {
  const start = resolve(cwd)
  let current = start
  for (;;) {
    if (await exists(join(current, PROJECT_ROOT_MARKER))) return current
    const parent = dirname(current)
    if (parent === current) return start
    current = parent
  }
}

/** Existence plus size and modification time of one instruction file. */
export interface PromptFileStat {
  exists: boolean
  bytes: number | null
  mtimeMs: number | null
}

/**
 * Stat one instruction file, treating a missing path and a non-file as absent.
 * @param path - absolute instruction file path.
 * @returns the file state; never throws for a missing path.
 */
export async function statInstructionFile(path: string): Promise<PromptFileStat> {
  try {
    const info = await stat(path)
    if (!info.isFile()) return { exists: false, bytes: null, mtimeMs: null }
    return { exists: true, bytes: info.size, mtimeMs: info.mtimeMs }
  } catch {
    return { exists: false, bytes: null, mtimeMs: null }
  }
}

/**
 * Read one instruction file as UTF-8.
 * @param path - absolute instruction file path.
 * @returns the file body, or an empty string when the file is absent.
 * @throws when the file exists but cannot be read.
 */
export async function readInstructionFile(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''
    throw error
  }
}

/**
 * Write one instruction file, creating its directory when necessary.
 * @param path - absolute instruction file path.
 * @param content - the new body.
 */
export async function writeInstructionFile(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, 'utf8')
}

/**
 * Whether a directory currently exists on disk.
 * @param path - absolute directory path.
 * @returns true when the path is a directory.
 */
export async function directoryExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

export { AGENTS_FILE }