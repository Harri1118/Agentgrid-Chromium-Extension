"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const node_child_process_1 = require("node:child_process");
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const electron_1 = require("electron");
const cdp_manager_1 = require("./cdp-manager");
const cdp_connection_1 = require("./cdp-connection");
const crx_manager_1 = require("./crx-manager");
const profile_manager_1 = require("./profile-manager");
// ── System Chrome detection ─────────────────────────────────────────
const CHROME_PATHS = {
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    win32: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ],
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'],
};
function findChromePath() {
    const candidates = CHROME_PATHS[node_os_1.default.platform()] ?? [];
    for (const p of candidates) {
        if (node_fs_1.default.existsSync(p)) {
            return p;
        }
    }
    return null;
}
function getChromeVersion(chromePath) {
    try {
        const output = (0, node_child_process_1.execFileSync)(chromePath, ['--version'], {
            timeout: 5_000,
            encoding: 'utf-8',
        });
        const match = output.match(/(\d+\.\d+\.\d+\.\d+)/);
        return match?.[1] ?? null;
    }
    catch {
        return null;
    }
}
const FALLBACK_CHROME_VERSION = '130.0.6723.117';
function buildChromeUserAgent(version) {
    const platform = node_os_1.default.platform();
    const v = version || FALLBACK_CHROME_VERSION;
    const osString = platform === 'darwin'
        ? 'Macintosh; Intel Mac OS X 10_15_7'
        : platform === 'win32'
            ? 'Windows NT 10.0; Win64; x64'
            : 'X11; Linux x86_64';
    return `Mozilla/5.0 (${osString}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36`;
}
// ── CDP connections (screencast sessions) ───────────────────────────
const cdpConnections = new Map();
// Track which partitions have had Chrome extensions loaded
const loadedPartitions = new Set();
// ── Electron session.loadExtension helpers ──────────────────────────
const API_STUBS_FILENAME = 'agentgrid-api-stubs.js';
function findLeafChunk(extPath, swContent) {
    const importRe = /from\s*["']([^"']+)["']/g;
    const swDir = node_path_1.default.dirname(extPath);
    let match;
    const chunkRefs = new Set();
    while ((match = importRe.exec(swContent)) !== null) {
        const ref = match[1];
        if (ref.includes('chunk-'))
            chunkRefs.add(ref.replace(/^\.\.\//, '').replace(/^\.\//, ''));
    }
    let bestLeaf = null;
    let bestImportCount = 0;
    for (const chunkName of chunkRefs) {
        const chunkPath = node_path_1.default.join(extPath, chunkName);
        try {
            const content = node_fs_1.default.readFileSync(chunkPath, 'utf-8');
            const hasImports = /^import\s/m.test(content);
            if (!hasImports) {
                const importedBy = node_fs_1.default.readdirSync(extPath)
                    .filter((f) => f.endsWith('.js') && f !== chunkName)
                    .filter((f) => {
                    try {
                        return node_fs_1.default.readFileSync(node_path_1.default.join(extPath, f), 'utf-8').includes(chunkName);
                    }
                    catch {
                        return false;
                    }
                }).length;
                if (importedBy > bestImportCount) {
                    bestImportCount = importedBy;
                    bestLeaf = chunkName;
                }
            }
        }
        catch { }
    }
    return bestLeaf;
}
function patchExtensionWithStubs(extPath, pluginDir) {
    const destStubPath = node_path_1.default.join(extPath, API_STUBS_FILENAME);
    if (node_fs_1.default.existsSync(destStubPath)) {
        return;
    }
    const srcStubPath = node_path_1.default.join(pluginDir, 'dist', 'chrome-api-stubs.js');
    if (!node_fs_1.default.existsSync(srcStubPath)) {
        return;
    }
    node_fs_1.default.copyFileSync(srcStubPath, destStubPath);
    const manifestPath = node_path_1.default.join(extPath, 'manifest.json');
    try {
        const manifest = JSON.parse(node_fs_1.default.readFileSync(manifestPath, 'utf-8'));
        if (manifest.background?.service_worker) {
            const swPath = node_path_1.default.join(extPath, manifest.background.service_worker);
            const swContent = node_fs_1.default.readFileSync(swPath, 'utf-8');
            const stubMarker = '/* agentgrid-api-stubs */';
            const isModule = manifest.background.type === 'module';
            if (!swContent.includes(stubMarker)) {
                const stubContent = node_fs_1.default.readFileSync(destStubPath, 'utf-8');
                if (isModule) {
                    const leafChunk = findLeafChunk(extPath, swContent);
                    if (leafChunk) {
                        const leafPath = node_path_1.default.join(extPath, leafChunk);
                        const leafContent = node_fs_1.default.readFileSync(leafPath, 'utf-8');
                        if (!leafContent.includes(stubMarker)) {
                            node_fs_1.default.writeFileSync(leafPath, `${stubMarker}\n${stubContent}\n;\n${leafContent}`);
                            console.log(`[chromium-engine] patched ${leafChunk} (leaf chunk) with API stubs`);
                        }
                    }
                    const importLines = [];
                    const codeLines = [];
                    for (const line of swContent.split('\n')) {
                        if (codeLines.length === 0 && /^import\s/.test(line.trimStart())) {
                            importLines.push(line);
                        }
                        else {
                            codeLines.push(line);
                        }
                    }
                    const patched = [...importLines, `${stubMarker}`, stubContent, ';', ...codeLines].join('\n');
                    node_fs_1.default.writeFileSync(swPath, patched);
                    console.log(`[chromium-engine] patched ${manifest.background.service_worker} with API stubs (inlined after imports)`);
                }
                else {
                    node_fs_1.default.writeFileSync(swPath, `${stubMarker}\n${stubContent}\n;\n${swContent}`);
                    console.log(`[chromium-engine] patched ${manifest.background.service_worker} with API stubs (inlined)`);
                }
            }
        }
        else if (manifest.background?.scripts) {
            const alreadyHasStubs = manifest.background.scripts.includes(API_STUBS_FILENAME);
            if (!alreadyHasStubs) {
                manifest.background.scripts.unshift(API_STUBS_FILENAME);
                node_fs_1.default.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
                console.log('[chromium-engine] patched manifest.json background.scripts with API stubs');
            }
        }
    }
    catch (err) {
        console.warn('[chromium-engine] failed to patch extension with stubs:', err.message);
    }
}
async function loadExtensionsIntoPartition(partition, extPaths) {
    const ses = electron_1.session.fromPartition(partition);
    let loaded = 0;
    for (const extPath of extPaths) {
        try {
            await ses.loadExtension(extPath, { allowFileAccess: true });
            loaded++;
        }
        catch (err) {
            console.warn(`[chromium-engine] failed to load extension ${extPath}:`, err.message);
        }
    }
    return loaded;
}
function removeExtensionFromPartition(partition, extensionId) {
    try {
        const ses = electron_1.session.fromPartition(partition);
        ses.removeExtension(extensionId);
    }
    catch (err) {
        console.warn(`[chromium-engine] failed to remove extension ${extensionId}:`, err.message);
    }
}
// ── Activate ────────────────────────────────────────────────────────
async function activate(context) {
    console.log('[chromium-engine] activating');
    const chromePath = findChromePath();
    const chromeVersion = chromePath ? getChromeVersion(chromePath) : null;
    registerLightweightEngine(context, chromeVersion);
    registerFullChromeEngine(context, chromePath, chromeVersion);
    registerCdpCommands(context, chromePath);
    registerChromeExtCommands(context, context.extensionPath);
    registerProfileCommands(context);
    // Auto-update installed Chrome extensions in the background
    (0, crx_manager_1.updateAllExtensions)().catch((err) => {
        console.warn('[chromium-engine] background extension update failed:', err.message);
    });
    console.log('[chromium-engine] engines registered, user can switch via Settings or context menu');
}
function registerLightweightEngine(context, chromeVersion) {
    const userAgent = buildChromeUserAgent(chromeVersion ?? undefined);
    console.log('[chromium-engine] lightweight engine: Chrome (Lightweight)');
    const registration = __agentgrid_api.browserEngines.registerBrowserEngine({
        id: 'chrome-lightweight',
        label: 'Chrome (Lightweight)',
        description: 'Chrome UA with support for Chrome Web Store extensions via Electron',
        userAgent,
    });
    context.subscriptions.push(registration);
}
function registerFullChromeEngine(context, chromePath, chromeVersion) {
    if (!chromePath) {
        console.log('[chromium-engine] system Chrome not found, skipping full Chrome engine');
        return;
    }
    const versionLabel = chromeVersion ? ` ${chromeVersion}` : '';
    console.log(`[chromium-engine] full Chrome engine: ${chromePath}`);
    const registration = __agentgrid_api.browserEngines.registerBrowserEngine({
        id: 'chrome-full',
        label: `Google Chrome${versionLabel}`,
        description: 'Full Google Chrome rendering via screen streaming',
    });
    context.subscriptions.push(registration);
}
// ── Chrome extension management commands ────────────────────────────
function registerChromeExtCommands(context, pluginDir) {
    const reg = (id, handler) => {
        context.subscriptions.push(__agentgrid_api.commands.registerCommand(id, handler));
    };
    reg('chromeExt.install', async (...args) => {
        const opts = args[0];
        try {
            const meta = await (0, crx_manager_1.installExtension)(opts.extensionId);
            if (meta.extensionDir) {
                patchExtensionWithStubs(meta.extensionDir, pluginDir);
            }
            if (opts.partition) {
                const extPaths = (0, crx_manager_1.getEnabledExtensionPaths)();
                await loadExtensionsIntoPartition(opts.partition, extPaths);
            }
            return { ok: true, extension: meta };
        }
        catch (err) {
            return { ok: false, error: err.message };
        }
    });
    reg('chromeExt.uninstall', async (...args) => {
        const opts = args[0];
        try {
            (0, crx_manager_1.uninstallExtension)(opts.extensionId);
            if (opts.partition) {
                removeExtensionFromPartition(opts.partition, opts.extensionId);
            }
            return { ok: true };
        }
        catch (err) {
            return { ok: false, error: err.message };
        }
    });
    reg('chromeExt.toggle', async (...args) => {
        const opts = args[0];
        try {
            (0, crx_manager_1.toggleExtension)(opts.extensionId, opts.enabled);
            return { ok: true };
        }
        catch (err) {
            return { ok: false, error: err.message };
        }
    });
    reg('chromeExt.list', () => {
        return (0, crx_manager_1.listInstalledChromeExtensions)();
    });
    reg('chromeExt.update', async (...args) => {
        const opts = args[0];
        try {
            const result = await (0, crx_manager_1.updateExtension)(opts.extensionId);
            return { ok: true, ...result };
        }
        catch (err) {
            return { ok: false, error: err.message };
        }
    });
    reg('chromeExt.updateAll', async () => {
        try {
            await (0, crx_manager_1.updateAllExtensions)();
            return { ok: true };
        }
        catch (err) {
            return { ok: false, error: err.message };
        }
    });
    reg('chromeExt.resolvePopupUrl', (...args) => {
        const opts = args[0];
        try {
            const ses = electron_1.session.fromPartition(opts.partition);
            const loaded = ses.getAllExtensions();
            const normalizedTarget = opts.extensionDir.replace(/\/+$/, '');
            const match = loaded.find((ext) => ext.path.replace(/\/+$/, '') === normalizedTarget);
            if (!match) {
                return { ok: false, error: 'Extension not loaded in this partition' };
            }
            return { ok: true, url: `chrome-extension://${match.id}/${opts.popupPath}` };
        }
        catch (err) {
            return { ok: false, error: err.message };
        }
    });
    reg('chromeExt.openPopup', (...args) => {
        const opts = args[0];
        try {
            const ses = electron_1.session.fromPartition(opts.partition);
            const loaded = ses.getAllExtensions();
            const normalizedTarget = opts.extensionDir.replace(/\/+$/, '');
            const match = loaded.find((ext) => ext.path.replace(/\/+$/, '') === normalizedTarget);
            if (!match) {
                return { ok: false, error: 'Extension not loaded in this partition' };
            }
            const popupUrl = `chrome-extension://${match.id}/${opts.popupPath}`;
            const popup = new electron_1.BrowserWindow({
                width: 400,
                height: 600,
                x: Math.round(opts.x),
                y: Math.round(opts.y),
                frame: false,
                resizable: true,
                skipTaskbar: true,
                alwaysOnTop: true,
                webPreferences: {
                    session: ses,
                    contextIsolation: true,
                    sandbox: true,
                },
            });
            popup.loadURL(popupUrl);
            popup.on('blur', () => {
                if (!popup.isDestroyed()) {
                    popup.close();
                }
            });
            return { ok: true };
        }
        catch (err) {
            return { ok: false, error: err.message };
        }
    });
    reg('chromeExt.loadIntoPartition', async (...args) => {
        const opts = args[0];
        if (loadedPartitions.has(opts.partition)) {
            return { ok: true, alreadyLoaded: true };
        }
        try {
            const extPaths = (0, crx_manager_1.getEnabledExtensionPaths)();
            if (extPaths.length === 0) {
                loadedPartitions.add(opts.partition);
                return { ok: true, loaded: 0 };
            }
            for (const extPath of extPaths) {
                patchExtensionWithStubs(extPath, pluginDir);
            }
            const loaded = await loadExtensionsIntoPartition(opts.partition, extPaths);
            loadedPartitions.add(opts.partition);
            console.log(`[chromium-engine] loaded ${loaded} Chrome extension(s) into ${opts.partition}`);
            return { ok: true, loaded };
        }
        catch (err) {
            return { ok: false, error: err.message };
        }
    });
}
// ── Browser profile commands ─────────────────────────────────────────
function registerProfileCommands(context) {
    const reg = (id, handler) => {
        context.subscriptions.push(__agentgrid_api.commands.registerCommand(id, handler));
    };
    reg('browserProfile.list', () => {
        return (0, profile_manager_1.listProfiles)();
    });
    reg('browserProfile.getActive', () => {
        return (0, profile_manager_1.getActiveProfileId)();
    });
    reg('browserProfile.create', (...args) => {
        const opts = args[0];
        try {
            const profile = (0, profile_manager_1.createProfile)(opts.name);
            return { ok: true, profile };
        }
        catch (err) {
            return { ok: false, error: err.message };
        }
    });
    reg('browserProfile.delete', (...args) => {
        const opts = args[0];
        try {
            (0, profile_manager_1.deleteProfile)(opts.profileId);
            return { ok: true };
        }
        catch (err) {
            return { ok: false, error: err.message };
        }
    });
    reg('browserProfile.rename', (...args) => {
        const opts = args[0];
        try {
            (0, profile_manager_1.renameProfile)(opts.profileId, opts.name);
            return { ok: true };
        }
        catch (err) {
            return { ok: false, error: err.message };
        }
    });
    reg('browserProfile.setActive', (...args) => {
        const opts = args[0];
        try {
            (0, profile_manager_1.setActiveProfile)(opts.profileId);
            return { ok: true };
        }
        catch (err) {
            return { ok: false, error: err.message };
        }
    });
}
let onFrameCallback = null;
let onSessionEndCallback = null;
function registerCdpCommands(context, chromePath) {
    const reg = (id, handler) => {
        context.subscriptions.push(__agentgrid_api.commands.registerCommand(id, handler));
    };
    reg('cdp.launch', async (...args) => {
        const opts = args[0];
        if (!chromePath) {
            return { ok: false, error: 'Google Chrome is not installed' };
        }
        try {
            const cdpSession = await (0, cdp_manager_1.launchChrome)(chromePath, opts.sessionId, opts.workspaceId, opts.url);
            const conn = new cdp_connection_1.CdpConnection(cdpSession.wsUrl, opts.sessionId, cdpSession.debuggingPort);
            conn.onFrame = (frame) => { onFrameCallback?.(frame); };
            conn.onDisconnect = (reason) => { onSessionEndCallback?.({ sessionId: opts.sessionId, reason }); };
            await conn.connect();
            await conn.startScreencast(opts.width ?? 1280, opts.height ?? 800);
            cdpConnections.set(opts.sessionId, conn);
            return { ok: true, wsUrl: cdpSession.wsUrl };
        }
        catch (err) {
            return { ok: false, error: err.message };
        }
    });
    reg('cdp.navigate', async (...args) => {
        const opts = args[0];
        const conn = cdpConnections.get(opts.sessionId);
        if (conn) {
            await conn.navigate(opts.url);
        }
    });
    reg('cdp.close', async (...args) => {
        const opts = args[0];
        const conn = cdpConnections.get(opts.sessionId);
        if (conn) {
            conn.disconnect();
            cdpConnections.delete(opts.sessionId);
        }
        (0, cdp_manager_1.killSession)(opts.sessionId);
    });
    reg('cdp.resize', async (...args) => {
        const opts = args[0];
        const conn = cdpConnections.get(opts.sessionId);
        if (conn) {
            await conn.resize(opts.width, opts.height);
        }
    });
    reg('cdp.inputMouse', async (...args) => {
        const opts = args[0];
        const conn = cdpConnections.get(opts.sessionId);
        if (conn) {
            await conn.inputMouse(opts);
        }
    });
    reg('cdp.inputKey', async (...args) => {
        const opts = args[0];
        const conn = cdpConnections.get(opts.sessionId);
        if (conn) {
            await conn.inputKey(opts);
        }
    });
    reg('cdp.inputScroll', async (...args) => {
        const opts = args[0];
        const conn = cdpConnections.get(opts.sessionId);
        if (conn) {
            await conn.inputScroll(opts);
        }
    });
    reg('cdp.openExtensionPopup', (...args) => {
        const opts = args[0];
        if (!chromePath) {
            return { ok: false, error: 'Google Chrome is not installed' };
        }
        (0, cdp_manager_1.openExtensionPopupWindow)(chromePath, opts.sessionId, opts.extensionId, opts.popupPath);
        return { ok: true };
    });
    reg('cdp.clearData', async (...args) => {
        const opts = args[0];
        return { ok: (0, cdp_manager_1.clearBrowserData)(opts.workspaceId) };
    });
    reg('cdp.openExtensionManager', (...args) => {
        const opts = args[0];
        if (!chromePath) {
            return { ok: false, error: 'Google Chrome is not installed' };
        }
        (0, cdp_manager_1.openChromeForExtensions)(chromePath, opts.workspaceId);
        return { ok: true };
    });
    reg('cdp.listExtensions', (...args) => {
        const opts = args[0];
        return (0, cdp_manager_1.listInstalledExtensions)(opts.workspaceId);
    });
    reg('cdp.removeExtension', (...args) => {
        const opts = args[0];
        return { ok: (0, cdp_manager_1.removeInstalledExtension)(opts.workspaceId, opts.extensionId) };
    });
    reg('cdp.setFrameCallback', (...args) => {
        const opts = args[0];
        onFrameCallback = opts.callback;
    });
    reg('cdp.setSessionEndCallback', (...args) => {
        const opts = args[0];
        onSessionEndCallback = opts.callback;
    });
}
function deactivate() {
    for (const conn of cdpConnections.values()) {
        conn.disconnect();
    }
    cdpConnections.clear();
    (0, cdp_manager_1.killAllSessions)();
    loadedPartitions.clear();
    console.log('[chromium-engine] deactivated');
}
