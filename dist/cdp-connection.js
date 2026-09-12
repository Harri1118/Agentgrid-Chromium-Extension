"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdpConnection = void 0;
const node_http_1 = __importDefault(require("node:http"));
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        node_http_1.default.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch (err) {
                    reject(err);
                }
            });
        }).on('error', reject);
    });
}
function httpPut(url) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const options = { hostname: parsed.hostname, port: parsed.port, path: parsed.pathname + parsed.search, method: 'PUT' };
        const req = node_http_1.default.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => { resolve(data); });
        });
        req.on('error', reject);
        req.end();
    });
}
class CdpConnection {
    ws = null;
    nextId = 1;
    pending = new Map();
    sessionId;
    wsUrl;
    port;
    originalWsUrl;
    popupTargetId = null;
    switchingTarget = false;
    lastWidth = 1280;
    lastHeight = 800;
    onFrame = null;
    onDisconnect = null;
    constructor(wsUrl, sessionId, port) {
        this.wsUrl = wsUrl;
        this.originalWsUrl = wsUrl;
        this.sessionId = sessionId;
        this.port = port;
    }
    connect() {
        return this.connectTo(this.wsUrl);
    }
    connectTo(wsUrl) {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(wsUrl);
            this.ws = ws;
            ws.onopen = () => { resolve(); };
            ws.onerror = (ev) => { reject(new Error(`WebSocket error: ${String(ev)}`)); };
            ws.onmessage = (ev) => {
                const msg = JSON.parse(String(ev.data));
                if ('id' in msg) {
                    const p = this.pending.get(msg.id);
                    if (p) {
                        this.pending.delete(msg.id);
                        if (msg.error) {
                            p.reject(new Error(msg.error.message));
                        }
                        else {
                            p.resolve(msg.result ?? {});
                        }
                    }
                    return;
                }
                this.handleEvent(msg);
            };
            ws.onclose = () => {
                if (!this.switchingTarget) {
                    this.onDisconnect?.('WebSocket closed');
                }
            };
        });
    }
    disconnect() {
        if (!this.ws) {
            return;
        }
        this.ws.close();
        this.ws = null;
        for (const p of this.pending.values()) {
            p.reject(new Error('Connection closed'));
        }
        this.pending.clear();
    }
    async minimizeWindow() {
        try {
            const result = await this.send('Browser.getWindowForTarget', {});
            await this.send('Browser.setWindowBounds', {
                windowId: result.windowId,
                bounds: { windowState: 'minimized' },
            });
        }
        catch { }
    }
    async startScreencast(width, height) {
        this.lastWidth = width;
        this.lastHeight = height;
        await this.send('Emulation.setDeviceMetricsOverride', {
            width,
            height,
            deviceScaleFactor: 2,
            mobile: false,
        });
        await this.send('Page.startScreencast', {
            format: 'jpeg',
            quality: 92,
            maxWidth: width * 2,
            maxHeight: height * 2,
            everyNthFrame: 1,
        });
    }
    async navigate(url) {
        await this.send('Page.navigate', { url });
    }
    async resize(width, height) {
        this.lastWidth = width;
        this.lastHeight = height;
        await this.send('Emulation.setDeviceMetricsOverride', {
            width,
            height,
            deviceScaleFactor: 2,
            mobile: false,
        });
        await this.send('Page.stopScreencast', {});
        await this.send('Page.startScreencast', {
            format: 'jpeg',
            quality: 92,
            maxWidth: width * 2,
            maxHeight: height * 2,
            everyNthFrame: 1,
        });
    }
    async openExtensionPopup(extensionId, popupPath) {
        const url = `chrome-extension://${extensionId}/${popupPath}`;
        try {
            const raw = await httpPut(`http://127.0.0.1:${this.port}/json/new?${encodeURI(url)}`);
            const target = JSON.parse(raw);
            if (!target.webSocketDebuggerUrl) {
                return { ok: false, error: 'No WebSocket URL for popup target' };
            }
            this.popupTargetId = target.id;
            await this.send('Page.stopScreencast', {}).catch(() => { });
            this.switchingTarget = true;
            this.disconnect();
            this.switchingTarget = false;
            await this.connectTo(target.webSocketDebuggerUrl);
            await this.startScreencast(this.lastWidth, this.lastHeight);
            return { ok: true };
        }
        catch (err) {
            return { ok: false, error: err.message };
        }
    }
    async closeExtensionPopup() {
        if (!this.popupTargetId) {
            return;
        }
        try {
            await this.send('Page.stopScreencast', {}).catch(() => { });
            await httpPut(`http://127.0.0.1:${this.port}/json/close/${this.popupTargetId}`).catch(() => { });
        }
        catch { }
        this.popupTargetId = null;
        this.switchingTarget = true;
        this.disconnect();
        this.switchingTarget = false;
        await this.connectTo(this.originalWsUrl);
        await this.startScreencast(this.lastWidth, this.lastHeight);
    }
    get hasPopupOpen() {
        return this.popupTargetId !== null;
    }
    async inputMouse(input) {
        await this.send('Input.dispatchMouseEvent', {
            type: input.type,
            x: input.x,
            y: input.y,
            button: input.button ?? 'left',
            clickCount: input.clickCount ?? 1,
        });
    }
    async inputKey(input) {
        const keyCode = {
            Enter: 13, Tab: 9, Backspace: 8, Delete: 46, Escape: 27,
            ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39,
            Home: 36, End: 35, PageUp: 33, PageDown: 34,
        };
        const specialText = { Enter: '\r', Tab: '\t' };
        const params = { type: input.type };
        if (input.key) {
            params.key = input.key;
        }
        if (input.code) {
            params.code = input.code;
        }
        if (input.modifiers !== undefined) {
            params.modifiers = input.modifiers;
        }
        const text = input.text ?? specialText[input.key ?? ''];
        const code = keyCode[input.key ?? ''];
        if (text) {
            params.text = text;
        }
        if (code) {
            params.windowsVirtualKeyCode = code;
            params.nativeVirtualKeyCode = code;
        }
        await this.send('Input.dispatchKeyEvent', params);
    }
    async inputScroll(input) {
        await this.send('Input.dispatchMouseEvent', {
            type: 'mouseWheel',
            x: input.x,
            y: input.y,
            deltaX: input.deltaX,
            deltaY: input.deltaY,
        });
    }
    send(method, params) {
        return new Promise((resolve, reject) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                reject(new Error('Not connected'));
                return;
            }
            const id = this.nextId++;
            this.pending.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }
    handleEvent(event) {
        if (event.method === 'Page.screencastFrame') {
            const params = event.params;
            this.onFrame?.({
                sessionId: this.sessionId,
                data: params.data,
                metadata: params.metadata,
                frameId: params.sessionId,
            });
            void this.send('Page.screencastFrameAck', { sessionId: params.sessionId }).catch(() => { });
        }
    }
}
exports.CdpConnection = CdpConnection;
