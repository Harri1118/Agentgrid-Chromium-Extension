"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerChromeExtIpc = registerChromeExtIpc;
const electron_1 = require("electron");
function registerChromeExtIpc(executeCommand) {
    electron_1.ipcMain.handle('cdp:openExtensionPopup', async (_e, args) => {
        return executeCommand('cdp.openExtensionPopup', args);
    });
    electron_1.ipcMain.handle('cdp:openExtensionManager', async (_e, args) => {
        return executeCommand('cdp.openExtensionManager', args);
    });
    electron_1.ipcMain.handle('cdp:listExtensions', async (_e, args) => {
        return executeCommand('cdp.listExtensions', args);
    });
    electron_1.ipcMain.handle('cdp:removeExtension', async (_e, args) => {
        return executeCommand('cdp.removeExtension', args);
    });
    electron_1.ipcMain.handle('chromeExt:install', async (_e, args) => {
        return executeCommand('chromeExt.install', args);
    });
    electron_1.ipcMain.handle('chromeExt:uninstall', async (_e, args) => {
        return executeCommand('chromeExt.uninstall', args);
    });
    electron_1.ipcMain.handle('chromeExt:toggle', async (_e, args) => {
        return executeCommand('chromeExt.toggle', args);
    });
    electron_1.ipcMain.handle('chromeExt:list', async () => {
        return executeCommand('chromeExt.list');
    });
    electron_1.ipcMain.handle('chromeExt:update', async (_e, args) => {
        return executeCommand('chromeExt.update', args);
    });
    electron_1.ipcMain.handle('chromeExt:updateAll', async () => {
        return executeCommand('chromeExt.updateAll');
    });
    electron_1.ipcMain.handle('chromeExt:loadIntoPartition', async (_e, args) => {
        return executeCommand('chromeExt.loadIntoPartition', args);
    });
    electron_1.ipcMain.handle('chromeExt:resolvePopupUrl', async (_e, args) => {
        return executeCommand('chromeExt.resolvePopupUrl', args);
    });
    electron_1.ipcMain.handle('chromeExt:openPopup', async (_e, args) => {
        return executeCommand('chromeExt.openPopup', args);
    });
}
