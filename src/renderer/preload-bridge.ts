import type { ChromeExtMeta, CdpInstalledExtension } from '../types'

type PluginsApi = {
  executeCommand(args: { commandId: string; payload?: unknown }): Promise<unknown>
}

function getPluginsApi(): PluginsApi {
  return (window as unknown as { electronAPI: { plugins: PluginsApi } }).electronAPI.plugins
}

async function invokeCommand<T>(commandId: string, payload?: unknown): Promise<T> {
  return getPluginsApi().executeCommand({ commandId, payload }) as Promise<T>
}

export interface ChromeExtPreloadBridge {
  install(args: { extensionId: string; partition?: string }): Promise<{ ok: boolean; extension?: ChromeExtMeta; error?: string }>
  uninstall(args: { extensionId: string; partition?: string }): Promise<{ ok: boolean; error?: string }>
  toggle(args: { extensionId: string; enabled: boolean }): Promise<{ ok: boolean; error?: string }>
  list(): Promise<ChromeExtMeta[]>
  update(args: { extensionId: string }): Promise<{ ok: boolean; updated?: boolean; oldVersion?: string; newVersion?: string; error?: string }>
  updateAll(): Promise<{ ok: boolean; error?: string }>
  loadIntoPartition(args: { partition: string }): Promise<{ ok: boolean; loaded?: number; error?: string }>
  resolvePopupUrl(args: { partition: string; extensionDir: string; popupPath: string }): Promise<{ ok: boolean; url?: string; error?: string }>
  openPopup(args: { partition: string; extensionDir: string; popupPath: string; x: number; y: number }): Promise<{ ok: boolean; error?: string }>
}

export interface CdpExtPreloadBridge {
  openExtensionManager(options: { workspaceId: string }): Promise<{ ok: boolean; error?: string }>
  openExtensionPopup(options: { sessionId: string; extensionId: string; popupPath: string }): Promise<{ ok: boolean; error?: string }>
  listExtensions(options: { workspaceId: string }): Promise<CdpInstalledExtension[]>
  removeExtension(options: { workspaceId: string; extensionId: string }): Promise<{ ok: boolean }>
}

export function getChromeExtBridge(): ChromeExtPreloadBridge | null {
  try {
    getPluginsApi()
  } catch {
    return null
  }

  return {
    install: (args) => invokeCommand('chromeExt.install', args),
    uninstall: (args) => invokeCommand('chromeExt.uninstall', args),
    toggle: (args) => invokeCommand('chromeExt.toggle', args),
    list: () => invokeCommand('chromeExt.list'),
    update: (args) => invokeCommand('chromeExt.update', args),
    updateAll: () => invokeCommand('chromeExt.updateAll'),
    loadIntoPartition: (args) => invokeCommand('chromeExt.loadIntoPartition', args),
    resolvePopupUrl: (args) => invokeCommand('chromeExt.resolvePopupUrl', args),
    openPopup: (args) => invokeCommand('chromeExt.openPopup', args),
  }
}

export function getCdpExtBridge(): CdpExtPreloadBridge | null {
  try {
    getPluginsApi()
  } catch {
    return null
  }

  return {
    openExtensionManager: (opts) => invokeCommand('cdp.openExtensionManager', opts),
    openExtensionPopup: (opts) => invokeCommand('cdp.openExtensionPopup', opts),
    listExtensions: (opts) => invokeCommand('cdp.listExtensions', opts),
    removeExtension: (opts) => invokeCommand('cdp.removeExtension', opts),
  }
}
