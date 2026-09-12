"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installExtension = installExtension;
exports.uninstallExtension = uninstallExtension;
exports.toggleExtension = toggleExtension;
exports.listInstalledChromeExtensions = listInstalledChromeExtensions;
exports.getExtensionPath = getExtensionPath;
exports.getEnabledExtensionPaths = getEnabledExtensionPaths;
exports.updateExtension = updateExtension;
exports.updateAllExtensions = updateAllExtensions;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const node_https_1 = __importDefault(require("node:https"));
const node_http_1 = __importDefault(require("node:http"));
const node_child_process_1 = require("node:child_process");
const EXTENSIONS_DIR = node_path_1.default.join(node_os_1.default.homedir(), '.agentgrid', 'browser', 'extensions');
const REGISTRY_PATH = node_path_1.default.join(EXTENSIONS_DIR, 'registry.json');
function ensureDir(dir) {
    node_fs_1.default.mkdirSync(dir, { recursive: true });
}
function readRegistry() {
    try {
        if (node_fs_1.default.existsSync(REGISTRY_PATH)) {
            return JSON.parse(node_fs_1.default.readFileSync(REGISTRY_PATH, 'utf-8'));
        }
    }
    catch { }
    return { extensions: [] };
}
function writeRegistry(registry) {
    ensureDir(EXTENSIONS_DIR);
    node_fs_1.default.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}
function buildCrxUrl(extensionId) {
    const prodVersion = '137.0.7151.69';
    return `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&prodversion=${prodVersion}&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`;
}
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const follow = (currentUrl, redirectCount) => {
            if (redirectCount > 5) {
                reject(new Error('Too many redirects'));
                return;
            }
            const client = currentUrl.startsWith('https') ? node_https_1.default : node_http_1.default;
            client.get(currentUrl, (res) => {
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    follow(res.headers.location, redirectCount + 1);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`Download failed: HTTP ${res.statusCode}`));
                    return;
                }
                const stream = node_fs_1.default.createWriteStream(dest);
                res.pipe(stream);
                stream.on('finish', () => { stream.close(); resolve(); });
                stream.on('error', reject);
            }).on('error', reject);
        };
        follow(url, 0);
    });
}
// CRX3 format: "Cr24" magic (4 bytes) + version u32 (4) + header_length u32 (4) + header + zip
// We strip the header and extract the zip payload.
function extractCrx(crxPath, destDir) {
    const buf = node_fs_1.default.readFileSync(crxPath);
    const magic = buf.toString('ascii', 0, 4);
    if (magic !== 'Cr24') {
        throw new Error('Not a valid CRX file');
    }
    const headerLen = buf.readUInt32LE(8);
    const zipStart = 12 + headerLen;
    const zipPath = crxPath + '.zip';
    node_fs_1.default.writeFileSync(zipPath, buf.subarray(zipStart));
    ensureDir(destDir);
    // execFileSync is safe here: all arguments are constructed from
    // controlled paths (no user input), and execFile does not spawn a shell.
    try {
        (0, node_child_process_1.execFileSync)('unzip', ['-o', '-q', zipPath, '-d', destDir], { timeout: 30_000 });
    }
    finally {
        try {
            node_fs_1.default.unlinkSync(zipPath);
        }
        catch { }
    }
}
function readManifest(extDir) {
    const manifestPath = node_path_1.default.join(extDir, 'manifest.json');
    if (!node_fs_1.default.existsSync(manifestPath)) {
        return null;
    }
    try {
        return JSON.parse(node_fs_1.default.readFileSync(manifestPath, 'utf-8'));
    }
    catch {
        return null;
    }
}
function resolveI18n(raw, extDir, defaultLocale) {
    const match = /^__MSG_(\w+)__$/.exec(raw);
    if (!match) {
        return raw;
    }
    const key = match[1];
    const candidates = [defaultLocale ?? 'en', 'en', 'en_US'];
    for (const loc of candidates) {
        const msgPath = node_path_1.default.join(extDir, '_locales', loc, 'messages.json');
        try {
            const messages = JSON.parse(node_fs_1.default.readFileSync(msgPath, 'utf-8'));
            const entry = messages[key] ?? messages[key.toLowerCase()];
            if (entry?.message) {
                return entry.message;
            }
        }
        catch {
            continue;
        }
    }
    return raw;
}
function bestIcon(icons, extDir) {
    if (!icons) {
        return null;
    }
    const sizes = Object.keys(icons).map(Number).sort((a, b) => b - a);
    const best = sizes[0] ? icons[String(sizes[0])] : null;
    if (!best) {
        return null;
    }
    const fullPath = node_path_1.default.join(extDir, best);
    return node_fs_1.default.existsSync(fullPath) ? fullPath : null;
}
async function installExtension(extensionId) {
    const registry = readRegistry();
    const existing = registry.extensions.find((e) => e.id === extensionId);
    if (existing) {
        throw new Error(`Extension ${extensionId} is already installed`);
    }
    const extDir = node_path_1.default.join(EXTENSIONS_DIR, extensionId);
    const crxPath = node_path_1.default.join(EXTENSIONS_DIR, `${extensionId}.crx`);
    ensureDir(EXTENSIONS_DIR);
    console.log(`[crx] downloading ${extensionId}`);
    await downloadFile(buildCrxUrl(extensionId), crxPath);
    console.log(`[crx] extracting ${extensionId}`);
    extractCrx(crxPath, extDir);
    try {
        node_fs_1.default.unlinkSync(crxPath);
    }
    catch { }
    const manifest = readManifest(extDir);
    if (!manifest) {
        node_fs_1.default.rmSync(extDir, { recursive: true, force: true });
        throw new Error('Downloaded extension has no manifest.json');
    }
    const name = resolveI18n(manifest.name ?? extensionId, extDir, manifest.default_locale);
    const description = resolveI18n(manifest.description ?? '', extDir, manifest.default_locale);
    const meta = {
        id: extensionId,
        name,
        version: manifest.version ?? '0.0.0',
        description,
        enabled: true,
        iconPath: bestIcon(manifest.icons, extDir),
    };
    registry.extensions.push(meta);
    writeRegistry(registry);
    console.log(`[crx] installed ${name} v${meta.version}`);
    return meta;
}
function uninstallExtension(extensionId) {
    const registry = readRegistry();
    const idx = registry.extensions.findIndex((e) => e.id === extensionId);
    if (idx < 0) {
        throw new Error(`Extension ${extensionId} is not installed`);
    }
    registry.extensions.splice(idx, 1);
    writeRegistry(registry);
    const extDir = node_path_1.default.join(EXTENSIONS_DIR, extensionId);
    try {
        node_fs_1.default.rmSync(extDir, { recursive: true, force: true });
    }
    catch { }
    console.log(`[crx] uninstalled ${extensionId}`);
}
function toggleExtension(extensionId, enabled) {
    const registry = readRegistry();
    const ext = registry.extensions.find((e) => e.id === extensionId);
    if (!ext) {
        throw new Error(`Extension ${extensionId} is not installed`);
    }
    ext.enabled = enabled;
    writeRegistry(registry);
}
function listInstalledChromeExtensions() {
    return readRegistry().extensions;
}
function getExtensionPath(extensionId) {
    const extDir = node_path_1.default.join(EXTENSIONS_DIR, extensionId);
    return node_fs_1.default.existsSync(extDir) ? extDir : null;
}
function getEnabledExtensionPaths() {
    const registry = readRegistry();
    return registry.extensions
        .filter((e) => e.enabled)
        .map((e) => node_path_1.default.join(EXTENSIONS_DIR, e.id))
        .filter((p) => node_fs_1.default.existsSync(p));
}
async function updateExtension(extensionId) {
    const registry = readRegistry();
    const existing = registry.extensions.find((e) => e.id === extensionId);
    if (!existing) {
        throw new Error(`Extension ${extensionId} is not installed`);
    }
    const oldVersion = existing.version;
    const tempDir = node_path_1.default.join(EXTENSIONS_DIR, `${extensionId}_update`);
    const crxPath = node_path_1.default.join(EXTENSIONS_DIR, `${extensionId}_update.crx`);
    try {
        await downloadFile(buildCrxUrl(extensionId), crxPath);
        extractCrx(crxPath, tempDir);
        const manifest = readManifest(tempDir);
        if (!manifest?.version) {
            return { updated: false, oldVersion, newVersion: oldVersion };
        }
        if (manifest.version === oldVersion) {
            return { updated: false, oldVersion, newVersion: oldVersion };
        }
        const extDir = node_path_1.default.join(EXTENSIONS_DIR, extensionId);
        node_fs_1.default.rmSync(extDir, { recursive: true, force: true });
        node_fs_1.default.renameSync(tempDir, extDir);
        const name = resolveI18n(manifest.name ?? extensionId, extDir, manifest.default_locale);
        existing.name = name;
        existing.version = manifest.version;
        existing.description = resolveI18n(manifest.description ?? '', extDir, manifest.default_locale);
        existing.iconPath = bestIcon(manifest.icons, extDir);
        writeRegistry(registry);
        console.log(`[crx] updated ${name}: ${oldVersion} → ${manifest.version}`);
        return { updated: true, oldVersion, newVersion: manifest.version };
    }
    finally {
        try {
            node_fs_1.default.unlinkSync(crxPath);
        }
        catch { }
        try {
            node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        }
        catch { }
    }
}
async function updateAllExtensions() {
    const registry = readRegistry();
    for (const ext of registry.extensions) {
        try {
            await updateExtension(ext.id);
        }
        catch (err) {
            console.warn(`[crx] failed to update ${ext.id}:`, err.message);
        }
    }
}
