import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react'
import type { ChromeExtMeta } from '../types'
import { getChromeExtBridge } from './preload-bridge'
import { ExtToolbarIcon } from './ExtToolbarIcon'
import { ExtensionSidebar } from './ExtensionSidebar'

type SlotApi = {
  registerSlotComponent: (
    slotName: string,
    extensionId: string,
    component: React.ComponentType<Record<string, unknown>>,
  ) => () => void
}

const api = (globalThis as any).__agentgrid_slot_api as SlotApi | undefined
const extId = (globalThis as any).__agentgrid_extension_id as string | undefined

// ---------------------------------------------------------------------------
// Shared state store keyed by paneId so navbar + sidebar slots communicate
// ---------------------------------------------------------------------------

type PopupInfo = { extensionId: string; popupUrl: string; chromeExtUrl: string; preload: string | null; partition: string | null }

type PaneState = { panelOpen: boolean; popup: PopupInfo | null }

const defaultState: PaneState = { panelOpen: false, popup: null }
const paneStates = new Map<string, PaneState>()
const stateListeners = new Set<() => void>()

function getPaneState(paneId: string): PaneState {
  return paneStates.get(paneId) ?? defaultState
}

function updatePaneState(paneId: string, patch: Partial<PaneState>): void {
  const prev = getPaneState(paneId)

  paneStates.set(paneId, { ...prev, ...patch })

  for (const fn of stateListeners) fn()
}

function subscribeState(fn: () => void): () => void {
  stateListeners.add(fn)

  return () => { stateListeners.delete(fn) }
}

function usePanelOpen(paneId: string): boolean {
  return useSyncExternalStore(subscribeState, () => getPaneState(paneId).panelOpen)
}

function usePopup(paneId: string): PopupInfo | null {
  return useSyncExternalStore(subscribeState, () => getPaneState(paneId).popup)
}

// ---------------------------------------------------------------------------
// Hook: manage chrome extensions for a partition
// ---------------------------------------------------------------------------

function useBrowserExtensions(partition: string) {
  const chromeExt = useMemo(() => getChromeExtBridge(), [])
  const [extensions, setExtensions] = useState<ChromeExtMeta[]>([])

  const refreshExtensions = useCallback(() => {
    if (!chromeExt) { return }

    void chromeExt.list().then(setExtensions).catch(() => {})
  }, [chromeExt])

  useEffect(() => {
    if (!partition || !chromeExt) { return }

    void chromeExt.loadIntoPartition({ partition }).catch(() => {})
    refreshExtensions()
  }, [partition, chromeExt, refreshExtensions])

  return { chromeExt, extensions, refreshExtensions }
}

// ---------------------------------------------------------------------------
// Hook: watch webview URL for Chrome Web Store install detection
// ---------------------------------------------------------------------------

function useWebviewUrl(webviewRef: { current: unknown } | undefined): string {
  const [url, setUrl] = useState('')

  useEffect(() => {
    const wv = webviewRef?.current as any

    if (!wv?.addEventListener) { return }

    const handler = (e: any) => setUrl(e.url ?? '')

    wv.addEventListener('did-navigate', handler)
    wv.addEventListener('did-navigate-in-page', handler)

    if (wv.getURL) {
      try { setUrl(wv.getURL()) } catch {}
    }

    return () => {
      wv.removeEventListener('did-navigate', handler)
      wv.removeEventListener('did-navigate-in-page', handler)
    }
  }, [webviewRef])

  return url
}

// ---------------------------------------------------------------------------
// Slot: browser-navbar-trailing
// ---------------------------------------------------------------------------

function BrowserNavbarTrailing(props: Record<string, unknown>) {
  const paneId = (props.paneId as string) || ''
  const partition = (props.partition as string) || ''
  const webviewRef = props.webviewRef as { current: unknown } | undefined
  const chromeExt = useMemo(() => getChromeExtBridge(), [])

  const [extensions, setExtensions] = useState<ChromeExtMeta[]>([])
  const [installState, setInstallState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const panelOpen = usePanelOpen(paneId)
  const currentUrl = useWebviewUrl(webviewRef)

  const refreshExtensions = useCallback(() => {
    if (!chromeExt) { return }

    void chromeExt.list().then(setExtensions).catch(() => {})
  }, [chromeExt])

  useEffect(() => {
    if (!partition || !chromeExt) { return }

    void chromeExt.loadIntoPartition({ partition }).catch(() => {})
    refreshExtensions()
  }, [partition, chromeExt, refreshExtensions])

  const webStoreExtensionId = useMemo(() => {
    const match = /chromewebstore\.google\.com\/detail\/[^/]+\/([a-z]{32})/.exec(currentUrl)

    return match?.[1] ?? null
  }, [currentUrl])

  const handleInstall = useCallback(async () => {
    if (!webStoreExtensionId || !partition || !chromeExt) { return }

    setInstallState('loading')

    try {
      const result = await chromeExt.install({ extensionId: webStoreExtensionId, partition })

      if (result.ok) {
        setInstallState('done')
        refreshExtensions()
        setTimeout(() => setInstallState('idle'), 3000)
      } else {
        setInstallState('error')
        setTimeout(() => setInstallState('idle'), 3000)
      }
    } catch {
      setInstallState('error')
      setTimeout(() => setInstallState('idle'), 3000)
    }
  }, [webStoreExtensionId, partition, chromeExt, refreshExtensions])

  const handleExtIconClick = (ext: ChromeExtMeta) => {
    if (!ext.popupPath || !ext.extensionDir || !partition || !chromeExt) { return }

    const currentPopup = getPaneState(paneId).popup

    if (currentPopup?.extensionId === ext.id) {
      updatePaneState(paneId, { popup: null })

      return
    }

    void chromeExt.resolvePopupUrl({
      partition,
      extensionDir: ext.extensionDir,
      popupPath: ext.popupPath,
    }).then((result: any) => {
      console.log('[ext-popup] resolvePopupUrl result:', result)

      if (result.ok && result.url) {
        updatePaneState(paneId, {
          popup: {
            extensionId: ext.id,
            popupUrl: result.url,
            chromeExtUrl: result.extensionUrl || '',
            preload: result.preload || null,
            partition: result.partition || null,
          },
        })
      }
    })
  }

  if (!chromeExt || !partition) { return null }

  const enabledExtensions = extensions.filter((e) => e.enabled)

  const installButtonLabel = installState === 'loading' ? 'Installing...'
    : installState === 'done' ? 'Installed'
      : installState === 'error' ? 'Failed'
        : 'Add to AgentGrid'

  return (
    <>
      {webStoreExtensionId && installState !== 'done' && (
        <button
          className="browser-ext-install-inline-btn"
          onClick={() => void handleInstall()}
          disabled={installState === 'loading'}
          title="Install this extension into AgentGrid"
        >
          {installState !== 'loading' && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
          {installButtonLabel}
        </button>
      )}
      {installState === 'done' && (
        <span className="browser-ext-install-done-badge">Installed</span>
      )}
      {enabledExtensions.map((ext) => (
        <button
          key={ext.id}
          className={`cdp-ext-toolbar-icon${!ext.popupPath ? ' cdp-ext-toolbar-icon-disabled' : ''}`}
          onClick={() => handleExtIconClick(ext)}
          title={ext.name}
        >
          <ExtToolbarIcon ext={ext} />
        </button>
      ))}
      <button
        className={`browser-nav-btn${panelOpen ? ' browser-nav-btn-active' : ''}`}
        onClick={() => updatePaneState(paneId, { panelOpen: !panelOpen })}
        title="Extensions"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 4h-5V2a2 2 0 0 1 4 0v2z" />
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M3 10h18" />
          <rect x="7" y="14" width="4" height="4" rx="1" />
          <rect x="13" y="14" width="4" height="4" rx="1" />
        </svg>
      </button>
    </>
  )
}

// ---------------------------------------------------------------------------
// Slot: browser-sidebar
// ---------------------------------------------------------------------------

function BrowserSidebar(props: Record<string, unknown>) {
  const paneId = (props.paneId as string) || ''
  const partition = (props.partition as string) || ''
  const panelOpen = usePanelOpen(paneId)
  const { chromeExt, extensions, refreshExtensions } = useBrowserExtensions(partition)

  if (!chromeExt || !partition || !panelOpen) { return null }

  return (
    <ExtensionSidebar
      extensions={extensions}
      partition={partition}
      chromeExt={chromeExt}
      onNavigate={() => {}}
      onClose={() => updatePaneState(paneId, { panelOpen: false })}
      onRefresh={refreshExtensions}
    />
  )
}

// ---------------------------------------------------------------------------
// Slot: browser-popup-overlay
// ---------------------------------------------------------------------------

function ExtensionPopupOverlay(props: Record<string, unknown>) {
  const paneId = (props.paneId as string) || ''
  const partition = (props.partition as string) || ''
  const popup = usePopup(paneId)

  useEffect(() => {
    if (!popup) { return }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { updatePaneState(paneId, { popup: null }) }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [paneId, popup])

  useEffect(() => {
    const detail = {
      paneId,
      url: popup?.popupUrl ?? null,
      preload: popup?.preload ?? null,
      partition: popup?.partition ?? null,
      width: 380,
      height: 520,
    }

    console.log('[ext-popup] dispatching plugin:webview-overlay', detail)
    window.dispatchEvent(new CustomEvent('plugin:webview-overlay', { detail }))
  }, [paneId, popup])

  if (!popup) { return null }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 50,
      }}
      onClick={() => updatePaneState(paneId, { popup: null })}
    />
  )
}

// ---------------------------------------------------------------------------
// Register all slot components
// ---------------------------------------------------------------------------

if (api && extId) {
  api.registerSlotComponent('browser-navbar-trailing', extId, BrowserNavbarTrailing)
  api.registerSlotComponent('browser-sidebar', extId, BrowserSidebar)
  api.registerSlotComponent('browser-overlay', extId, ExtensionPopupOverlay)
}
