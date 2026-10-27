/**
 * The panel's view of the route family.
 *
 * The regression this pins: an origin-absolute `/api/...` path is correct only
 * while the client is served at the origin root. `dsh-remote-control` mounts the
 * same client at `/s/<sessionId>/`, and an absolute request escapes that mount —
 * the prefix's host answers for `/api/...` with a `200 text/html` page, so the
 * panel would read someone else's HTML instead of this host's JSON, with no
 * HTTP error to show for it.
 *
 * @module dsh-agent-prompt/test/protocol
 */

import { describe, expect, it } from 'vitest'
import { AGENT_PROMPT_API, AGENT_PROMPT_CLIENT_API, clientPath } from '../src/protocol.ts'

/** Where the desktop app and a root-mounted `dsh web` serve the client. */
const AT_ROOT = 'http://127.0.0.1:50603/'

/** Where `dsh-remote-control` serves the same client to a paired browser. */
const UNDER_TUNNEL = 'https://relay.example/s/ab12/'

describe('AGENT_PROMPT_CLIENT_API', () => {
  it('never begins with a slash, so it resolves against the document', () => {
    for (const path of Object.values(AGENT_PROMPT_CLIENT_API)) {
      expect(path.startsWith('/')).toBe(false)
    }
  })

  it('reaches the host route when the client is at the origin root', () => {
    for (const [name, path] of Object.entries(AGENT_PROMPT_CLIENT_API)) {
      const route = AGENT_PROMPT_API[name as keyof typeof AGENT_PROMPT_API]
      expect(new URL(path, AT_ROOT).pathname).toBe(route)
    }
  })

  it('stays inside a mounted prefix, which is what the tunnel needs', () => {
    expect(new URL(AGENT_PROMPT_CLIENT_API.tree, UNDER_TUNNEL).pathname).toBe(
      `/s/ab12${AGENT_PROMPT_API.tree}`,
    )
  })

  it('derives every client route from its host route', () => {
    for (const [name, path] of Object.entries(AGENT_PROMPT_CLIENT_API)) {
      expect(path).toBe(clientPath(AGENT_PROMPT_API[name as keyof typeof AGENT_PROMPT_API]))
    }
  })
})

describe('the absolute path it replaced', () => {
  it('escapes the mount, which is why the panel could read an HTML page', () => {
    expect(new URL(AGENT_PROMPT_API.tree, UNDER_TUNNEL).pathname).toBe(AGENT_PROMPT_API.tree)
  })
})
