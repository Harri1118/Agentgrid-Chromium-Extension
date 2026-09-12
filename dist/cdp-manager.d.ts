import { type ChildProcess } from 'node:child_process';
export type CdpSession = {
    id: string;
    wsUrl: string;
    chromeProcess: ChildProcess;
    debuggingPort: number;
    userDataDir: string;
};
export declare function launchChrome(chromePath: string, sessionId: string, workspaceId: string, startUrl?: string): Promise<CdpSession>;
export declare function getSession(sessionId: string): CdpSession | undefined;
export declare function killSession(sessionId: string): void;
export declare function killAllSessions(): void;
export type InstalledExtension = {
    id: string;
    name: string;
    version: string;
    description: string;
    popupPath: string | null;
    optionsPath: string | null;
    iconPath: string | null;
};
export declare function openChromeForExtensions(chromePath: string, workspaceId: string): ChildProcess;
export declare function openExtensionPopupWindow(chromePath: string, sessionId: string, extensionId: string, popupPath: string): ChildProcess;
export declare function listInstalledExtensions(workspaceId: string): InstalledExtension[];
export declare function removeInstalledExtension(workspaceId: string, extensionId: string): boolean;
export declare function clearBrowserData(workspaceId: string): boolean;
