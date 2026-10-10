/**
 * The panel's stylesheet, injected once per document. Plain CSS with an `ap-`
 * prefix (no CSS-module build step) and only theme tokens plus fallbacks, so
 * it follows light/dark automatically.
 *
 * @module dsh-agent-prompt/client/styles
 */

import { useEffect } from 'react'

/** Id of the injected `<style>` element. */
const STYLE_ID = 'dsh-agent-prompt-styles'

/** Live panel count, so the stylesheet leaves with the last panel. */
let refCount = 0

export const PANEL_CSS = `
.ap-page{display:flex;flex-direction:column;box-sizing:border-box;height:100%;min-height:0;color:var(--dsw-alias-label-primary);color-scheme:light dark}
.ap-head{flex:none;padding:28px clamp(24px,4vw,48px) 12px;border-bottom:1px solid var(--dsw-alias-border-l1)}
[data-platform=darwin] .ap-head{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}
.ap-title{margin:0;font-size:20px;font-weight:500;line-height:28px}
.ap-intro{margin:4px 0 0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}
.ap-version{font-size:12px;font-weight:500;color:var(--dsw-alias-label-caption);margin-left:6px;white-space:nowrap;font-variant-numeric:tabular-nums}
.ap-body{display:flex;flex:1 1 auto;min-height:0}

.ap-tree{display:flex;flex-direction:column;flex:none;width:300px;min-height:0;border-right:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.ap-treeHead{flex:none;padding:12px 12px 8px}
.ap-filter{box-sizing:border-box;width:100%;height:30px;padding:0 10px;font:inherit;font-size:13px;color:inherit;background:var(--dsw-alias-bg-module-platform);border:1px solid var(--dsw-alias-border-l2);border-radius:8px}
.ap-filter:focus-visible{outline:2px solid var(--dsw-alias-brand-primary)}
.ap-treeScroll{flex:1 1 auto;min-height:0;overflow:auto;padding:0 8px 16px}
.ap-group{margin-top:6px}
.ap-groupTitle{padding:8px 6px 4px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}
.ap-item{display:block;box-sizing:border-box;width:100%;padding:7px 10px;text-align:left;font:inherit;color:inherit;background:none;border:1px solid transparent;border-radius:8px;cursor:pointer}
.ap-item:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ap-item[aria-current=page]{background:var(--dsw-alias-interactive-bg-active);border-color:var(--dsw-alias-border-l2)}
.ap-itemRow{display:flex;align-items:center;gap:6px}
.ap-itemName{flex:1 1 auto;min-width:0;font-size:13px;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ap-itemPath{margin-top:2px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ap-dot{flex:none;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-idle-primary)}
.ap-dot[data-state=new]{background:transparent;border:1px solid var(--dsw-alias-state-idle-primary)}
.ap-dot[data-state=dirty]{background:var(--dsw-alias-state-warn-primary)}
.ap-dot[data-state=missing]{background:var(--dsw-alias-state-error-primary)}
.ap-empty{padding:10px 8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}

.ap-editor{display:flex;flex:1 1 auto;flex-direction:column;min-width:0;min-height:0}
.ap-fileBar{display:flex;flex:none;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.ap-filePath{flex:1 1 auto;min-width:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ap-badge{flex:none;padding:1px 8px;font-size:11px;line-height:16px;border-radius:999px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-module-platform)}
.ap-badge[data-tone=warn]{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 10%,transparent)}
.ap-badge[data-tone=ok]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 10%,transparent)}
.ap-badge[data-tone=error]{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent)}

.ap-toolbar{display:flex;flex:none;align-items:center;gap:6px;padding:8px 16px;border-bottom:1px solid var(--dsw-alias-border-l1);overflow-x:auto}
.ap-tool{flex:none;height:28px;padding:0 10px;font:inherit;font-size:12.5px;line-height:26px;color:inherit;background:none;border:0;border-radius:8px;cursor:pointer;white-space:nowrap}
.ap-tool:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.ap-tool:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}
.ap-tool:focus-visible{outline:2px solid var(--dsw-alias-brand-primary)}
.ap-tool:disabled{opacity:.45;cursor:default}
.ap-tool[data-primary=true]{color:var(--dsw-alias-label-primary-foreground);background:var(--dsw-alias-button-primary-fill);font-weight:500}
.ap-tool[data-primary=true]:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
.ap-tool[aria-pressed=true]{background:var(--dsw-alias-interactive-bg-active)}
.ap-sep{flex:none;width:1px;height:18px;margin:0 2px;background:var(--dsw-alias-border-l1)}

.ap-textareaWrap{position:relative;flex:1 1 auto;min-height:0;display:flex}
.ap-textarea{box-sizing:border-box;flex:1 1 auto;width:100%;padding:14px 16px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-3);border:0;outline:none;resize:none;tab-size:2}
.ap-textarea[data-wrap=off]{white-space:pre;overflow-x:auto}
.ap-statusBar{display:flex;flex:none;align-items:center;gap:12px;padding:6px 16px;border-top:1px solid var(--dsw-alias-border-l1);font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.ap-statusGrow{flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ap-notice{margin-left:auto;color:var(--dsw-alias-state-success-primary)}
.ap-notice[data-tone=error]{color:var(--dsw-alias-state-error-primary)}
.ap-center{display:flex;flex:1 1 auto;align-items:center;justify-content:center;padding:40px;font-size:13px;color:var(--dsw-alias-label-secondary)}
.ap-errorBox{margin:16px;padding:12px 14px;font-size:13px;line-height:20px;border-radius:12px;color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent)}
.ap-errorBox button{margin-top:8px}
`

/**
 * Inject the panel stylesheet for as long as at least one panel is mounted.
 */
export function usePanelStyles(): void {
  useEffect(() => {
    refCount += 1
    const existing = document.getElementById(STYLE_ID)
    if (existing === null) {
      const element = document.createElement('style')
      element.id = STYLE_ID
      element.textContent = PANEL_CSS
      document.head.appendChild(element)
    }
    return () => {
      refCount -= 1
      if (refCount <= 0) document.getElementById(STYLE_ID)?.remove()
    }
  }, [])
}