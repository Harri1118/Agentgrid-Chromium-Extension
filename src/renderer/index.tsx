import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ChromeExtMeta, CdpInstalledExtension } from '../types'
import { getChromeExtBridge, getCdpExtBridge } from './preload-bridge'
import { ExtToolbarIcon } from './ExtToolbarIcon'
import { ExtensionSidebar } from './ExtensionSidebar'
import {
  CdpExtensionToolbar,
  CdpExtensionSidebar,
  useCdpExtensions,
} from './CdpExtensionPanel'

type SlotApi = {
  registerSlotComponent: (
    slotName: string,
    extensionId: string,
    component: React.ComponentType<Record<string, unknown>>,
  ) => () => void
}

const api = (globalThis as any).__agentgrid_slot_api as SlotApi | undefined
const extensionId = (globalThis as any).__agentgrid_extension_id as string | undefined

function BrowserNavbarTrailing(props: Record<string, unknown>) {
  const partition = (props.partition as string) || ''
  const chromeExt = useMemo(() => getChromeExtBridge(), [])

  const [extensions, setExtensions] = useState<ChromeExtMeta[]>([])
  const [extPanelOpen, setExtPanelOpen] = useState(false)
  const [extInstallState, setExtInstallState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const refreshExtensions = useCallback(() => {
    if (!chromeExt) { return }

    void chromeExt.list().then(setExtensions).catch(() => {})
  }, [chromeExt])

  useEffect(() => {
    if (!partition || !chromeExt) { return }

    void chromeExt.loadIntoPartition({ partition }).catch(() => {})
    refreshExtensions()
  }, [partition, chromeExt, refreshExtensions])

  if (!chromeExt || !partition) { return null }

  const enabledExtensions = extensions.filter((e) => e.enabled)

  const handleExtIconClick = (ext: ChromeExtMeta, e: React.MouseEvent) => {
    if (!ext.popupPath || !ext.extensionDir) { return }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()

    void chromeExt.openPopup({
      partition,
      extensionDir: ext.extensionDir,
      popupPath: ext.popupPath,
      x: window.screenX + rect.right - 400,
      y: window.screenY + rect.bottom + 4,
    })
  }

  return (
    <>
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
}

function BrowserSidebar(props: Record<string, unknown>) {
  const partition = (props.partition as string) || ''
  const chromeExt = useMemo(() => getChromeExtBridge(), [])

  const [extensions, setExtensions] = useState<ChromeExtMeta[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const refreshExtensions = useCallback(() => {
    if (!chromeExt) { return }

    void chromeExt.list().then(setExtensions).catch(() => {})
  }, [chromeExt])

  useEffect(() => {
    if (!partition || !chromeExt) { return }

    refreshExtensions()
  }, [partition, chromeExt, refreshExtensions])

  if (!chromeExt || !partition || !isOpen) { return null }

  return (
    <ExtensionSidebar
      extensions={extensions}
      partition={partition}
      chromeExt={chromeExt}
      onNavigate={() => {}}
      onClose={() => setIsOpen(false)}
      onRefresh={refreshExtensions}
    />
  )
}

function CdpNavbarTrailing(props: Record<string, unknown>) {
  const workspaceId = (props.workspaceId as string) || ''
  const sessionId = (props.sessionId as string) || ''
  const cdpExt = useMemo(() => getCdpExtBridge(), [])

  const { extensions } = useCdpExtensions({
    workspaceId,
    connected: Boolean(workspaceId && cdpExt),
    cdpExt: cdpExt!,
  })

  if (!cdpExt || !workspaceId || !sessionId) { return null }

  return (
    <CdpExtensionToolbar
      extensions={extensions}
      sessionId={sessionId}
      cdpExt={cdpExt}
    />
  )
}

function CdpSidebar(props: Record<string, unknown>) {
  const workspaceId = (props.workspaceId as string) || ''
  const cdpExt = useMemo(() => getCdpExtBridge(), [])

  const { extensions, pinnedIds, setPinnedIds, refreshExtensions } = useCdpExtensions({
    workspaceId,
    connected: Boolean(workspaceId && cdpExt),
    cdpExt: cdpExt!,
  })

  const [isOpen, setIsOpen] = useState(false)

  const handleTogglePin = useCallback((ext: { id: string }) => {
    setPinnedIds((prev: Set<string>) => {
      const next = new Set(prev)

      if (next.has(ext.id)) {
        next.delete(ext.id)
      } else {
        next.add(ext.id)
      }

      return next
    })
  }, [setPinnedIds])

  if (!cdpExt || !workspaceId || !isOpen) { return null }

  return (
    <CdpExtensionSidebar
      extensions={extensions}
      workspaceId={workspaceId}
      cdpExt={cdpExt}
      pinnedIds={pinnedIds}
      onTogglePin={handleTogglePin}
      onRefresh={refreshExtensions}
      onClose={() => setIsOpen(false)}
    />
  )
}

if (api && extensionId) {
  api.registerSlotComponent('browser-navbar-trailing', extensionId, BrowserNavbarTrailing)
  api.registerSlotComponent('browser-sidebar', extensionId, BrowserSidebar)
  api.registerSlotComponent('cdp-browser-navbar-trailing', extensionId, CdpNavbarTrailing)
  api.registerSlotComponent('cdp-browser-sidebar', extensionId, CdpSidebar)
}
