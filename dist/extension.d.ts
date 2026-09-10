type Disposable = {
    dispose(): void;
};
type ExtensionContext = {
    subscriptions: Disposable[];
    extensionPath: string;
    extensionId: string;
    storagePath: string;
    globalState: {
        get<T>(key: string, defaultValue?: T): T | undefined;
        update(key: string, value: unknown): void;
        keys(): readonly string[];
    };
    workspaceState: {
        get<T>(key: string, defaultValue?: T): T | undefined;
        update(key: string, value: unknown): void;
        keys(): readonly string[];
    };
};
export declare function activate(context: ExtensionContext): Promise<void>;
export declare function deactivate(): void;
export {};
