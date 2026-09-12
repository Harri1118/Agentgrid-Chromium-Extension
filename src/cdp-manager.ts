import { execFile, spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import http from 'node:http'

export type CdpSession = {
  id: string
  wsUrl: string
  chromeProcess: ChildProcess
  debuggingPort: number
  userDataDir: string
}

type CdpTarget = {
  id: string
  type: string
  title: string
  url: string
  webSocketDebuggerUrl: string
}

const activeSessions = new Map<string, CdpSession>()

let nextPort = 9222

function allocatePort(): number {
  return nextPort++
}

function buildUserDataDir(workspaceId: string): string {
  const base = path.join(os.homedir(), '.agentgrid', 'chrome-profiles', workspaceId)

  fs.mkdirSync(base, { recursive: true })

  return base
}

export function launchChrome(chromePath: string, sessionId: string, workspaceId: string, startUrl?: string): Promise<CdpSession> {
  const port = allocatePort()
  const userDataDir = buildUserDataDir(path.join(workspaceId, sessionId))
  const url = startUrl || 'about:blank'

  const args = [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-sync',
    '--enable-extensions',
    url,
  ]

  return new Promise((resolve, reject) => {
    const proc = spawn(chromePath, args, { detached: true, stdio: 'ignore', windowsHide: true })

    proc.on('error', (err) => {
      reject(new Error(`Failed to launch Chrome: ${err.message}`))
    })

    let settled = false

    const tryConnect = (attempt: number): void => {
      if (attempt > 40) {
        if (!settled) {
          settled = true
          proc.kill()
          reject(new Error('Chrome did not start in time'))
        }

        return
      }

      fetchJson<CdpTarget[]>(`http://127.0.0.1:${port}/json`)
        .then((targets) => {
          if (settled) { return }

          settled = true
          const pageTarget = targets.find((t) => t.type === 'page')

          if (!pageTarget) {
            proc.kill()
            reject(new Error('No page target found'))

            return
          }

          const session: CdpSession = {
            id: sessionId,
            wsUrl: pageTarget.webSocketDebuggerUrl,
            chromeProcess: proc,
            debuggingPort: port,
            userDataDir,
          }

          activeSessions.set(sessionId, session)
          resolve(session)
        })
        .catch(() => {
          setTimeout(() => tryConnect(attempt + 1), 250)
        })
    }

    setTimeout(() => tryConnect(0), 500)
  })
}

export function getSession(sessionId: string): CdpSession | undefined {
  return activeSessions.get(sessionId)
}

function killChromeProcess(proc: ChildProcess): void {
  const pid = proc.pid

  if (!pid) {
    proc.kill()

    return
  }

  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    proc.kill()
  }
}

export function killSession(sessionId: string): void {
  const session = activeSessions.get(sessionId)

  if (!session) { return }

  killChromeProcess(session.chromeProcess)
  activeSessions.delete(sessionId)

  try {
    fs.rmSync(session.userDataDir, { recursive: true, force: true })
  } catch {}
}

export function killAllSessions(): void {
  for (const session of activeSessions.values()) {
    killChromeProcess(session.chromeProcess)

    try {
      fs.rmSync(session.userDataDir, { recursive: true, force: true })
    } catch {}
  }

  activeSessions.clear()
}

export type InstalledExtension = {
  id: string
  name: string
  version: string
  description: string
  popupPath: string | null
  optionsPath: string | null
  iconPath: string | null
}

export function openChromeForExtensions(chromePath: string, workspaceId: string): ChildProcess {
  const userDataDir = buildUserDataDir(workspaceId)

  const args = [
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'https://chromewebstore.google.com',
  ]

  const proc = execFile(chromePath, args, { windowsHide: false })

  return proc
}

export function openExtensionPopupWindow(
  chromePath: string,
  sessionId: string,
  extensionId: string,
  popupPath: string
): ChildProcess {
  const session = activeSessions.get(sessionId)

  if (!session) {
    throw new Error(`No active session: ${sessionId}`)
  }

  const extVersionsDir = path.join(session.userDataDir, 'Default', 'Extensions', extensionId)
  const versions = readdirSafe(extVersionsDir)
  const latestVersion = versions[versions.length - 1]

  if (!latestVersion) {
    throw new Error(`Extension not found: ${extensionId}`)
  }

  const extDir = path.join(extVersionsDir, latestVersion)
  const popupDataDir = buildUserDataDir(`popup-${extensionId}`)

  const args = [
    `--user-data-dir=${popupDataDir}`,
    `--load-extension=${extDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions-except=' + extDir,
    `--app=file://${path.join(extDir, popupPath)}`,
    '--window-size=400,600',
  ]

  console.log('[cdp] opening extension popup:', args.join(' '))

  const proc = spawn(chromePath, args, {
    detached: true,
    stdio: 'pipe',
  })

  proc.stderr?.on('data', (data: Buffer) => {
    console.log('[cdp-popup-stderr]', data.toString())
  })

  proc.on('exit', (code) => {
    console.log(`[cdp-popup] exited with code ${code}`)
  })

  proc.unref()

  return proc
}

export function listInstalledExtensions(workspaceId: string): InstalledExtension[] {
  const extensionsDir = path.join(
    os.homedir(), '.agentgrid', 'chrome-profiles', workspaceId, 'Default', 'Extensions'
  )

  if (!fs.existsSync(extensionsDir)) { return [] }

  const results: InstalledExtension[] = []

  for (const extId of readdirSafe(extensionsDir)) {
    const extPath = path.join(extensionsDir, extId)
    const versions = readdirSafe(extPath)
    const latestVersion = versions[versions.length - 1]

    if (!latestVersion) { continue }

    const versionDir = path.join(extPath, latestVersion)
    const manifestPath = path.join(versionDir, 'manifest.json')

    if (!fs.existsSync(manifestPath)) { continue }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as {
        name?: string
        version?: string
        description?: string
        default_locale?: string
        browser_action?: { default_popup?: string }
        action?: { default_popup?: string; default_icon?: string | Record<string, string> }
        options_page?: string
        options_ui?: { page?: string }
        icons?: Record<string, string>
      }

      const popup = manifest.action?.default_popup
        ?? manifest.browser_action?.default_popup
        ?? null

      const options = manifest.options_ui?.page
        ?? manifest.options_page
        ?? null

      const iconMap = manifest.icons ?? {}
      const iconSizes = Object.keys(iconMap).map(Number).sort((a, b) => b - a)
      const bestIcon = iconSizes[0] ? iconMap[String(iconSizes[0])] ?? null : null

      const rawName = manifest.name ?? extId
      const rawDesc = manifest.description ?? ''
      const name = resolveI18n(rawName, versionDir, manifest.default_locale)
      const description = resolveI18n(rawDesc, versionDir, manifest.default_locale)

      const absoluteIconPath = bestIcon
        ? iconToDataUri(path.join(versionDir, bestIcon))
        : null

      results.push({
        id: extId,
        name,
        version: manifest.version ?? '0.0.0',
        description,
        popupPath: popup,
        optionsPath: options,
        iconPath: absoluteIconPath,
      })
    } catch {
      continue
    }
  }

  return results
}

export function removeInstalledExtension(workspaceId: string, extensionId: string): boolean {
  const extensionDir = path.join(
    os.homedir(), '.agentgrid', 'chrome-profiles', workspaceId, 'Default', 'Extensions', extensionId
  )

  if (!fs.existsSync(extensionDir)) { return false }

  try {
    fs.rmSync(extensionDir, { recursive: true, force: true })

    return true
  } catch {
    return false
  }
}

function readdirSafe(dir: string): string[] {
  try {
    return fs.readdirSync(dir).filter((name) => !name.startsWith('.'))
  } catch {
    return []
  }
}

function iconToDataUri(iconPath: string): string | null {
  try {
    const buf = fs.readFileSync(iconPath)
    const ext = path.extname(iconPath).toLowerCase()
    const mime = ext === '.svg' ? 'image/svg+xml'
      : ext === '.webp' ? 'image/webp'
        : 'image/png'

    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

function resolveI18n(raw: string, versionDir: string, defaultLocale?: string): string {
  const match = /^__MSG_(\w+)__$/.exec(raw)

  if (!match) { return raw }

  const key = match[1]
  const locale = defaultLocale ?? 'en'
  const candidates = [locale, 'en', 'en_US']

  for (const loc of candidates) {
    const msgPath = path.join(versionDir, '_locales', loc, 'messages.json')

    try {
      const messages = JSON.parse(fs.readFileSync(msgPath, 'utf-8')) as Record<string, { message?: string }>
      const entry = messages[key] ?? messages[key.toLowerCase()]

      if (entry?.message) { return entry.message }
    } catch {
      continue
    }
  }

  return raw
}

export function clearBrowserData(workspaceId: string): boolean {
  const profileDir = path.join(os.homedir(), '.agentgrid', 'chrome-profiles', workspaceId)

  if (!fs.existsSync(profileDir)) { return false }

  fs.rmSync(profileDir, { recursive: true, force: true })

  return true
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
