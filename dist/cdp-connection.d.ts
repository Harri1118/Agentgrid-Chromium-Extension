type ScreencastFrame = {
    sessionId: string;
    data: string;
    metadata: {
        offsetTop: number;
        pageScaleFactor: number;
        deviceWidth: number;
        deviceHeight: number;
        scrollOffsetX: number;
        scrollOffsetY: number;
        timestamp: number;
    };
    frameId: number;
};
type MouseInput = {
    type: string;
    x: number;
    y: number;
    button?: string;
    clickCount?: number;
};
type KeyInput = {
    type: string;
    key?: string;
    code?: string;
    text?: string;
    modifiers?: number;
};
type ScrollInput = {
    x: number;
    y: number;
    deltaX: number;
    deltaY: number;
};
export declare class CdpConnection {
    private ws;
    private nextId;
    private pending;
    private sessionId;
    private wsUrl;
    onFrame: ((frame: ScreencastFrame) => void) | null;
    onDisconnect: ((reason: string) => void) | null;
    constructor(wsUrl: string, sessionId: string);
    connect(): Promise<void>;
    disconnect(): void;
    startScreencast(width: number, height: number): Promise<void>;
    navigate(url: string): Promise<void>;
    resize(width: number, height: number): Promise<void>;
    inputMouse(input: MouseInput): Promise<void>;
    inputKey(input: KeyInput): Promise<void>;
    inputScroll(input: ScrollInput): Promise<void>;
    private send;
    private handleEvent;
}
export {};
