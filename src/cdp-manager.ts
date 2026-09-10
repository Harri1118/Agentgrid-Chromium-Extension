import { execFile, type ChildProcess } from 'node:child_process'
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
  const userDataDir = buildUserDataDir(workspaceId)
  const url = startUrl || 'about:blank'

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-sync',
    url,
  ]

  return new Promise((resolve, reject) => {
    const proc = execFile(chromePath, args, { windowsHide: true })

    proc.on('error', (err) => {
      reject(new Error(`Failed to launch Chrome: ${err.message}`))
    })

    let settled = false

    const tryConnect = (attempt: number): void => {
      if (attempt > 20) {
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

    setTimeout(() => tryConnect(0), 300)
  })
}

export function getSession(sessionId: string): CdpSession | undefined {
  return activeSessions.get(sessionId)
}

export function killSession(sessionId: string): void {
  const session = activeSessions.get(sessionId)

  if (!session) { return }

  session.chromeProcess.kill()
  activeSessions.delete(sessionId)
}

export function killAllSessions(): void {
  for (const session of activeSessions.values()) {
    session.chromeProcess.kill()
  }

  activeSessions.clear()
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
