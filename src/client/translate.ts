/**
 * The panel's translate seat. The framework injects a namespace-bound `t`;
 * every child component accepts exactly this shape so the panel can pass it
 * down without repeating the framework's generic machinery.
 *
 * @module dsh-agent-prompt/client/translate
 */

import type { en } from './locales.ts'

/** Translate one Agent Prompt dictionary key. */
export type PanelTranslate = (key: keyof typeof en) => string