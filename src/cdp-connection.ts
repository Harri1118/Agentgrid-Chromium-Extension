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

export class CdpConnection {
  private ws: WebSocket | null = null
  private nextId = 1
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  private sessionId: string
  private wsUrl: string

  onFrame: ((frame: ScreencastFrame) => void) | null = null
  onDisconnect: ((reason: string) => void) | null = null

  constructor(wsUrl: string, sessionId: string) {
    this.wsUrl = wsUrl
    this.sessionId = sessionId
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl)

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
        this.onDisconnect?.('WebSocket closed')
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

  async startScreencast(width: number, height: number): Promise<void> {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    })

    await this.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 60,
      maxWidth: width,
      maxHeight: height,
      everyNthFrame: 1,
    })
  }

  async navigate(url: string): Promise<void> {
    await this.send('Page.navigate', { url })
  }

  async resize(width: number, height: number): Promise<void> {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    })

    await this.send('Page.stopScreencast', {})

    await this.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 60,
      maxWidth: width,
      maxHeight: height,
      everyNthFrame: 1,
    })
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
