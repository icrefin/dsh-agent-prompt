/**
 * The version tag's one non-obvious property: this module must load where the
 * build-time define is absent. An undeclared identifier inside `typeof` is the
 * string `'undefined'`, not a ReferenceError, and that is what keeps the module
 * importable under vitest and plain Node; a bare reference would throw here.
 *
 * The *inlined* value is covered by `tools/preview.mjs`, which fails the render
 * when the built bundle does not carry the current manifest version.
 */

import { describe, expect, it } from 'vitest'
import { PANEL_VERSION } from '../src/client/version.ts'

describe('PANEL_VERSION', () => {
  it('is a string even when the build-time define is missing', () => {
    expect(typeof PANEL_VERSION).toBe('string')
  })

  it('falls back to empty rather than producing a bare "v"', () => {
    expect(PANEL_VERSION).toBe('')
  })
})