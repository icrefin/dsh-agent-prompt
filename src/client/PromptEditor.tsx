/**
 * The right pane: a plain monospace textarea plus the four commands the
 * textarea cannot reach by itself — save, reload, undo/redo and a soft-wrap
 * toggle. Every clipboard action (⌘X/⌘C/⌘V/⌘A) belongs to the platform and the
 * focused textarea, so none of them gets a button.
 *
 * The textarea is deliberately not a Markdown editor: no preview, no
 * highlighting, no stored state beyond the draft the panel owns. Undo/redo is
 * a small local history (the platform's own stack cannot be driven from a
 * button), coalescing a typing burst into one step.
 *
 * @module dsh-agent-prompt/client/PromptEditor
 */

import { useEffect, useRef, useState, type ReactElement } from 'react'
import type { PromptFilePayload } from '../protocol.ts'
import type { PanelTranslate } from './translate.ts'

/** One undo snapshot: the text plus the selection to restore with it. */
interface Snapshot {
  text: string
  start: number
  end: number
}

/** A transient message shown at the right of the status bar. */
export interface EditorNotice {
  tone: 'ok' | 'error'
  text: string
}

/** Props of {@link PromptEditor}. */
export interface PromptEditorProps {
  t: PanelTranslate
  file: PromptFilePayload
  value: string
  dirty: boolean
  saving: boolean
  /** Identity of the loaded revision; changing it resets the undo history. */
  historyKey: string
  /** Message owned by the panel (load/save outcome). */
  notice?: EditorNotice | undefined
  onChange: (value: string) => void
  onSave: () => void
  onReload: () => void
}

/** Cap on retained undo steps. */
const HISTORY_LIMIT = 200

/** Typing bursts closer together than this collapse into one undo step. */
const COALESCE_MS = 700

/** localStorage key of the soft-wrap preference. */
const WRAP_KEY = 'dsh-agent-prompt:wrap'

/**
 * Render the editor pane.
 * @param props - the loaded file, the draft, its dirty/saving flags and commands.
 * @returns the editor column.
 */
export function PromptEditor(props: PromptEditorProps): ReactElement {
  const { t, file, value, dirty, saving, historyKey, notice, onChange, onSave, onReload } = props
  const textarea = useRef<HTMLTextAreaElement | null>(null)
  const past = useRef<Snapshot[]>([])
  const future = useRef<Snapshot[]>([])
  const lastTypeAt = useRef(0)
  const [, bump] = useState(0)
  const [wrap, setWrap] = useState<boolean>(() => globalThis.localStorage?.getItem(WRAP_KEY) !== 'off')

  // A new revision (first load, reload, or a completed save) starts a fresh
  // history: keeping steps across a write would let Undo silently revert to a
  // pre-save body the host never saw.
  useEffect(() => {
    past.current = []
    future.current = []
    lastTypeAt.current = 0
    bump((n) => n + 1)
  }, [historyKey])

  const selection = (): { start: number; end: number } => {
    const element = textarea.current
    if (element === null) return { start: value.length, end: value.length }
    return { start: element.selectionStart, end: element.selectionEnd }
  }

  const restore = (start: number, end: number): void => {
    globalThis.requestAnimationFrame(() => {
      const element = textarea.current
      if (element === null) return
      element.focus()
      element.setSelectionRange(start, end)
    })
  }

  const record = (): void => {
    const now = Date.now()
    const coalesce = now - lastTypeAt.current < COALESCE_MS && past.current.length > 0
    if (!coalesce) {
      const { start, end } = selection()
      past.current.push({ text: value, start, end })
      if (past.current.length > HISTORY_LIMIT) past.current.shift()
    }
    lastTypeAt.current = now
    future.current = []
  }

  const apply = (text: string, start: number, end: number): void => {
    onChange(text)
    restore(start, end)
    bump((n) => n + 1)
  }

  const undo = (): void => {
    const snapshot = past.current.pop()
    if (snapshot === undefined) return
    const { start, end } = selection()
    future.current.push({ text: value, start, end })
    lastTypeAt.current = 0
    apply(snapshot.text, snapshot.start, snapshot.end)
  }

  const redo = (): void => {
    const snapshot = future.current.pop()
    if (snapshot === undefined) return
    const { start, end } = selection()
    past.current.push({ text: value, start, end })
    lastTypeAt.current = 0
    apply(snapshot.text, snapshot.start, snapshot.end)
  }

  const toggleWrap = (): void => {
    setWrap((previous) => {
      const next = !previous
      globalThis.localStorage?.setItem(WRAP_KEY, next ? 'on' : 'off')
      return next
    })
  }

  const lines = value.length === 0 ? 1 : value.split('\n').length

  return (
    <div className="ap-editor">
      <div className="ap-fileBar">
        <span className="ap-filePath" title={file.path}>
          {file.displayPath}
        </span>
        {file.exists ? null : <span className="ap-badge" data-tone="warn">{t('notCreated')}</span>}
        {dirty ? <span className="ap-badge" data-tone="warn">{t('unsaved')}</span> : null}
      </div>
      <div className="ap-toolbar">
        <button
          type="button"
          className="ap-tool"
          data-primary="true"
          disabled={!dirty || saving}
          title={t('shortcutSave')}
          onClick={onSave}
        >
          {saving ? t('saving') : t('save')}
        </button>
        <button type="button" className="ap-tool" disabled={saving} onClick={onReload}>
          {t('reload')}
        </button>
        <span className="ap-sep" />
        <button type="button" className="ap-tool" disabled={past.current.length === 0} onClick={undo}>
          {t('undo')}
        </button>
        <button type="button" className="ap-tool" disabled={future.current.length === 0} onClick={redo}>
          {t('redo')}
        </button>
        <span className="ap-sep" />
        <button type="button" className="ap-tool" aria-pressed={wrap} onClick={toggleWrap}>
          {t('wrap')}
        </button>
      </div>
      <div className="ap-textareaWrap">
        <textarea
          ref={textarea}
          className="ap-textarea"
          data-wrap={wrap ? 'on' : 'off'}
          wrap={wrap ? 'soft' : 'off'}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label={file.displayPath}
          placeholder={t('editorPlaceholder')}
          value={value}
          onChange={(event) => {
            record()
            onChange(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 's' && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
              event.preventDefault()
              onSave()
            }
          }}
        />
      </div>
      <div className="ap-statusBar">
        <span>
          {lines} {t('lines')}
        </span>
        <span>
          {value.length} {t('chars')}
        </span>
        <span className="ap-statusGrow">{dirty ? t('unsaved') : t('saved')}</span>
        {notice === undefined ? null : (
          <span className="ap-notice" data-tone={notice.tone}>
            {notice.text}
          </span>
        )}
      </div>
    </div>
  )
}