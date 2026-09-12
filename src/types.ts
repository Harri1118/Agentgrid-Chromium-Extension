export type ChromeExtMeta = {
  id: string
  name: string
  version: string
  description: string
  enabled: boolean
  iconPath: string | null
  popupPath: string | null
  iconDataUri: string | null
  extensionDir: string | null
}

export interface ChromeExtApi {
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

export type CdpOpenExtensionManagerOptions = { workspaceId: string }
export type CdpOpenExtensionPopupOptions = { sessionId: string; extensionId: string; popupPath: string }
export type CdpListExtensionsOptions = { workspaceId: string }
export type CdpRemoveExtensionOptions = { workspaceId: string; extensionId: string }
export type CdpInstalledExtension = {
  id: string
  name: string
  version: string
  description: string
  popupPath: string | null
  optionsPath: string | null
  iconPath: string | null
}
