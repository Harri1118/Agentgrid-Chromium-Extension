"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChromeExtPreload = createChromeExtPreload;
const electron_1 = require("electron");
function createChromeExtPreload() {
    return {
        chromeExt: {
            install: (args) => electron_1.ipcRenderer.invoke('chromeExt:install', args),
            uninstall: (args) => electron_1.ipcRenderer.invoke('chromeExt:uninstall', args),
            toggle: (args) => electron_1.ipcRenderer.invoke('chromeExt:toggle', args),
            list: () => electron_1.ipcRenderer.invoke('chromeExt:list'),
            update: (args) => electron_1.ipcRenderer.invoke('chromeExt:update', args),
            updateAll: () => electron_1.ipcRenderer.invoke('chromeExt:updateAll'),
            loadIntoPartition: (args) => electron_1.ipcRenderer.invoke('chromeExt:loadIntoPartition', args),
            resolvePopupUrl: (args) => electron_1.ipcRenderer.invoke('chromeExt:resolvePopupUrl', args),
            openPopup: (args) => electron_1.ipcRenderer.invoke('chromeExt:openPopup', args),
        },
        cdpExtensions: {
            openExtensionManager: (opts) => electron_1.ipcRenderer.invoke('cdp:openExtensionManager', opts),
            openExtensionPopup: (opts) => electron_1.ipcRenderer.invoke('cdp:openExtensionPopup', opts),
            listExtensions: (opts) => electron_1.ipcRenderer.invoke('cdp:listExtensions', opts),
            removeExtension: (opts) => electron_1.ipcRenderer.invoke('cdp:removeExtension', opts),
        },
    };
}
