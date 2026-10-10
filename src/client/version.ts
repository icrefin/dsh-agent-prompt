/**
 * Version of the build this panel came from.
 *
 * Inlined by tsdown at build time, straight from this package's manifest
 * (`define` in `tsdown.config.ts`).
 *
 * It is deliberately *not* fetched from the host. The two halves of a plugin do
 * not update together: the browser bundle is re-imported as soon as its
 * revision changes, while the host half is a boot-time ESM import that keeps
 * serving what the process started with. A host-sourced tag therefore goes
 * blank the moment the client gets ahead of the running host — which is exactly
 * how this panel once rendered a bare `v`.
 *
 * The `typeof` guard keeps this module loadable where the define is absent
 * (vitest, plain Node): an undeclared identifier inside `typeof` is a string,
 * not a ReferenceError.
 *
 * @module dsh-agent-prompt/client/version
 */

declare const __DSH_AGENT_PROMPT_VERSION__: string

/** The panel's own version, or `''` when the bundle was built without one. */
export const PANEL_VERSION: string =
  typeof __DSH_AGENT_PROMPT_VERSION__ === 'string' ? __DSH_AGENT_PROMPT_VERSION__ : ''