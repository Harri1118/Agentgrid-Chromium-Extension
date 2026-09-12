type ExecuteCommandFn = (command: string, ...args: unknown[]) => Promise<unknown>;
export declare function registerChromeExtIpc(executeCommand: ExecuteCommandFn): void;
export {};
