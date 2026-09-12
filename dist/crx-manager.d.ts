export type ChromeExtensionMeta = {
    id: string;
    name: string;
    version: string;
    description: string;
    enabled: boolean;
    iconPath: string | null;
};
export declare function installExtension(extensionId: string): Promise<ChromeExtensionMeta>;
export declare function uninstallExtension(extensionId: string): void;
export declare function toggleExtension(extensionId: string, enabled: boolean): void;
export declare function listInstalledChromeExtensions(): ChromeExtensionMeta[];
export declare function getExtensionPath(extensionId: string): string | null;
export declare function getEnabledExtensionPaths(): string[];
export declare function updateExtension(extensionId: string): Promise<{
    updated: boolean;
    oldVersion: string;
    newVersion: string;
}>;
export declare function updateAllExtensions(): Promise<void>;
