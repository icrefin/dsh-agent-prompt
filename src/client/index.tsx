/**
 * dsh-agent-prompt — browser half.
 *
 * Contributes one row to the sidebar's global panel list (`sidebar.panellist`)
 * and the page it opens in the centre column (`main`), both keyed by
 * `agentPrompt`. Selecting the row is a layout lookup in the live `main`
 * registry, so the two registrations must share the id.
 *
 * `dsh.client.inject` in package.json orders this bundle after
 * `dsh-client-ui-sidebar` and `dsh-client-ui-layout` — the two packages that
 * declare those slots — so both `slots.inject` calls resolve.
 *
 * @module dsh-agent-prompt/client
 */

import type { SlotCore, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only imports for their declaration merging: these are the packages that
// declare `main` and `sidebar.panellist` in SlotMap.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { AgentPromptIcon } from './AgentPromptIcon.tsx'
import { AgentPromptPanel } from './AgentPromptPanel.tsx'
import { en, zh } from './locales.ts'
import type { PanelTranslate } from './translate.ts'

/** Dictionary namespace owned by this plugin. */
export const NS = 'agentPrompt'

/** The id shared by the sidebar row and the main panel it opens. */
export const PANEL_ID = 'agentPrompt'

/** Services required by the two registrations. */
export const inject = ['slots', 'locale']

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Keys of this plugin's own dictionary. */
    agentPrompt: keyof typeof en
  }
}

/** Structural face of the client locale service. */
interface LocaleService {
  register(namespace: 'agentPrompt', dictionaries: { en: typeof en; zh: typeof zh }): () => void
  bind(namespace: 'agentPrompt'): TranslateNS<'agentPrompt'>
}

/** Structural face of the client slot service. */
interface SlotsService {
  readonly register: SlotCore['register']
  /**
   * Run `callback` once the named slot is declared; the returned disposer is
   * the registration's own disposer, so the effect teardown removes it.
   */
  inject(key: string, callback: () => () => void): () => void
}

/** Structural face of the client root context this plugin uses. */
interface ClientContext {
  effect(callback: () => (() => void) | void, label?: string): void
  slots: SlotsService
  locale: LocaleService
}

/**
 * Register the sidebar row and the page it opens.
 * @param ctx - client root context carrying the slot and locale services.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'dsh-agent-prompt: dictionaries')
  const t: PanelTranslate = ctx.locale.bind(NS)

  ctx.effect(
    () =>
      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 11,
            label: () => t('panel'),
          },
          AgentPromptIcon,
        ),
      ),
    'dsh-agent-prompt: sidebar entry',
  )

  ctx.effect(
    () =>
      ctx.slots.inject('main', () =>
        ctx.slots.register(
          { name: 'main', key: PANEL_ID, locale: NS },
          AgentPromptPanel,
        ),
      ),
    'dsh-agent-prompt: main panel',
  )
}