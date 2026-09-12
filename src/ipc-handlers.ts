import { ipcMain } from 'electron'

type ExecuteCommandFn = (command: string, ...args: unknown[]) => Promise<unknown>

export function registerChromeExtIpc(executeCommand: ExecuteCommandFn): void {
  ipcMain.handle('cdp:openExtensionPopup', async (_e, args) => {
    return executeCommand('cdp.openExtensionPopup', args)
  })

  ipcMain.handle('cdp:openExtensionManager', async (_e, args) => {
    return executeCommand('cdp.openExtensionManager', args)
  })

  ipcMain.handle('cdp:listExtensions', async (_e, args) => {
    return executeCommand('cdp.listExtensions', args)
  })

  ipcMain.handle('cdp:removeExtension', async (_e, args) => {
    return executeCommand('cdp.removeExtension', args)
  })

  ipcMain.handle('chromeExt:install', async (_e, args) => {
    return executeCommand('chromeExt.install', args)
  })

  ipcMain.handle('chromeExt:uninstall', async (_e, args) => {
    return executeCommand('chromeExt.uninstall', args)
  })

  ipcMain.handle('chromeExt:toggle', async (_e, args) => {
    return executeCommand('chromeExt.toggle', args)
  })

  ipcMain.handle('chromeExt:list', async () => {
    return executeCommand('chromeExt.list')
  })

  ipcMain.handle('chromeExt:update', async (_e, args) => {
    return executeCommand('chromeExt.update', args)
  })

  ipcMain.handle('chromeExt:updateAll', async () => {
    return executeCommand('chromeExt.updateAll')
  })

  ipcMain.handle('chromeExt:loadIntoPartition', async (_e, args) => {
    return executeCommand('chromeExt.loadIntoPartition', args)
  })

  ipcMain.handle('chromeExt:resolvePopupUrl', async (_e, args) => {
    return executeCommand('chromeExt.resolvePopupUrl', args)
  })

  ipcMain.handle('chromeExt:openPopup', async (_e, args) => {
    return executeCommand('chromeExt.openPopup', args)
  })
}
