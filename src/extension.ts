import { execFileSync } from 'node:child_process'
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

type AgentGridApi = {
  browserEngines: {
    registerBrowserEngine(engine: {
      id: string
      label: string
      description?: string
    }): Disposable
  }
}

declare const __agentgrid_api: AgentGridApi

function ensureChromium(extensionRoot: string): void {
  try {
    execFileSync('npx', ['playwright-core', 'install', 'chromium'], {
      cwd: extensionRoot,
      stdio: 'inherit',
      timeout: 120_000,
    })

    console.log('[chromium-engine] Chromium installed successfully')
  } catch (err) {
    console.error('[chromium-engine] failed to install Chromium:', err)
  }
}

export async function activate(context: ExtensionContext): Promise<void> {
  console.log('[chromium-engine] activating')

  const registration = __agentgrid_api.browserEngines.registerBrowserEngine({
    id: 'chromium',
    label: 'Chromium',
    description: 'Standalone Chromium browser engine via Playwright',
  })

  context.subscriptions.push(registration)

  const extensionRoot = path.join(__dirname, '..')

  ensureChromium(extensionRoot)
}

export function deactivate(): void {
  console.log('[chromium-engine] deactivated')
}
