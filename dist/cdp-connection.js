"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdpConnection = void 0;
class CdpConnection {
    ws = null;
    nextId = 1;
    pending = new Map();
    sessionId;
    wsUrl;
    onFrame = null;
    onDisconnect = null;
    constructor(wsUrl, sessionId) {
        this.wsUrl = wsUrl;
        this.sessionId = sessionId;
    }
    connect() {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(this.wsUrl);
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
                this.onDisconnect?.('WebSocket closed');
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
    async startScreencast(width, height) {
        await this.send('Emulation.setDeviceMetricsOverride', {
            width,
            height,
            deviceScaleFactor: 1,
            mobile: false,
        });
        await this.send('Page.startScreencast', {
            format: 'jpeg',
            quality: 60,
            maxWidth: width,
            maxHeight: height,
            everyNthFrame: 1,
        });
    }
    async navigate(url) {
        await this.send('Page.navigate', { url });
    }
    async resize(width, height) {
        await this.send('Emulation.setDeviceMetricsOverride', {
            width,
            height,
            deviceScaleFactor: 1,
            mobile: false,
        });
        await this.send('Page.stopScreencast', {});
        await this.send('Page.startScreencast', {
            format: 'jpeg',
            quality: 60,
            maxWidth: width,
            maxHeight: height,
            everyNthFrame: 1,
        });
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
