/**
 * The left pane: one group for the user-global instruction file and one group
 * per registered workspace, each row showing the file's resolved path and its
 * state (present / not created / dirty / unreadable workspace).
 *
 * @module dsh-agent-prompt/client/PromptTree
 */

import type { ReactElement } from 'react'
import type { PromptTree, WorkspacePromptNode } from '../protocol.ts'
import type { PanelTranslate } from './translate.ts'

/** Props of {@link PromptTreeView}. */
export interface PromptTreeViewProps {
  t: PanelTranslate
  tree: PromptTree
  filter: string
  selectedKey: string
  /** The target key currently holding unsaved edits, when any. */
  dirtyKey?: string | undefined
  onSelect: (key: string) => void
  onFilterChange: (value: string) => void
}

/** Cell state driving the row dot. */
type RowState = 'ok' | 'new' | 'dirty' | 'missing'

/** Pick the dot state for one workspace row. */
function rowState(node: WorkspacePromptNode, dirty: boolean): RowState {
  if (!node.dirExists) return 'missing'
  if (dirty) return 'dirty'
  return node.exists ? 'ok' : 'new'
}

/** One tree row. */
function TreeRow(props: {
  rowKey: string
  name: string
  path: string
  state: RowState
  note: string | undefined
  selected: boolean
  onSelect: (key: string) => void
}): ReactElement {
  const { rowKey, name, path, state, note, selected, onSelect } = props
  return (
    <button
      type="button"
      className="ap-item"
      aria-current={selected ? 'page' : undefined}
      title={path}
      onClick={() => {
        onSelect(rowKey)
      }}
    >
      <span className="ap-itemRow">
        <span className="ap-dot" data-state={state} />
        <span className="ap-itemName">{name}</span>
      </span>
      <span className="ap-itemPath">{note ?? path}</span>
    </button>
  )
}

/**
 * Render the file tree.
 * @param props - tree data, the active filter, the selection and the callbacks.
 * @returns the left column.
 */
export function PromptTreeView({
  t,
  tree,
  filter,
  selectedKey,
  dirtyKey,
  onSelect,
  onFilterChange,
}: PromptTreeViewProps): ReactElement {
  const needle = filter.trim().toLowerCase()
  const workspaces = tree.workspaces.filter((node) => {
    if (needle.length === 0) return true
    return (
      node.workspaceTitle.toLowerCase().includes(needle) ||
      node.displayPath.toLowerCase().includes(needle) ||
      node.projectRoot.toLowerCase().includes(needle)
    )
  })

  return (
    <div className="ap-tree">
      <div className="ap-treeHead">
        <input
          className="ap-filter"
          type="search"
          value={filter}
          placeholder={t('filterPlaceholder')}
          aria-label={t('filterPlaceholder')}
          onChange={(event) => {
            onFilterChange(event.target.value)
          }}
        />
      </div>
      <div className="ap-treeScroll">
        <div className="ap-group">
          <div className="ap-groupTitle">{t('globalGroup')}</div>
          <TreeRow
            rowKey={tree.global.key}
            name={t('globalName')}
            path={tree.global.displayPath}
            state={dirtyKey === tree.global.key ? 'dirty' : tree.global.exists ? 'ok' : 'new'}
            note={`${tree.global.displayPath}${tree.global.exists ? '' : ` · ${t('notCreated')}`}`}
            selected={selectedKey === tree.global.key}
            onSelect={onSelect}
          />
        </div>
        <div className="ap-group">
          <div className="ap-groupTitle">{t('workspacesGroup')}</div>
          {workspaces.length === 0 ? (
            <div className="ap-empty">{tree.workspaces.length === 0 ? t('noWorkspaces') : t('noMatch')}</div>
          ) : (
            workspaces.map((node) => (
              <TreeRow
                key={node.key}
                rowKey={node.key}
                name={node.workspaceTitle}
                path={node.projectRoot}
                state={rowState(node, dirtyKey === node.key)}
                note={`${node.displayPath}${node.exists ? '' : ` · ${t('notCreated')}`}${node.dirExists ? '' : ` · ${t('missingDir')}`}`}
                selected={selectedKey === node.key}
                onSelect={onSelect}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}