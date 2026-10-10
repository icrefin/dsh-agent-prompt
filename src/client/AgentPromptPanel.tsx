/**
 * The Agent Prompt page: a left tree of the instruction files DSH loads
 * (user-global plus one per workspace) and a right pane holding a plain text
 * editor for the selected file.
 *
 * The page owns the draft and the dirty flag; the tree and the editor are
 * presentational. Every host call goes through `./api`.
 *
 * @module dsh-agent-prompt/client/AgentPromptPanel
 */

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import type { PromptFilePayload, PromptTree } from '../protocol.ts'
import { fetchFile, fetchTree, saveFile } from './api.ts'
import { PromptEditor, type EditorNotice } from './PromptEditor.tsx'
import { PromptTreeView } from './PromptTree.tsx'
import { PANEL_VERSION } from './version.ts'
import { usePanelStyles } from './styles.ts'
import type { PanelTranslate } from './translate.ts'

/** Props composed by the slot framework for this key of the `main` slot. */
export interface AgentPromptPanelProps {
  t: PanelTranslate
}

/** localStorage key remembering the last edited file. */
const LAST_KEY = 'dsh-agent-prompt:last'

/**
 * The author credit the style contract prints inside the version chip, to the
 * right of the version itself (`STYLES.md`: `"v" + version + " Author: …"`).
 */
const AUTHOR_CREDIT = 'Author: icrefin [icrefinai@gmail.com]'

/** Human-readable form of an unknown thrown value. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Render the Agent Prompt page.
 * @param props - the framework-injected translate seat.
 * @returns the panel element tree.
 */
export function AgentPromptPanel({ t }: AgentPromptPanelProps): ReactElement {
  usePanelStyles()
  const [tree, setTree] = useState<PromptTree | undefined>(undefined)
  const [treeError, setTreeError] = useState<string | undefined>(undefined)
  const [filter, setFilter] = useState('')
  const [selectedKey, setSelectedKey] = useState(() => globalThis.localStorage?.getItem(LAST_KEY) ?? 'global')
  const [file, setFile] = useState<PromptFilePayload | undefined>(undefined)
  const [draft, setDraft] = useState('')
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fileError, setFileError] = useState<string | undefined>(undefined)
  const [notice, setNotice] = useState<EditorNotice | undefined>(undefined)

  const loadTree = useCallback(async (): Promise<void> => {
    setTreeError(undefined)
    try {
      setTree(await fetchTree())
    } catch (error) {
      setTreeError(messageOf(error))
    }
  }, [])

  const loadFile = useCallback(async (key: string): Promise<void> => {
    setLoading(true)
    setFileError(undefined)
    setNotice(undefined)
    // Move the selection up front: a failed read must leave the tree pointing
    // at the row the user picked, so Retry addresses that same file.
    setSelectedKey(key)
    try {
      const payload = await fetchFile(key)
      setFile(payload)
      setDraft(payload.content)
      setDirty(false)
      try {
        globalThis.localStorage?.setItem(LAST_KEY, key)
      } catch {
        // A blocked storage backend must not break the editor.
      }
    } catch (error) {
      setFile(undefined)
      setFileError(messageOf(error))
    } finally {
      setLoading(false)
    }
  }, [])

  const initialKey = useRef(selectedKey)

  useEffect(() => {
    void loadTree()
    void loadFile(initialKey.current)
  }, [loadTree, loadFile])

  // The newest save closure, so the document-level shortcut never fires a
  // stale draft. The panel only exists while it is the active main panel, so
  // the listener cannot steal Cmd/Ctrl+S from anywhere else.
  const saveRef = useRef<() => void>(() => {})

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key !== 's' || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return
      event.preventDefault()
      saveRef.current()
    }
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
    }
  }, [])

  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent): void => {
      event.preventDefault()
    }
    globalThis.addEventListener('beforeunload', handler)
    return () => {
      globalThis.removeEventListener('beforeunload', handler)
    }
  }, [dirty])

  const select = (key: string): void => {
    if (key === selectedKey && file !== undefined && fileError === undefined) return
    if (dirty && !globalThis.confirm(t('discardConfirm'))) return
    void loadFile(key)
  }

  const save = async (): Promise<void> => {
    if (file === undefined || saving) return
    setSaving(true)
    setNotice(undefined)
    try {
      const payload = await saveFile(file.key, draft)
      setFile(payload)
      setDraft(payload.content)
      setDirty(false)
      setNotice({ tone: 'ok', text: t('saved') })
      void loadTree()
    } catch (error) {
      setNotice({ tone: 'error', text: `${t('saveFailed')} ${messageOf(error)}` })
    } finally {
      setSaving(false)
    }
  }

  saveRef.current = () => {
    void save()
  }

  const change = (value: string): void => {
    setDraft(value)
    setDirty(file !== undefined && value !== file.content)
  }

  const right = (): ReactElement => {
    if (fileError !== undefined) {
      return (
        <div className="ap-center">
          <div className="ap-errorBox">
            {t('readFailed')} {fileError}
            <div>
              <button type="button" className="ap-tool" onClick={() => void loadFile(selectedKey)}>
                {t('retry')}
              </button>
            </div>
          </div>
        </div>
      )
    }
    if (file === undefined) {
      return <div className="ap-center">{loading ? t('loading') : t('selectPrompt')}</div>
    }
    return (
      <PromptEditor
        t={t}
        file={file}
        value={draft}
        dirty={dirty}
        saving={saving}
        historyKey={`${file.key}:${String(file.mtimeMs ?? 'new')}`}
        notice={notice}
        onChange={change}
        onSave={() => {
          void saveRef.current()
        }}
        onReload={() => {
          void loadFile(file.key)
        }}
      />
    )
  }

  return (
    <div className="ap-page">
      <header className="ap-head">
        <h1 className="ap-title">
          {t('title')}
          {PANEL_VERSION === '' ? null : <span className="ap-version">{`v${PANEL_VERSION} ${AUTHOR_CREDIT}`}</span>}
        </h1>
        <p className="ap-intro">{t('intro')}</p>
      </header>
      {tree === undefined ? (
        <div className="ap-center">
          {treeError === undefined ? (
            t('loadingTree')
          ) : (
            <div className="ap-errorBox">
              {t('loadFailed')} {treeError}
              <div>
                <button type="button" className="ap-tool" onClick={() => void loadTree()}>
                  {t('retry')}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="ap-body">
          <PromptTreeView
            t={t}
            tree={tree}
            filter={filter}
            selectedKey={selectedKey}
            dirtyKey={dirty ? selectedKey : undefined}
            onSelect={select}
            onFilterChange={setFilter}
          />
          {right()}
        </div>
      )}
    </div>
  )
}