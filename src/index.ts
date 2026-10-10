/**
 * dsh-agent-prompt — host half.
 *
 * Mounts the `/api/agent-prompt` route family, which lists the user-global
 * (`$DSH_HOME/AGENTS.md`) and per-workspace (`<project root>/AGENTS.md`)
 * instruction files DSH's agent-instructions loader reads, and reads or writes
 * one of them. The browser half (`./client`) is the left-sidebar panel that
 * drives these routes.
 *
 * The workspace registry is read through `ctx.get` rather than a hard inject:
 * the routes still mount without it, the global file still works, and only the
 * per-workspace targets answer 503.
 *
 * @module dsh-agent-prompt
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-workspace'
import { makeRoutes } from './routes.ts'

/** Plugin name used by the loader row and the log lines. */
export const name = 'agent-prompt'

/** Hard dependencies: the route table is the plugin's whole host surface. */
export const inject = ['webServer']

/**
 * Mount the Agent Prompt routes and drop them again on teardown.
 * @param ctx - host plugin context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => {
    const disposers = makeRoutes(ctx).map((route) => ctx.webServer.register(route))
    ctx.logger.info('[dsh-agent-prompt] /api/agent-prompt routes mounted')
    return () => {
      for (const dispose of disposers) dispose()
    }
  }, 'dsh-agent-prompt: routes')
}