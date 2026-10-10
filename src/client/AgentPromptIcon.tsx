/**
 * The global-panel row glyph: a document carrying text lines, drawn in
 * `currentColor` so the sidebar's own active/idle colors apply.
 *
 * @module dsh-agent-prompt/client/AgentPromptIcon
 */

import type { ReactElement } from 'react'

/** Geometry the sidebar hands its panel rows. */
export interface AgentPromptIconProps {
  /** Requested square edge in pixels (16 in the expanded column, 18 in the rail). */
  size: number
  /** Whether this panel is the selected main panel. */
  active: boolean
}

/**
 * Render the Agent Prompt panel icon.
 * @param props - requested size and selection state.
 * @returns the inline SVG glyph.
 */
export function AgentPromptIcon({ size, active }: AgentPromptIconProps): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 1.5 : 1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3.75 1.75h5.5L12.25 4.75v9.5H3.75z" />
      <path d="M9.25 1.75v3h3" />
      <path d="M5.75 8.25h4.5" />
      <path d="M5.75 10.75h4.5" />
    </svg>
  )
}