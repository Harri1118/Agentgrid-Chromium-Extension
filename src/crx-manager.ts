import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import https from 'node:https'
import http from 'node:http'
import { execFileSync } from 'node:child_process'

export type ChromeExtensionMeta = {
  id: string
  name: string
  version: string
  description: string
  enabled: boolean
  iconPath: string | null
  popupPath: string | null
  iconDataUri: string | null
  extensionDir: string | null
}

type Registry = {
  extensions: ChromeExtensionMeta[]
}

const EXTENSIONS_DIR = path.join(os.homedir(), '.agentgrid', 'browser', 'extensions')
const REGISTRY_PATH = path.join(EXTENSIONS_DIR, 'registry.json')

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

function readRegistry(): Registry {
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8')) as Registry
    }
  } catch {}

  return { extensions: [] }
}

function writeRegistry(registry: Registry): void {
  ensureDir(EXTENSIONS_DIR)
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2))
}

function buildCrxUrl(extensionId: string): string {
  const prodVersion = '137.0.7151.69'

  return `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&prodversion=${prodVersion}&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const follow = (currentUrl: string, redirectCount: number): void => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'))

        return
      }

      const client = currentUrl.startsWith('https') ? https : http

      client.get(currentUrl, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          follow(res.headers.location, redirectCount + 1)

          return
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${res.statusCode}`))

          return
        }

        const stream = fs.createWriteStream(dest)

        res.pipe(stream)
        stream.on('finish', () => { stream.close(); resolve() })
        stream.on('error', reject)
      }).on('error', reject)
    }

    follow(url, 0)
  })
}

// CRX3 format: "Cr24" magic (4 bytes) + version u32 (4) + header_length u32 (4) + header + zip
// We strip the header and extract the zip payload.
function extractCrx(crxPath: string, destDir: string): void {
  const buf = fs.readFileSync(crxPath)
  const magic = buf.toString('ascii', 0, 4)

  if (magic !== 'Cr24') {
    throw new Error('Not a valid CRX file')
  }

  const headerLen = buf.readUInt32LE(8)
  const zipStart = 12 + headerLen
  const zipPath = crxPath + '.zip'

  fs.writeFileSync(zipPath, buf.subarray(zipStart))

  ensureDir(destDir)

  // execFileSync is safe here: all arguments are constructed from
  // controlled paths (no user input), and execFile does not spawn a shell.
  try {
    execFileSync('unzip', ['-o', '-q', zipPath, '-d', destDir], { timeout: 30_000 })
  } finally {
    try { fs.unlinkSync(zipPath) } catch {}
  }
}

function iconToDataUri(iconPath: string): string | null {
  try {
    const buf = fs.readFileSync(iconPath)
    const ext = path.extname(iconPath).toLowerCase()
    const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.webp' ? 'image/webp' : 'image/png'

    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

type Manifest = {
  name?: string
  version?: string
  description?: string
  icons?: Record<string, string>
  default_locale?: string
  action?: { default_popup?: string }
  browser_action?: { default_popup?: string }
}

function readManifest(extDir: string): Manifest | null {
  const manifestPath = path.join(extDir, 'manifest.json')

  if (!fs.existsSync(manifestPath)) { return null }

  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  } catch {
    return null
  }
}

function resolveI18n(raw: string, extDir: string, defaultLocale?: string): string {
  const match = /^__MSG_(\w+)__$/.exec(raw)

  if (!match) { return raw }

  const key = match[1]
  const candidates = [defaultLocale ?? 'en', 'en', 'en_US']

  for (const loc of candidates) {
    const msgPath = path.join(extDir, '_locales', loc, 'messages.json')

    try {
      const messages = JSON.parse(fs.readFileSync(msgPath, 'utf-8')) as Record<string, { message?: string }>
      const entry = messages[key] ?? messages[key.toLowerCase()]

      if (entry?.message) { return entry.message }
    } catch { continue }
  }

  return raw
}

function bestIcon(icons: Record<string, string> | undefined, extDir: string): string | null {
  if (!icons) { return null }

  const sizes = Object.keys(icons).map(Number).sort((a, b) => b - a)
  const best = sizes[0] ? icons[String(sizes[0])] : null

  if (!best) { return null }

  const fullPath = path.join(extDir, best)

  return fs.existsSync(fullPath) ? fullPath : null
}

export async function installExtension(extensionId: string): Promise<ChromeExtensionMeta> {
  const registry = readRegistry()
  const existing = registry.extensions.find((e) => e.id === extensionId)

  if (existing) {
    throw new Error(`Extension ${extensionId} is already installed`)
  }

  const extDir = path.join(EXTENSIONS_DIR, extensionId)
  const crxPath = path.join(EXTENSIONS_DIR, `${extensionId}.crx`)

  ensureDir(EXTENSIONS_DIR)

  console.log(`[crx] downloading ${extensionId}`)
  await downloadFile(buildCrxUrl(extensionId), crxPath)

  console.log(`[crx] extracting ${extensionId}`)
  extractCrx(crxPath, extDir)

  try { fs.unlinkSync(crxPath) } catch {}

  const manifest = readManifest(extDir)

  if (!manifest) {
    fs.rmSync(extDir, { recursive: true, force: true })
    throw new Error('Downloaded extension has no manifest.json')
  }

  const name = resolveI18n(manifest.name ?? extensionId, extDir, manifest.default_locale)
  const description = resolveI18n(manifest.description ?? '', extDir, manifest.default_locale)

  const iconFsPath = bestIcon(manifest.icons, extDir)
  const popupPath = manifest.action?.default_popup
    ?? manifest.browser_action?.default_popup
    ?? null

  const meta: ChromeExtensionMeta = {
    id: extensionId,
    name,
    version: manifest.version ?? '0.0.0',
    description,
    enabled: true,
    iconPath: iconFsPath,
    popupPath,
    iconDataUri: iconFsPath ? iconToDataUri(iconFsPath) : null,
    extensionDir: extDir,
  }

  registry.extensions.push(meta)
  writeRegistry(registry)

  console.log(`[crx] installed ${name} v${meta.version}`)

  return meta
}

export function uninstallExtension(extensionId: string): void {
  const registry = readRegistry()
  const idx = registry.extensions.findIndex((e) => e.id === extensionId)

  if (idx < 0) {
    throw new Error(`Extension ${extensionId} is not installed`)
  }

  registry.extensions.splice(idx, 1)
  writeRegistry(registry)

  const extDir = path.join(EXTENSIONS_DIR, extensionId)

  try { fs.rmSync(extDir, { recursive: true, force: true }) } catch {}

  console.log(`[crx] uninstalled ${extensionId}`)
}

export function toggleExtension(extensionId: string, enabled: boolean): void {
  const registry = readRegistry()
  const ext = registry.extensions.find((e) => e.id === extensionId)

  if (!ext) {
    throw new Error(`Extension ${extensionId} is not installed`)
  }

  ext.enabled = enabled
  writeRegistry(registry)
}

export function listInstalledChromeExtensions(): ChromeExtensionMeta[] {
  const registry = readRegistry()
  let dirty = false

  for (const ext of registry.extensions) {
    const extDir = path.join(EXTENSIONS_DIR, ext.id)

    if (!ext.extensionDir) {
      ext.extensionDir = extDir
      dirty = true
    }

    if (ext.popupPath !== undefined && ext.iconDataUri !== undefined) { continue }

    const manifest = readManifest(extDir)

    if (!manifest) { continue }

    ext.popupPath = manifest.action?.default_popup ?? manifest.browser_action?.default_popup ?? null

    const iconFsPath = bestIcon(manifest.icons, extDir)

    ext.iconDataUri = iconFsPath ? iconToDataUri(iconFsPath) : null

    if (!ext.iconPath && iconFsPath) { ext.iconPath = iconFsPath }

    dirty = true
  }

  if (dirty) { writeRegistry(registry) }

  return registry.extensions
}

export function getExtensionPath(extensionId: string): string | null {
  const extDir = path.join(EXTENSIONS_DIR, extensionId)

  return fs.existsSync(extDir) ? extDir : null
}

export function getEnabledExtensionPaths(): string[] {
  const registry = readRegistry()

  return registry.extensions
    .filter((e) => e.enabled)
    .map((e) => path.join(EXTENSIONS_DIR, e.id))
    .filter((p) => fs.existsSync(p))
}

export async function updateExtension(extensionId: string): Promise<{ updated: boolean; oldVersion: string; newVersion: string }> {
  const registry = readRegistry()
  const existing = registry.extensions.find((e) => e.id === extensionId)

  if (!existing) {
    throw new Error(`Extension ${extensionId} is not installed`)
  }

  const oldVersion = existing.version
  const tempDir = path.join(EXTENSIONS_DIR, `${extensionId}_update`)
  const crxPath = path.join(EXTENSIONS_DIR, `${extensionId}_update.crx`)

  try {
    await downloadFile(buildCrxUrl(extensionId), crxPath)
    extractCrx(crxPath, tempDir)

    const manifest = readManifest(tempDir)

    if (!manifest?.version) {
      return { updated: false, oldVersion, newVersion: oldVersion }
    }

    if (manifest.version === oldVersion) {
      return { updated: false, oldVersion, newVersion: oldVersion }
    }

    const extDir = path.join(EXTENSIONS_DIR, extensionId)

    fs.rmSync(extDir, { recursive: true, force: true })
    fs.renameSync(tempDir, extDir)

    const name = resolveI18n(manifest.name ?? extensionId, extDir, manifest.default_locale)

    const updatedIconPath = bestIcon(manifest.icons, extDir)

    existing.name = name
    existing.version = manifest.version
    existing.description = resolveI18n(manifest.description ?? '', extDir, manifest.default_locale)
    existing.iconPath = updatedIconPath
    existing.popupPath = manifest.action?.default_popup ?? manifest.browser_action?.default_popup ?? null
    existing.iconDataUri = updatedIconPath ? iconToDataUri(updatedIconPath) : null
    existing.extensionDir = extDir
    writeRegistry(registry)

    console.log(`[crx] updated ${name}: ${oldVersion} → ${manifest.version}`)

    return { updated: true, oldVersion, newVersion: manifest.version }
  } finally {
    try { fs.unlinkSync(crxPath) } catch {}
    try { fs.rmSync(tempDir, { recursive: true, force: true }) } catch {}
  }
}

export async function updateAllExtensions(): Promise<void> {
  const registry = readRegistry()

  for (const ext of registry.extensions) {
    try {
      await updateExtension(ext.id)
    } catch (err) {
      console.warn(`[crx] failed to update ${ext.id}:`, (err as Error).message)
    }
  }
}
