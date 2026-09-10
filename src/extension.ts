import { execFileSync } from 'node:child_process'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'

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

// ── Bundled Chromium via Playwright ─────────────────────────────────

function getBundledChromiumVersion(extensionRoot: string): string | null {
  try {
    const browsersJson = path.join(extensionRoot, 'node_modules', 'playwright-core', 'browsers.json')

    if (!fs.existsSync(browsersJson)) { return null }

    const data = JSON.parse(fs.readFileSync(browsersJson, 'utf-8')) as {
      browsers?: Array<{ name?: string; browserVersion?: string }>
    }
    const chromium = data.browsers?.find((b) => b.name === 'chromium')

    return chromium?.browserVersion ?? null
  } catch {
    return null
  }
}

function installBundledChromium(extensionRoot: string): void {
  try {
    execFileSync('npx', ['playwright-core', 'install', 'chromium'], {
      cwd: extensionRoot,
      stdio: 'inherit',
      timeout: 120_000,
    })

    console.log('[chromium-engine] bundled Chromium installed')
  } catch (err) {
    console.error('[chromium-engine] failed to install bundled Chromium:', err)
  }
}

// ── Activate ────────────────────────────────────────────────────────

export async function activate(context: ExtensionContext): Promise<void> {
  console.log('[chromium-engine] activating')

  const extensionRoot = path.join(__dirname, '..')

  registerSystemChrome(context)
  registerBundledChromium(context, extensionRoot)

  const currentEngine = __agentgrid_api.settings.get('browserEngine')

  if (!currentEngine || currentEngine === 'built-in') {
    __agentgrid_api.settings.update('browserEngine', 'chrome-bundled')
    console.log('[chromium-engine] auto-activated chrome-bundled as default engine')
  }
}

function registerSystemChrome(context: ExtensionContext): void {
  const chromePath = findChromePath()

  if (!chromePath) {
    console.log('[chromium-engine] system Chrome not found, skipping system engine')

    return
  }

  const version = getChromeVersion(chromePath)

  if (!version) {
    console.warn('[chromium-engine] could not detect system Chrome version')

    return
  }

  const userAgent = buildChromeUserAgent(version)

  console.log(`[chromium-engine] system Chrome ${version} at ${chromePath}`)

  const registration = __agentgrid_api.browserEngines.registerBrowserEngine({
    id: 'chrome-system',
    label: `Google Chrome ${version} (System)`,
    description: `Uses your installed Google Chrome at ${chromePath}`,
    userAgent,
  })

  context.subscriptions.push(registration)
}

function registerBundledChromium(context: ExtensionContext, extensionRoot: string): void {
  installBundledChromium(extensionRoot)

  const bundledVersion = getBundledChromiumVersion(extensionRoot)
  const bundledUA = buildChromeUserAgent(bundledVersion ?? undefined)
  const label = bundledVersion ? `Chromium ${bundledVersion} (Bundled)` : 'Chromium (Bundled)'

  console.log(`[chromium-engine] bundled Chromium: ${bundledVersion ?? 'unknown version'}`)

  const registration = __agentgrid_api.browserEngines.registerBrowserEngine({
    id: 'chrome-bundled',
    label,
    description: 'Standalone Chromium managed by AgentGrid — independent of your system browser',
    userAgent: bundledUA,
  })

  context.subscriptions.push(registration)
}

export function deactivate(): void {
  console.log('[chromium-engine] deactivated')
}
