import { useCallback, useEffect, useRef, useState } from 'react'

type ChromeExtMeta = {
  id: string
  name: string
  version: string
  enabled: boolean
}

type Props = {
  partition: string
}

type InstallState = 'idle' | 'loading' | 'success' | 'error'

export default function BrowserExtensionManager({ partition }: Props) {
  const [open, setOpen] = useState(false)
  const [extensions, setExtensions] = useState<ChromeExtMeta[]>([])
  const [installInput, setInstallInput] = useState('')
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

  const extractExtensionId = (input: string): string | null => {
    const trimmed = input.trim()

    const urlMatch = /(?:chrome\.google\.com\/webstore|chromewebstore\.google\.com)\/detail\/[^/]*\/([a-z]{32})/.exec(trimmed)

    if (urlMatch) { return urlMatch[1] ?? null }

    const idMatch = /^[a-z]{32}$/.exec(trimmed)

    if (idMatch) { return idMatch[0] }

    return null
  }

  const handleInstall = async () => {
    const extensionId = extractExtensionId(installInput)

    if (!extensionId) {
      setInstallState('error')
      setInstallError('Enter a valid extension ID or Chrome Web Store URL')

      return
    }

    setInstallState('loading')
    setInstallError('')

    const result = await api.chromeExt.install({ extensionId, partition })

    if (!result.ok) {
      setInstallState('error')
      setInstallError(result.error ?? 'Install failed')

      return
    }

    setInstallState('success')
    setInstallInput('')
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

  return (
    <div ref={panelRef} className="browser-ext-manager" onMouseDown={(e) => e.stopPropagation()}>
      <button
        className="browser-nav-btn"
        onClick={() => setOpen(!open)}
        title="Extensions"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <path d="M10 10.5a2.5 2.5 0 0 1 5 0V12h-5v-1.5z" />
          <circle cx="12.5" cy="16" r="2.5" />
        </svg>
      </button>

      {open && (
        <div className="browser-ext-panel">
          <div className="browser-ext-panel-header">Extensions</div>

          <div className="browser-ext-install-row">
            <input
              className="browser-ext-install-input"
              placeholder="Extension ID or Web Store URL"
              value={installInput}
              onChange={(e) => { setInstallInput(e.target.value); setInstallState('idle') }}
              onKeyDown={(e) => { if (e.key === 'Enter') { void handleInstall() } }}
            />
            <button
              className="browser-ext-install-btn"
              onClick={() => void handleInstall()}
              disabled={installState === 'loading'}
            >
              {installState === 'loading' ? '...' : 'Install'}
            </button>
          </div>

          {installState === 'error' && (
            <div className="browser-ext-error">{installError}</div>
          )}
          {installState === 'success' && (
            <div className="browser-ext-success">Installed! Reload page to activate.</div>
          )}

          <div className="browser-ext-list">
            {extensions.length === 0 && (
              <div className="browser-ext-empty">No extensions installed</div>
            )}
            {extensions.map((ext) => (
              <div key={ext.id} className="browser-ext-item">
                <div className="browser-ext-item-info">
                  <span className="browser-ext-item-name">{ext.name}</span>
                  <span className="browser-ext-item-version">v{ext.version}</span>
                </div>
                <div className="browser-ext-item-actions">
                  <button
                    className={`browser-ext-toggle ${ext.enabled ? 'enabled' : ''}`}
                    onClick={() => void handleToggle(ext.id, !ext.enabled)}
                    title={ext.enabled ? 'Disable' : 'Enable'}
                  >
                    {ext.enabled ? 'On' : 'Off'}
                  </button>
                  <button
                    className="browser-ext-remove"
                    onClick={() => void handleUninstall(ext.id)}
                    title="Uninstall"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="browser-ext-tip">
            Tip: Browse chrome.google.com/webstore, copy the extension URL, and paste above.
          </div>
        </div>
      )}
    </div>
  )
}
