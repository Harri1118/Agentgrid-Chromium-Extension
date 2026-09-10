import { execFileSync } from 'node:child_process'
import os from 'node:os'
import fs from 'node:fs'

type Disposable = { dispose(): void }

type ExtensionContext = {
  subscriptions: Disposable[]
  extensionPath: string
  extensionId: string
  storagePath: string
  globalState: {
    get<T>(key: string, defaultValue?: T): T | undefined
    update(key: string, value: unknown): void
    keys(): readonly string[]
  }
  workspaceState: {
    get<T>(key: string, defaultValue?: T): T | undefined
    update(key: string, value: unknown): void
    keys(): readonly string[]
  }
}

type BrowserEngineRegistration = {
  id: string
  label: string
  description?: string
  userAgent?: string
}

type AgentGridApi = {
  browserEngines: {
    registerBrowserEngine(engine: BrowserEngineRegistration): Disposable
  }
  settings: {
    get(key: string): unknown
    update(key: string, value: unknown): void
  }
}

declare const __agentgrid_api: AgentGridApi

// ── System Chrome detection ─────────────────────────────────────────

const CHROME_PATHS: Record<string, string[]> = {
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'],
}

function findChromePath(): string | null {
  const candidates = CHROME_PATHS[os.platform()] ?? []

  for (const p of candidates) {
    if (fs.existsSync(p)) { return p }
  }

  return null
}

function getChromeVersion(chromePath: string): string | null {
  try {
    const output = execFileSync(chromePath, ['--version'], {
      timeout: 5_000,
      encoding: 'utf-8',
    })

    const match = output.match(/(\d+\.\d+\.\d+\.\d+)/)

    return match?.[1] ?? null
  } catch {
    return null
  }
}

const FALLBACK_CHROME_VERSION = '130.0.6723.117'

function buildChromeUserAgent(version?: string): string {
  const platform = os.platform()
  const v = version || FALLBACK_CHROME_VERSION

  const osString = platform === 'darwin'
    ? 'Macintosh; Intel Mac OS X 10_15_7'
    : platform === 'win32'
      ? 'Windows NT 10.0; Win64; x64'
      : 'X11; Linux x86_64'

  return `Mozilla/5.0 (${osString}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36`
}

// ── Activate ────────────────────────────────────────────────────────

export async function activate(context: ExtensionContext): Promise<void> {
  console.log('[chromium-engine] activating')

  const chromePath = findChromePath()
  const chromeVersion = chromePath ? getChromeVersion(chromePath) : null

  registerLightweightEngine(context, chromeVersion)
  registerFullChromeEngine(context, chromePath, chromeVersion)

  const currentEngine = __agentgrid_api.settings.get('browserEngine')

  if (!currentEngine || currentEngine === 'built-in') {
    __agentgrid_api.settings.update('browserEngine', 'chrome-lightweight')
    console.log('[chromium-engine] auto-activated chrome-lightweight as default engine')
  }
}

function registerLightweightEngine(context: ExtensionContext, chromeVersion: string | null): void {
  const userAgent = buildChromeUserAgent(chromeVersion ?? undefined)
  const versionSuffix = chromeVersion ? ` (Chrome ${chromeVersion} UA)` : ''

  console.log(`[chromium-engine] lightweight engine: Chrome UA${versionSuffix}`)

  const registration = __agentgrid_api.browserEngines.registerBrowserEngine({
    id: 'chrome-lightweight',
    label: `Lightweight${versionSuffix}`,
    description: 'Mimics Chrome for site compatibility but does not support Chrome extensions',
    userAgent,
  })

  context.subscriptions.push(registration)
}

function registerFullChromeEngine(context: ExtensionContext, chromePath: string | null, chromeVersion: string | null): void {
  if (!chromePath) {
    console.log('[chromium-engine] system Chrome not found, skipping full Chrome engine')

    return
  }

  const versionLabel = chromeVersion ? ` ${chromeVersion}` : ''

  console.log(`[chromium-engine] full Chrome engine: ${chromePath}`)

  const registration = __agentgrid_api.browserEngines.registerBrowserEngine({
    id: 'chrome-full',
    label: `Google Chrome${versionLabel}`,
    description: `Full Google Chrome with extension support, rendered via screen streaming from ${chromePath}`,
  })

  context.subscriptions.push(registration)
}

export function deactivate(): void {
  console.log('[chromium-engine] deactivated')
}
