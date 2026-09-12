import http from 'node:http'

type CdpResponse = {
  id: number
  result?: Record<string, unknown>
  error?: { code: number; message: string }
}

type CdpEvent = {
  method: string
  params: Record<string, unknown>
}

type ScreencastFrame = {
  sessionId: string
  data: string
  metadata: {
    offsetTop: number
    pageScaleFactor: number
    deviceWidth: number
    deviceHeight: number
    scrollOffsetX: number
    scrollOffsetY: number
    timestamp: number
  }
  frameId: number
}

type MouseInput = {
  type: string
  x: number
  y: number
  button?: string
  clickCount?: number
}

type KeyInput = {
  type: string
  key?: string
  code?: string
  text?: string
  modifiers?: number
}

type ScrollInput = {
  x: number
  y: number
  deltaX: number
  deltaY: number
}

type DebugTarget = {
  id: string
  type: string
  title: string
  url: string
  webSocketDebuggerUrl: string
}

function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ''

      res.on('data', (chunk: string) => { data += chunk })

      res.on('end', () => {
        try {
          resolve(JSON.parse(data) as T)
        } catch (err) {
          reject(err)
        }
      })
    }).on('error', reject)
  })
}

function httpPut(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const options = { hostname: parsed.hostname, port: parsed.port, path: parsed.pathname + parsed.search, method: 'PUT' }

    const req = http.request(options, (res) => {
      let data = ''

      res.on('data', (chunk: string) => { data += chunk })
      res.on('end', () => { resolve(data) })
    })

    req.on('error', reject)
    req.end()
  })
}

export class CdpConnection {
  private ws: WebSocket | null = null
  private nextId = 1
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  private sessionId: string
  private wsUrl: string
  private port: number
  private originalWsUrl: string
  private popupTargetId: string | null = null
  private switchingTarget = false
  private lastWidth = 1280
  private lastHeight = 800

  onFrame: ((frame: ScreencastFrame) => void) | null = null
  onDisconnect: ((reason: string) => void) | null = null

  constructor(wsUrl: string, sessionId: string, port: number) {
    this.wsUrl = wsUrl
    this.originalWsUrl = wsUrl
    this.sessionId = sessionId
    this.port = port
  }

  connect(): Promise<void> {
    return this.connectTo(this.wsUrl)
  }

  private connectTo(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl)

      this.ws = ws

      ws.onopen = () => { resolve() }

      ws.onerror = (ev) => { reject(new Error(`WebSocket error: ${String(ev)}`)) }

      ws.onmessage = (ev) => {
        const msg = JSON.parse(String(ev.data)) as CdpResponse | CdpEvent

        if ('id' in msg) {
          const p = this.pending.get(msg.id)

          if (p) {
            this.pending.delete(msg.id)

            if (msg.error) {
              p.reject(new Error(msg.error.message))
            } else {
              p.resolve(msg.result ?? {})
            }
          }

          return
        }

        this.handleEvent(msg)
      }

      ws.onclose = () => {
        if (!this.switchingTarget) {
          this.onDisconnect?.('WebSocket closed')
        }
      }
    })
  }

  disconnect(): void {
    if (!this.ws) { return }

    this.ws.close()
    this.ws = null

    for (const p of this.pending.values()) {
      p.reject(new Error('Connection closed'))
    }

    this.pending.clear()
  }

  async minimizeWindow(): Promise<void> {
    try {
      const result = await this.send('Browser.getWindowForTarget', {}) as { windowId: number }

      await this.send('Browser.setWindowBounds', {
        windowId: result.windowId,
        bounds: { windowState: 'minimized' },
      })
    } catch {}
  }

  async startScreencast(width: number, height: number): Promise<void> {
    this.lastWidth = width
    this.lastHeight = height

    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: false,
    })

    await this.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 92,
      maxWidth: width * 2,
      maxHeight: height * 2,
      everyNthFrame: 1,
    })
  }

  async navigate(url: string): Promise<void> {
    await this.send('Page.navigate', { url })
  }

  async resize(width: number, height: number): Promise<void> {
    this.lastWidth = width
    this.lastHeight = height

    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: false,
    })

    await this.send('Page.stopScreencast', {})

    await this.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 92,
      maxWidth: width * 2,
      maxHeight: height * 2,
      everyNthFrame: 1,
    })
  }

  async openExtensionPopup(extensionId: string, popupPath: string): Promise<{ ok: boolean; error?: string }> {
    const url = `chrome-extension://${extensionId}/${popupPath}`

    try {
      const raw = await httpPut(`http://127.0.0.1:${this.port}/json/new?${encodeURI(url)}`)
      const target = JSON.parse(raw) as DebugTarget

      if (!target.webSocketDebuggerUrl) {
        return { ok: false, error: 'No WebSocket URL for popup target' }
      }

      this.popupTargetId = target.id

      await this.send('Page.stopScreencast', {}).catch(() => {})

      this.switchingTarget = true
      this.disconnect()
      this.switchingTarget = false

      await this.connectTo(target.webSocketDebuggerUrl)
      await this.startScreencast(this.lastWidth, this.lastHeight)

      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }

  async closeExtensionPopup(): Promise<void> {
    if (!this.popupTargetId) { return }

    try {
      await this.send('Page.stopScreencast', {}).catch(() => {})
      await httpPut(`http://127.0.0.1:${this.port}/json/close/${this.popupTargetId}`).catch(() => {})
    } catch {}

    this.popupTargetId = null

    this.switchingTarget = true
    this.disconnect()
    this.switchingTarget = false

    await this.connectTo(this.originalWsUrl)
    await this.startScreencast(this.lastWidth, this.lastHeight)
  }

  get hasPopupOpen(): boolean {
    return this.popupTargetId !== null
  }

  async inputMouse(input: MouseInput): Promise<void> {
    await this.send('Input.dispatchMouseEvent', {
      type: input.type,
      x: input.x,
      y: input.y,
      button: input.button ?? 'left',
      clickCount: input.clickCount ?? 1,
    })
  }

  async inputKey(input: KeyInput): Promise<void> {
    const keyCode: Record<string, number> = {
      Enter: 13, Tab: 9, Backspace: 8, Delete: 46, Escape: 27,
      ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39,
      Home: 36, End: 35, PageUp: 33, PageDown: 34,
    }

    const specialText: Record<string, string> = { Enter: '\r', Tab: '\t' }
    const params: Record<string, unknown> = { type: input.type }

    if (input.key) { params.key = input.key }
    if (input.code) { params.code = input.code }
    if (input.modifiers !== undefined) { params.modifiers = input.modifiers }

    const text = input.text ?? specialText[input.key ?? '']
    const code = keyCode[input.key ?? '']

    if (text) { params.text = text }
    if (code) { params.windowsVirtualKeyCode = code; params.nativeVirtualKeyCode = code }

    await this.send('Input.dispatchKeyEvent', params)
  }

  async inputScroll(input: ScrollInput): Promise<void> {
    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: input.x,
      y: input.y,
      deltaX: input.deltaX,
      deltaY: input.deltaY,
    })
  }

  private send(method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'))

        return
      }

      const id = this.nextId++

      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  private handleEvent(event: CdpEvent): void {
    if (event.method === 'Page.screencastFrame') {
      const params = event.params as {
        data: string
        metadata: ScreencastFrame['metadata']
        sessionId: number
      }

      this.onFrame?.({
        sessionId: this.sessionId,
        data: params.data,
        metadata: params.metadata,
        frameId: params.sessionId,
      })

      void this.send('Page.screencastFrameAck', { sessionId: params.sessionId }).catch(() => {})
    }
  }
}
