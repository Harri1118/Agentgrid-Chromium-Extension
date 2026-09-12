export declare function createChromeExtPreload(): {
    chromeExt: {
        install: (args: unknown) => Promise<any>;
        uninstall: (args: unknown) => Promise<any>;
        toggle: (args: unknown) => Promise<any>;
        list: () => Promise<any>;
        update: (args: unknown) => Promise<any>;
        updateAll: () => Promise<any>;
        loadIntoPartition: (args: unknown) => Promise<any>;
        resolvePopupUrl: (args: unknown) => Promise<any>;
        openPopup: (args: unknown) => Promise<any>;
    };
    cdpExtensions: {
        openExtensionManager: (opts: unknown) => Promise<any>;
        openExtensionPopup: (opts: unknown) => Promise<any>;
        listExtensions: (opts: unknown) => Promise<any>;
        removeExtension: (opts: unknown) => Promise<any>;
    };
};
