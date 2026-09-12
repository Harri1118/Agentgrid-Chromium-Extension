import { useState, useEffect, useCallback, type ReactNode } from 'react'
import type { CdpInstalledExtension } from '../types'

type CdpExtensionBridge = {
  openExtensionManager(options: { workspaceId: string }): Promise<{ ok: boolean; error?: string }>
  openExtensionPopup(options: { sessionId: string; extensionId: string; popupPath: string }): Promise<{ ok: boolean; error?: string }>
  listExtensions(options: { workspaceId: string }): Promise<CdpInstalledExtension[]>
  removeExtension(options: { workspaceId: string; extensionId: string }): Promise<{ ok: boolean }>
}

function loadPinnedIds(): Set<string> {
  try {
    const raw = localStorage.getItem('cdp-pinned-extensions')

    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function savePinnedIds(ids: Set<string>): void {
  localStorage.setItem('cdp-pinned-extensions', JSON.stringify([...ids]))
}

function ExtIcon({ ext }: { ext: CdpInstalledExtension }) {
  if (ext.iconPath) {
    return <img src={ext.iconPath} alt={ext.name} className="cdp-ext-toolbar-icon-img" />
  }

  return (
    <span className="cdp-ext-toolbar-icon-letter">
      {ext.name.charAt(0).toUpperCase()}
    </span>
  )
}

type Props = {
  workspaceId: string
  sessionId: string
  connected: boolean
  cdpExt: CdpExtensionBridge
}

export function useCdpExtensions({ workspaceId, connected, cdpExt }: Omit<Props, 'sessionId'>) {
  const [extensions, setExtensions] = useState<CdpInstalledExtension[]>([])
  const [extSidebarOpen, setExtSidebarOpen] = useState(false)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(loadPinnedIds)

  useEffect(() => {
    if (!connected) { return }

    void cdpExt.listExtensions({ workspaceId }).then(setExtensions)
  }, [connected, workspaceId, cdpExt])

  const refreshExtensions = useCallback(() => {
    void cdpExt.listExtensions({ workspaceId }).then(setExtensions)
  }, [workspaceId, cdpExt])

  return {
    extensions,
    extSidebarOpen,
    setExtSidebarOpen,
    pinnedIds,
    setPinnedIds,
    refreshExtensions,
  }
}

export function CdpExtensionToolbar({ extensions, sessionId, cdpExt, onOpenPopup }: {
  extensions: CdpInstalledExtension[]
  sessionId: string
  cdpExt: CdpExtensionBridge
  onOpenPopup?: (ext: CdpInstalledExtension) => void
}): ReactNode {
  if (extensions.length === 0) { return null }

  const handleOpenPopup = (ext: CdpInstalledExtension) => {
    if (!ext.popupPath) { return }

    if (onOpenPopup) {
      onOpenPopup(ext)

      return
    }

    void cdpExt.openExtensionPopup({
      sessionId,
      extensionId: ext.id,
      popupPath: ext.popupPath,
    })
  }

  return (
    <div className="cdp-ext-toolbar">
      <div className="cdp-ext-toolbar-icons">
        {extensions.map((ext) => (
          <button
            key={ext.id}
            className={`cdp-ext-toolbar-icon${ext.popupPath ? '' : ' cdp-ext-toolbar-icon-disabled'}`}
            onClick={() => handleOpenPopup(ext)}
            title={ext.name}
          >
            <ExtIcon ext={ext} />
          </button>
        ))}
      </div>
    </div>
  )
}

export function CdpExtensionSidebar({ extensions, workspaceId, cdpExt, pinnedIds, onTogglePin, onRefresh, onClose }: {
  extensions: CdpInstalledExtension[]
  workspaceId: string
  cdpExt: CdpExtensionBridge
  pinnedIds: Set<string>
  onTogglePin: (ext: CdpInstalledExtension) => void
  onRefresh: () => void
  onClose: () => void
}) {
  const handleRemoveExtension = useCallback((ext: CdpInstalledExtension) => {
    void cdpExt.removeExtension({ workspaceId, extensionId: ext.id }).then(() => {
      onRefresh()
    })
  }, [workspaceId, cdpExt, onRefresh])

  const handleInstallExtensions = useCallback(() => {
    onClose()
    void cdpExt.openExtensionManager({ workspaceId })
  }, [workspaceId, cdpExt, onClose])

  return (
    <div className="browser-ext-sidebar" onMouseDown={(e) => e.stopPropagation()}>
      <div className="browser-ext-sidebar-header">
        <span className="browser-ext-sidebar-title">Extensions</span>
        <span className="browser-ext-count">{extensions.length}</span>
        <button className="browser-ext-sidebar-close" onClick={onClose} title="Close panel">
          &times;
        </button>
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
            <span className="browser-ext-empty-hint">Use the buttons below to manage extensions</span>
          </div>
        ) : (
          extensions.map((ext) => (
            <div key={ext.id} className="browser-ext-card" title={ext.description}>
              <div className="browser-ext-card-icon">
                <ExtIcon ext={ext} />
              </div>
              <div className="browser-ext-card-body">
                <span className="browser-ext-card-name">{ext.name}</span>
                <span className="browser-ext-card-version">v{ext.version}</span>
              </div>
              <div className="browser-ext-card-actions">
                <button
                  className={`browser-ext-pin-btn${pinnedIds.has(ext.id) ? ' browser-ext-pin-btn-active' : ''}`}
                  onClick={() => onTogglePin(ext)}
                  title={pinnedIds.has(ext.id) ? 'Unpin from toolbar' : 'Pin to toolbar'}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={pinnedIds.has(ext.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 17v5" />
                    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76z" />
                  </svg>
                </button>
                <button
                  className="browser-ext-remove-btn"
                  onClick={() => handleRemoveExtension(ext)}
                  title="Remove extension"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="browser-ext-sidebar-footer">
        <button className="browser-ext-webstore-btn" onClick={handleInstallExtensions}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Chrome Web Store
        </button>
      </div>
    </div>
  )
}
