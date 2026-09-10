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
export declare function clearBrowserData(workspaceId: string): boolean;
