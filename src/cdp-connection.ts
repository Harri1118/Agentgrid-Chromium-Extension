import WebSocket from 'ws'

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
      this.ws = new WebSocket(this.wsUrl)

      this.ws.on('open', () => { resolve() })
      this.ws.on('error', (err) => { reject(err) })

      this.ws.on('message', (raw: WebSocket.Data) => {
        const msg = JSON.parse(raw.toString()) as CdpResponse | CdpEvent

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
      })

      this.ws.on('close', () => {
        this.onDisconnect?.('WebSocket closed')
      })
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
      deviceScaleFactor: 2,
      mobile: false,
    })

    await this.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 80,
      maxWidth: width * 2,
      maxHeight: height * 2,
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
      deviceScaleFactor: 2,
      mobile: false,
    })

    await this.send('Page.stopScreencast', {})

    await this.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 80,
      maxWidth: width * 2,
      maxHeight: height * 2,
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
    const params: Record<string, unknown> = { type: input.type }

    if (input.key) { params.key = input.key }
    if (input.code) { params.code = input.code }
    if (input.text) { params.text = input.text }
    if (input.modifiers !== undefined) { params.modifiers = input.modifiers }

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
