import type { ChromeExtMeta, CdpInstalledExtension } from '../types'

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

export function getChromeExtBridge(): ChromeExtPreloadBridge {
  return (window as unknown as { electronAPI: { chromeExt: ChromeExtPreloadBridge } }).electronAPI.chromeExt
}

export function getCdpExtBridge(): CdpExtPreloadBridge {
  return (window as unknown as { electronAPI: { cdp: CdpExtPreloadBridge } }).electronAPI.cdp
}
