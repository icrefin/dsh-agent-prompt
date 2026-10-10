/**
 * Thin fetch wrappers over the host's `/api/agent-prompt` routes. Every
 * failure is normalized to an `Error` carrying the host's own message, so the
 * panel can show something better than "request failed".
 *
 * @module dsh-agent-prompt/client/api
 */

import { AGENT_PROMPT_API, type PromptFilePayload, type PromptTree } from '../protocol.ts'

/** Perform one request and unwrap the JSON body or the error message. */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const text = await response.text()
  let body: unknown
  try {
    body = text.length > 0 ? JSON.parse(text) : undefined
  } catch {
    body = undefined
  }
  if (!response.ok) {
    const message =
      body !== null && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `${String(response.status)} ${response.statusText}`
    throw new Error(message)
  }
  return body as T
}

/** Read the global + per-workspace instruction file tree. */
export function fetchTree(): Promise<PromptTree> {
  return request<PromptTree>(AGENT_PROMPT_API.tree)
}

/** Read one instruction file. */
export function fetchFile(key: string): Promise<PromptFilePayload> {
  return request<PromptFilePayload>(`${AGENT_PROMPT_API.file}?key=${encodeURIComponent(key)}`)
}

/** Write one instruction file; the response carries the fresh file state. */
export function saveFile(key: string, content: string): Promise<PromptFilePayload> {
  return request<PromptFilePayload>(AGENT_PROMPT_API.file, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key, content }),
  })
}