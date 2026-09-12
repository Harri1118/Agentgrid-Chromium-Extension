import { useCallback, useEffect, useState, useRef, type LegacyRef } from 'react'
import type { ChromeExtMeta } from '../types'

type Props = {
  partition: string
  onNavigate?: (url: string) => void
  onClose?: () => void
}

function ExtToolbarIcon({ ext }: { ext: ChromeExtMeta }) {
  if (ext.iconDataUri) {
    return <img src={ext.iconDataUri} alt={ext.name} className="cdp-ext-toolbar-icon-img" />
  }

  return (
    <span className="cdp-ext-toolbar-icon-letter">
      {ext.name.charAt(0).toUpperCase()}
    </span>
  )
}

export default function BrowserExtensionManager({ partition, onNavigate, onClose }: Props) {
  const [extensions, setExtensions] = useState<ChromeExtMeta[]>([])
  const [activePopup, setActivePopup] = useState<ChromeExtMeta | null>(null)
  const popupRef = useRef<HTMLElement | null>(null)

  const api = (window as any).electronAPI

  const refreshExtensions = useCallback(async () => {
    const list = await api.chromeExt.list()

    setExtensions(list)
  }, [])

  useEffect(() => {
    void refreshExtensions()
  }, [refreshExtensions])

  const handleUninstall = async (extensionId: string) => {
    await api.chromeExt.uninstall({ extensionId, partition })
    await refreshExtensions()
  }

  const handleToggle = async (extensionId: string, enabled: boolean) => {
    await api.chromeExt.toggle({ extensionId, enabled })
    await refreshExtensions()
  }

  const handleExtClick = (ext: ChromeExtMeta) => {
    if (!ext.popupPath || !ext.enabled) { return }

    setActivePopup((prev) => prev?.id === ext.id ? null : ext)
  }

  const openWebStore = () => {
    if (onNavigate) {
      onNavigate('https://chromewebstore.google.com')
    }

    if (onClose) {
      onClose()
    }
  }

  const enabledExtensions = extensions.filter((ext) => ext.enabled)

  return (
    <div className="browser-ext-sidebar" onMouseDown={(e) => e.stopPropagation()}>
      <div className="browser-ext-sidebar-header">
        <span className="browser-ext-sidebar-title">Extensions</span>
        <span className="browser-ext-count">{extensions.length}</span>
        {onClose && (
          <button className="browser-ext-sidebar-close" onClick={onClose} title="Close panel">
            &times;
          </button>
        )}
      </div>

      <div className="browser-ext-sidebar-list">
        {extensions.length === 0 ? (
          <div className="browser-ext-empty-state">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25 }}>
              <path d="M14.5 4h-5V2a2 2 0 0 1 4 0v2z" />
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M3 10h18" />
            </svg>
            <span className="browser-ext-empty-label">No extensions installed</span>
            <span className="browser-ext-empty-hint">Browse the Chrome Web Store to find extensions</span>
          </div>
        ) : (
          extensions.map((ext) => (
            <div key={ext.id} className="browser-ext-card">
              <div className="browser-ext-card-icon">
                <ExtToolbarIcon ext={ext} />
              </div>
              <div className="browser-ext-card-body">
                <span className="browser-ext-card-name">{ext.name}</span>
                <span className="browser-ext-card-version">v{ext.version}</span>
              </div>
              <div className="browser-ext-card-actions">
                <label className="browser-ext-switch" title={ext.enabled ? 'Disable' : 'Enable'}>
                  <input
                    type="checkbox"
                    checked={ext.enabled}
                    onChange={() => void handleToggle(ext.id, !ext.enabled)}
                  />
                  <span className="browser-ext-switch-slider" />
                </label>
                <button
                  className="browser-ext-remove-btn"
                  onClick={() => void handleUninstall(ext.id)}
                  title="Remove"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="browser-ext-sidebar-footer">
        <button className="browser-ext-webstore-btn" onClick={openWebStore}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="currentColor" stroke="none" />
          </svg>
          Chrome Web Store
        </button>
      </div>
    </div>
  )
}

export function ExtensionToolbar({ partition }: { partition: string }) {
  const [extensions, setExtensions] = useState<ChromeExtMeta[]>([])
  const [activePopup, setActivePopup] = useState<ChromeExtMeta | null>(null)
  const popupAnchorRef = useRef<HTMLButtonElement | null>(null)

  const api = (window as any).electronAPI

  useEffect(() => {
    void api.chromeExt.list().then((list: ChromeExtMeta[]) => {
      setExtensions(list.filter((e) => e.enabled))
    })
  }, [])

  const handleExtClick = (ext: ChromeExtMeta) => {
    if (!ext.popupPath) { return }

    setActivePopup((prev) => prev?.id === ext.id ? null : ext)
  }

  if (extensions.length === 0) { return null }

  return (
    <div className="cdp-ext-toolbar">
      <div className="cdp-ext-toolbar-icons">
        {extensions.map((ext) => (
          <button
            key={ext.id}
            ref={activePopup?.id === ext.id ? popupAnchorRef : undefined}
            className={`cdp-ext-toolbar-icon${!ext.popupPath ? ' cdp-ext-toolbar-icon-disabled' : ''}${activePopup?.id === ext.id ? ' cdp-ext-toolbar-icon-active' : ''}`}
            onClick={() => handleExtClick(ext)}
            title={ext.name}
          >
            <ExtToolbarIcon ext={ext} />
          </button>
        ))}
      </div>

      {activePopup && activePopup.popupPath && (
        <ExtensionPopup
          extensionId={activePopup.id}
          popupPath={activePopup.popupPath}
          partition={partition}
          onClose={() => setActivePopup(null)}
        />
      )}
    </div>
  )
}

function ExtensionPopup({ extensionId, popupPath, partition, onClose }: {
  extensionId: string
  popupPath: string
  partition: string
  onClose: () => void
}) {
  const popupUrl = `chrome-extension://${extensionId}/${popupPath}`

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      if (!target.closest('.ext-popup-overlay')) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClick)

    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div className="ext-popup-overlay" onMouseDown={(e) => e.stopPropagation()}>
      <webview
        src={popupUrl}
        partition={partition}
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  )
}
