/**
 * Path-resolution tests: the plugin must point at exactly the files DSH's
 * agent-instructions loader reads. These run against a real temporary
 * filesystem — no mocking of `node:fs`.
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  abbreviateHome,
  directoryExists,
  dshHomeDisplay,
  findProjectRoot,
  readInstructionFile,
  resolveDshHome,
  statInstructionFile,
  writeInstructionFile,
} from '../src/files.ts'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'agent-prompt-files-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('resolveDshHome', () => {
  it('uses an explicit DSH_HOME', () => {
    expect(resolveDshHome({ DSH_HOME: '/tmp/custom-home' })).toBe('/tmp/custom-home')
  })

  it('treats a blank DSH_HOME as unset', () => {
    expect(resolveDshHome({ DSH_HOME: '   ' })).toBe(join(homedir(), '.dsh'))
  })

  it('falls back to ~/.dsh', () => {
    expect(resolveDshHome({})).toBe(join(homedir(), '.dsh'))
  })

  it('labels the default home symbolically', () => {
    expect(dshHomeDisplay(join(homedir(), '.dsh'))).toBe('~/.dsh')
    expect(dshHomeDisplay(join(homedir(), 'elsewhere'))).toBe('$DSH_HOME')
  })
})

describe('abbreviateHome', () => {
  it('shortens paths under the OS home', () => {
    expect(abbreviateHome(join(homedir(), 'x', 'AGENTS.md'))).toBe(join('~', 'x', 'AGENTS.md'))
  })

  it('leaves the home directory itself and outside paths alone', () => {
    expect(abbreviateHome(homedir())).toBe('~')
    expect(abbreviateHome(join(homedir(), '..', 'sibling', 'AGENTS.md'))).toBe(join(homedir(), '..', 'sibling', 'AGENTS.md'))
  })
})

describe('findProjectRoot', () => {
  it('walks up to the directory holding .git', async () => {
    const project = join(root, 'repo')
    const nested = join(project, 'packages', 'app')
    await mkdir(join(project, '.git'), { recursive: true })
    await mkdir(nested, { recursive: true })
    expect(await findProjectRoot(nested)).toBe(project)
  })

  it('treats a .git file (worktree) as a marker', async () => {
    const project = join(root, 'worktree')
    await mkdir(join(project, 'lib'), { recursive: true })
    await writeFile(join(project, '.git'), 'gitdir: /elsewhere\n')
    expect(await findProjectRoot(join(project, 'lib'))).toBe(project)
  })

  it('returns the starting directory when no marker exists', async () => {
    const plain = join(root, 'plain', 'deep')
    await mkdir(plain, { recursive: true })
    // The OS temp root carries no `.git`, so the walk ends at the given path.
    expect(await findProjectRoot(plain)).toBe(plain)
  })
})

describe('instruction file access', () => {
  it('reports a missing file without throwing', async () => {
    const path = join(root, 'AGENTS.md')
    expect(await statInstructionFile(path)).toEqual({ exists: false, bytes: null, mtimeMs: null })
    expect(await readInstructionFile(path)).toBe('')
  })

  it('creates missing parent directories on write', async () => {
    const path = join(root, 'nested', 'deeper', 'AGENTS.md')
    await writeInstructionFile(path, '# hello\n')
    expect(await readInstructionFile(path)).toBe('# hello\n')
    const info = await statInstructionFile(path)
    expect(info.exists).toBe(true)
    expect(info.bytes).toBe(8)
    expect(info.mtimeMs).toBeTypeOf('number')
  })

  it('treats a directory in the file position as absent', async () => {
    const path = join(root, 'AGENTS.md')
    await mkdir(path)
    expect((await statInstructionFile(path)).exists).toBe(false)
  })

  it('detects directory existence', async () => {
    expect(await directoryExists(root)).toBe(true)
    expect(await directoryExists(join(root, 'nope'))).toBe(false)
  })
})