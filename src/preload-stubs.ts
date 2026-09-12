import { ipcRenderer } from 'electron'

export function createChromeExtPreload() {
  return {
    chromeExt: {
      install: (args: unknown) => ipcRenderer.invoke('chromeExt:install', args),
      uninstall: (args: unknown) => ipcRenderer.invoke('chromeExt:uninstall', args),
      toggle: (args: unknown) => ipcRenderer.invoke('chromeExt:toggle', args),
      list: () => ipcRenderer.invoke('chromeExt:list'),
      update: (args: unknown) => ipcRenderer.invoke('chromeExt:update', args),
      updateAll: () => ipcRenderer.invoke('chromeExt:updateAll'),
      loadIntoPartition: (args: unknown) => ipcRenderer.invoke('chromeExt:loadIntoPartition', args),
      resolvePopupUrl: (args: unknown) => ipcRenderer.invoke('chromeExt:resolvePopupUrl', args),
      openPopup: (args: unknown) => ipcRenderer.invoke('chromeExt:openPopup', args),
    },
    cdpExtensions: {
      openExtensionManager: (opts: unknown) => ipcRenderer.invoke('cdp:openExtensionManager', opts),
      openExtensionPopup: (opts: unknown) => ipcRenderer.invoke('cdp:openExtensionPopup', opts),
      listExtensions: (opts: unknown) => ipcRenderer.invoke('cdp:listExtensions', opts),
      removeExtension: (opts: unknown) => ipcRenderer.invoke('cdp:removeExtension', opts),
    },
  }
}
