import { execFileSync } from 'node:child_process'
import os from 'node:os'
import fs from 'node:fs'
import { session } from 'electron'
import {
  launchChrome, killSession, killAllSessions, clearBrowserData,
  openChromeForExtensions, listInstalledExtensions,
} from './cdp-manager'
import { CdpConnection } from './cdp-connection'
import {
  installExtension as installChromeExt,
  uninstallExtension as uninstallChromeExt,
  toggleExtension as toggleChromeExt,
  listInstalledChromeExtensions,
  getEnabledExtensionPaths,
  updateAllExtensions,
  updateExtension as updateChromeExt,
} from './crx-manager'
import {
  listProfiles,
  getActiveProfileId,
  createProfile,
  deleteProfile,
  renameProfile,
  setActiveProfile,
} from './profile-manager'

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
  commands: {
    registerCommand(id: string, handler: (...args: unknown[]) => unknown): Disposable
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

// ── CDP connections (screencast sessions) ───────────────────────────

const cdpConnections = new Map<string, CdpConnection>()

// Track which partitions have had Chrome extensions loaded
const loadedPartitions = new Set<string>()

// ── Electron session.loadExtension helpers ──────────────────────────

async function loadExtensionsIntoPartition(partition: string, extPaths: string[]): Promise<number> {
  const ses = session.fromPartition(partition)
  let loaded = 0

  for (const extPath of extPaths) {
    try {
      await ses.loadExtension(extPath, { allowFileAccess: true })
      loaded++
    } catch (err) {
      console.warn(`[chromium-engine] failed to load extension ${extPath}:`, (err as Error).message)
    }
  }

  return loaded
}

function removeExtensionFromPartition(partition: string, extensionId: string): void {
  try {
    const ses = session.fromPartition(partition)

    ses.removeExtension(extensionId)
  } catch (err) {
    console.warn(`[chromium-engine] failed to remove extension ${extensionId}:`, (err as Error).message)
  }
}

// ── Activate ────────────────────────────────────────────────────────

export async function activate(context: ExtensionContext): Promise<void> {
  console.log('[chromium-engine] activating')

  const chromePath = findChromePath()
  const chromeVersion = chromePath ? getChromeVersion(chromePath) : null

  registerLightweightEngine(context, chromeVersion)
  registerFullChromeEngine(context, chromePath, chromeVersion)
  registerCdpCommands(context, chromePath)
  registerChromeExtCommands(context)
  registerProfileCommands(context)

  // Auto-update installed Chrome extensions in the background
  updateAllExtensions().catch((err) => {
    console.warn('[chromium-engine] background extension update failed:', (err as Error).message)
  })

  console.log('[chromium-engine] engines registered, user can switch via Settings or context menu')
}

function registerLightweightEngine(context: ExtensionContext, chromeVersion: string | null): void {
  const userAgent = buildChromeUserAgent(chromeVersion ?? undefined)

  console.log('[chromium-engine] lightweight engine: Chrome (Lightweight)')

  const registration = __agentgrid_api.browserEngines.registerBrowserEngine({
    id: 'chrome-lightweight',
    label: 'Chrome (Lightweight)',
    description: 'Chrome UA with support for Chrome Web Store extensions via Electron',
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
    description: 'Full Google Chrome rendering via screen streaming',
  })

  context.subscriptions.push(registration)
}

// ── Chrome extension management commands ────────────────────────────

function registerChromeExtCommands(context: ExtensionContext): void {
  const reg = (id: string, handler: (...args: unknown[]) => unknown): void => {
    context.subscriptions.push(__agentgrid_api.commands.registerCommand(id, handler))
  }

  reg('chromeExt.install', async (...args: unknown[]) => {
    const opts = args[0] as { extensionId: string; partition?: string }

    try {
      const meta = await installChromeExt(opts.extensionId)

      if (opts.partition) {
        const extPaths = getEnabledExtensionPaths()

        await loadExtensionsIntoPartition(opts.partition, extPaths)
      }

      return { ok: true, extension: meta }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  reg('chromeExt.uninstall', async (...args: unknown[]) => {
    const opts = args[0] as { extensionId: string; partition?: string }

    try {
      uninstallChromeExt(opts.extensionId)

      if (opts.partition) {
        removeExtensionFromPartition(opts.partition, opts.extensionId)
      }

      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  reg('chromeExt.toggle', async (...args: unknown[]) => {
    const opts = args[0] as { extensionId: string; enabled: boolean }

    try {
      toggleChromeExt(opts.extensionId, opts.enabled)

      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  reg('chromeExt.list', () => {
    return listInstalledChromeExtensions()
  })

  reg('chromeExt.update', async (...args: unknown[]) => {
    const opts = args[0] as { extensionId: string }

    try {
      const result = await updateChromeExt(opts.extensionId)

      return { ok: true, ...result }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  reg('chromeExt.updateAll', async () => {
    try {
      await updateAllExtensions()

      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  reg('chromeExt.loadIntoPartition', async (...args: unknown[]) => {
    const opts = args[0] as { partition: string }

    if (loadedPartitions.has(opts.partition)) {
      return { ok: true, alreadyLoaded: true }
    }

    try {
      const extPaths = getEnabledExtensionPaths()

      if (extPaths.length === 0) {
        loadedPartitions.add(opts.partition)

        return { ok: true, loaded: 0 }
      }

      const loaded = await loadExtensionsIntoPartition(opts.partition, extPaths)

      loadedPartitions.add(opts.partition)
      console.log(`[chromium-engine] loaded ${loaded} Chrome extension(s) into ${opts.partition}`)

      return { ok: true, loaded }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })
}

// ── Browser profile commands ─────────────────────────────────────────

function registerProfileCommands(context: ExtensionContext): void {
  const reg = (id: string, handler: (...args: unknown[]) => unknown): void => {
    context.subscriptions.push(__agentgrid_api.commands.registerCommand(id, handler))
  }

  reg('browserProfile.list', () => {
    return listProfiles()
  })

  reg('browserProfile.getActive', () => {
    return getActiveProfileId()
  })

  reg('browserProfile.create', (...args: unknown[]) => {
    const opts = args[0] as { name: string }

    try {
      const profile = createProfile(opts.name)

      return { ok: true, profile }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  reg('browserProfile.delete', (...args: unknown[]) => {
    const opts = args[0] as { profileId: string }

    try {
      deleteProfile(opts.profileId)

      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  reg('browserProfile.rename', (...args: unknown[]) => {
    const opts = args[0] as { profileId: string; name: string }

    try {
      renameProfile(opts.profileId, opts.name)

      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  reg('browserProfile.setActive', (...args: unknown[]) => {
    const opts = args[0] as { profileId: string }

    try {
      setActiveProfile(opts.profileId)

      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })
}

// ── CDP commands ────────────────────────────────────────────────────

type CdpLaunchArgs = { sessionId: string; workspaceId: string; url?: string; width?: number; height?: number }
type CdpNavigateArgs = { sessionId: string; url: string }
type CdpCloseArgs = { sessionId: string }
type CdpResizeArgs = { sessionId: string; width: number; height: number }
type CdpMouseArgs = { sessionId: string; type: string; x: number; y: number; button?: string; clickCount?: number }
type CdpKeyArgs = { sessionId: string; type: string; key?: string; code?: string; text?: string; modifiers?: number }
type CdpScrollArgs = { sessionId: string; x: number; y: number; deltaX: number; deltaY: number }
type CdpClearDataArgs = { workspaceId: string }
type CdpSetFrameCallbackArgs = { callback: (frame: unknown) => void }
type CdpSetSessionEndCallbackArgs = { callback: (event: { sessionId: string; reason: string }) => void }

let onFrameCallback: ((frame: unknown) => void) | null = null
let onSessionEndCallback: ((event: { sessionId: string; reason: string }) => void) | null = null

function registerCdpCommands(context: ExtensionContext, chromePath: string | null): void {
  const reg = (id: string, handler: (...args: unknown[]) => unknown): void => {
    context.subscriptions.push(__agentgrid_api.commands.registerCommand(id, handler))
  }

  reg('cdp.launch', async (...args: unknown[]) => {
    const opts = args[0] as CdpLaunchArgs

    if (!chromePath) {
      return { ok: false, error: 'Google Chrome is not installed' }
    }

    try {
      const cdpSession = await launchChrome(chromePath, opts.sessionId, opts.workspaceId, opts.url)
      const conn = new CdpConnection(cdpSession.wsUrl, opts.sessionId)

      conn.onFrame = (frame) => { onFrameCallback?.(frame) }
      conn.onDisconnect = (reason) => { onSessionEndCallback?.({ sessionId: opts.sessionId, reason }) }

      await conn.connect()
      await conn.startScreencast(opts.width ?? 1280, opts.height ?? 800)

      cdpConnections.set(opts.sessionId, conn)

      return { ok: true, wsUrl: cdpSession.wsUrl }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  reg('cdp.navigate', async (...args: unknown[]) => {
    const opts = args[0] as CdpNavigateArgs
    const conn = cdpConnections.get(opts.sessionId)

    if (conn) { await conn.navigate(opts.url) }
  })

  reg('cdp.close', async (...args: unknown[]) => {
    const opts = args[0] as CdpCloseArgs
    const conn = cdpConnections.get(opts.sessionId)

    if (conn) {
      conn.disconnect()
      cdpConnections.delete(opts.sessionId)
    }

    killSession(opts.sessionId)
  })

  reg('cdp.resize', async (...args: unknown[]) => {
    const opts = args[0] as CdpResizeArgs
    const conn = cdpConnections.get(opts.sessionId)

    if (conn) { await conn.resize(opts.width, opts.height) }
  })

  reg('cdp.inputMouse', async (...args: unknown[]) => {
    const opts = args[0] as CdpMouseArgs
    const conn = cdpConnections.get(opts.sessionId)

    if (conn) { await conn.inputMouse(opts) }
  })

  reg('cdp.inputKey', async (...args: unknown[]) => {
    const opts = args[0] as CdpKeyArgs
    const conn = cdpConnections.get(opts.sessionId)

    if (conn) { await conn.inputKey(opts) }
  })

  reg('cdp.inputScroll', async (...args: unknown[]) => {
    const opts = args[0] as CdpScrollArgs
    const conn = cdpConnections.get(opts.sessionId)

    if (conn) { await conn.inputScroll(opts) }
  })

  reg('cdp.clearData', async (...args: unknown[]) => {
    const opts = args[0] as CdpClearDataArgs

    return { ok: clearBrowserData(opts.workspaceId) }
  })

  reg('cdp.openExtensionManager', (...args: unknown[]) => {
    const opts = args[0] as { workspaceId: string }

    if (!chromePath) {
      return { ok: false, error: 'Google Chrome is not installed' }
    }

    openChromeForExtensions(chromePath, opts.workspaceId)

    return { ok: true }
  })

  reg('cdp.listExtensions', (...args: unknown[]) => {
    const opts = args[0] as { workspaceId: string }

    return listInstalledExtensions(opts.workspaceId)
  })

  reg('cdp.setFrameCallback', (...args: unknown[]) => {
    const opts = args[0] as CdpSetFrameCallbackArgs

    onFrameCallback = opts.callback
  })

  reg('cdp.setSessionEndCallback', (...args: unknown[]) => {
    const opts = args[0] as CdpSetSessionEndCallbackArgs

    onSessionEndCallback = opts.callback
  })
}

export function deactivate(): void {
  for (const conn of cdpConnections.values()) {
    conn.disconnect()
  }

  cdpConnections.clear()
  killAllSessions()
  loadedPartitions.clear()
  console.log('[chromium-engine] deactivated')
}
