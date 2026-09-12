import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import type { ChromeExtMeta } from '../types'
import { ExtToolbarIcon } from './ExtToolbarIcon'
import { ExtensionSidebar } from './ExtensionSidebar'

type ChromeExtBridge = {
  install(args: { extensionId: string; partition?: string }): Promise<{ ok: boolean; extension?: ChromeExtMeta; error?: string }>
  uninstall(args: { extensionId: string; partition?: string }): Promise<{ ok: boolean; error?: string }>
  toggle(args: { extensionId: string; enabled: boolean }): Promise<{ ok: boolean; error?: string }>
  list(): Promise<ChromeExtMeta[]>
  loadIntoPartition(args: { partition: string }): Promise<{ ok: boolean; loaded?: number; error?: string }>
  openPopup(args: { partition: string; extensionDir: string; popupPath: string; x: number; y: number }): Promise<{ ok: boolean; error?: string }>
}

type Props = {
  partition: string
  chromeExt: ChromeExtBridge
  currentUrl: string
  onNavigate: (url: string) => void
}

export function useBrowserExtensions({ partition, chromeExt }: { partition: string; chromeExt: ChromeExtBridge }) {
  const [extensions, setExtensions] = useState<ChromeExtMeta[]>([])
  const [extPanelOpen, setExtPanelOpen] = useState(false)
  const [extInstallState, setExtInstallState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const refreshExtensions = useCallback(() => {
    void chromeExt.list().then(setExtensions).catch(() => {})
  }, [chromeExt])

  useEffect(() => {
    if (!partition) { return }

    void chromeExt.loadIntoPartition({ partition }).catch(() => {})
    refreshExtensions()
  }, [partition, chromeExt, refreshExtensions])

  return {
    extensions,
    extPanelOpen,
    setExtPanelOpen,
    extInstallState,
    setExtInstallState,
    refreshExtensions,
  }
}

export function BrowserExtNavbar({ partition, chromeExt, currentUrl, onNavigate }: Props) {
  const {
    extensions,
    extPanelOpen,
    setExtPanelOpen,
    extInstallState,
    setExtInstallState,
    refreshExtensions,
  } = useBrowserExtensions({ partition, chromeExt })

  const webStoreExtensionId = useMemo(() => {
    const match = /chromewebstore\.google\.com\/detail\/[^/]+\/([a-z]{32})/.exec(currentUrl)

    return match?.[1] ?? null
  }, [currentUrl])

  const handleInstallFromWebStore = useCallback(async () => {
    if (!webStoreExtensionId || !partition) { return }

    setExtInstallState('loading')

    try {
      const result = await chromeExt.install({ extensionId: webStoreExtensionId, partition })

      if (result.ok) {
        setExtInstallState('done')
        refreshExtensions()
        setTimeout(() => setExtInstallState('idle'), 3000)
      } else {
        setExtInstallState('error')
        setTimeout(() => setExtInstallState('idle'), 3000)
      }
    } catch {
      setExtInstallState('error')
      setTimeout(() => setExtInstallState('idle'), 3000)
    }
  }, [webStoreExtensionId, partition, chromeExt, refreshExtensions, setExtInstallState])

  const handleExtIconClick = (ext: ChromeExtMeta, e: React.MouseEvent) => {
    if (!ext.popupPath || !ext.extensionDir || !partition) { return }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const screenX = window.screenX + rect.right - 400
    const screenY = window.screenY + rect.bottom + 4

    void chromeExt.openPopup({
      partition,
      extensionDir: ext.extensionDir,
      popupPath: ext.popupPath,
      x: screenX,
      y: screenY,
    })
  }

  const enabledExtensions = extensions.filter((e) => e.enabled)

  const installButtonLabel = extInstallState === 'loading' ? 'Installing...'
    : extInstallState === 'done' ? 'Installed'
      : extInstallState === 'error' ? 'Failed'
        : 'Add to AgentGrid'

  const renderTrailing = (): ReactNode => (
    <>
      {webStoreExtensionId && extInstallState !== 'done' && (
        <button
          className="browser-ext-install-inline-btn"
          onClick={() => void handleInstallFromWebStore()}
          disabled={extInstallState === 'loading'}
          title="Install this extension into AgentGrid"
        >
          {extInstallState !== 'loading' && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
          {installButtonLabel}
        </button>
      )}
      {extInstallState === 'done' && (
        <span className="browser-ext-install-done-badge">Installed</span>
      )}
      {enabledExtensions.map((ext) => (
        <button
          key={ext.id}
          className={`cdp-ext-toolbar-icon${!ext.popupPath ? ' cdp-ext-toolbar-icon-disabled' : ''}`}
          onClick={(e) => handleExtIconClick(ext, e)}
          title={ext.name}
        >
          <ExtToolbarIcon ext={ext} />
        </button>
      ))}
      <button
        className={`browser-nav-btn${extPanelOpen ? ' browser-nav-btn-active' : ''}`}
        onClick={() => setExtPanelOpen((v) => !v)}
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

  return {
    trailing: renderTrailing(),
    extPanelOpen,
    extensionSidebar: extPanelOpen && partition ? (
      <ExtensionSidebar
        extensions={extensions}
        partition={partition}
        chromeExt={chromeExt}
        onNavigate={onNavigate}
        onClose={() => setExtPanelOpen(false)}
        onRefresh={refreshExtensions}
      />
    ) : null,
  }
}
