import { useCallback, useEffect, useRef, useState } from 'react'

type ChromeExtMeta = {
  id: string
  name: string
  version: string
  enabled: boolean
}

type Props = {
  partition: string
  onNavigate?: (url: string) => void
}

type InstallState = 'idle' | 'loading' | 'success' | 'error'

export default function BrowserExtensionManager({ partition, onNavigate }: Props) {
  const [open, setOpen] = useState(false)
  const [extensions, setExtensions] = useState<ChromeExtMeta[]>([])
  const [installState, setInstallState] = useState<InstallState>('idle')
  const [installError, setInstallError] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)

  const api = (window as any).electronAPI

  const refreshExtensions = useCallback(async () => {
    const list = await api.chromeExt.list()

    setExtensions(list)
  }, [])

  useEffect(() => {
    if (!open) { return }

    void refreshExtensions()
  }, [open, refreshExtensions])

  useEffect(() => {
    if (!open) { return }

    const onClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onClickOutside)

    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const handleInstallById = async (extensionId: string) => {
    setInstallState('loading')
    setInstallError('')

    const result = await api.chromeExt.install({ extensionId, partition })

    if (!result.ok) {
      setInstallState('error')
      setInstallError(result.error ?? 'Install failed')

      return
    }

    setInstallState('success')
    await refreshExtensions()

    setTimeout(() => setInstallState('idle'), 2000)
  }

  const handleUninstall = async (extensionId: string) => {
    await api.chromeExt.uninstall({ extensionId, partition })
    await refreshExtensions()
  }

  const handleToggle = async (extensionId: string, enabled: boolean) => {
    await api.chromeExt.toggle({ extensionId, enabled })
    await refreshExtensions()
  }

  const openWebStore = () => {
    if (onNavigate) {
      onNavigate('https://chromewebstore.google.com')
      setOpen(false)
    }
  }

  return (
    <div ref={panelRef} className="browser-ext-manager" onMouseDown={(e) => e.stopPropagation()}>
      <button
        className="browser-nav-btn"
        onClick={() => setOpen(!open)}
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

      {open && (
        <div className="browser-ext-panel">
          <div className="browser-ext-panel-header">
            <span>Extensions</span>
            <span className="browser-ext-count">{extensions.length}</span>
          </div>

          {installState === 'error' && (
            <div className="browser-ext-error">{installError}</div>
          )}
          {installState === 'success' && (
            <div className="browser-ext-success">Installed! Reload page to activate.</div>
          )}
          {installState === 'loading' && (
            <div className="browser-ext-loading">Installing extension...</div>
          )}

          <div className="browser-ext-list">
            {extensions.length === 0 ? (
              <div className="browser-ext-empty-state">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                  <path d="M14.5 4h-5V2a2 2 0 0 1 4 0v2z" />
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M3 10h18" />
                </svg>
                <span>No extensions installed</span>
                <span className="browser-ext-empty-hint">Browse the Chrome Web Store to find extensions</span>
              </div>
            ) : (
              extensions.map((ext) => (
                <div key={ext.id} className="browser-ext-card">
                  <div className="browser-ext-card-icon">
                    {ext.name.charAt(0).toUpperCase()}
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

          <div className="browser-ext-footer">
            <button className="browser-ext-webstore-btn" onClick={openWebStore}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="currentColor" stroke="none" />
              </svg>
              Chrome Web Store
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
