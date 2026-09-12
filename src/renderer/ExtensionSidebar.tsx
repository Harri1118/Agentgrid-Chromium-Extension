import type { ChromeExtMeta } from '../types'
import { ExtToolbarIcon } from './ExtToolbarIcon'

type ChromeExtBridge = {
  uninstall(args: { extensionId: string; partition?: string }): Promise<{ ok: boolean; error?: string }>
  toggle(args: { extensionId: string; enabled: boolean }): Promise<{ ok: boolean; error?: string }>
}

type Props = {
  extensions: ChromeExtMeta[]
  partition: string
  chromeExt: ChromeExtBridge
  onNavigate: (url: string) => void
  onClose: () => void
  onRefresh: () => void
}

export function ExtensionSidebar({ extensions, partition, chromeExt, onNavigate, onClose, onRefresh }: Props) {
  const handleUninstall = async (extensionId: string) => {
    await chromeExt.uninstall({ extensionId, partition })
    onRefresh()
  }

  const handleToggle = async (extensionId: string, enabled: boolean) => {
    await chromeExt.toggle({ extensionId, enabled })
    onRefresh()
  }

  const openWebStore = () => {
    onNavigate('https://chromewebstore.google.com')
    onClose()
  }

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
