"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const node_child_process_1 = require("node:child_process");
const node_os_1 = __importDefault(require("node:os"));
const node_fs_1 = __importDefault(require("node:fs"));
const cdp_manager_1 = require("./cdp-manager");
const cdp_connection_1 = require("./cdp-connection");
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
// ── Activate ────────────────────────────────────────────────────────
async function activate(context) {
    console.log('[chromium-engine] activating');
    const chromePath = findChromePath();
    const chromeVersion = chromePath ? getChromeVersion(chromePath) : null;
    registerLightweightEngine(context, chromeVersion);
    registerFullChromeEngine(context, chromePath, chromeVersion);
    registerCdpCommands(context, chromePath);
    const currentEngine = __agentgrid_api.settings.get('browserEngine');
    if (!currentEngine || currentEngine === 'built-in') {
        __agentgrid_api.settings.update('browserEngine', 'chrome-lightweight');
        console.log('[chromium-engine] auto-activated chrome-lightweight as default engine');
    }
}
function registerLightweightEngine(context, chromeVersion) {
    const userAgent = buildChromeUserAgent(chromeVersion ?? undefined);
    console.log('[chromium-engine] lightweight engine: Chrome (Lightweight)');
    const registration = __agentgrid_api.browserEngines.registerBrowserEngine({
        id: 'chrome-lightweight',
        label: 'Chrome (Lightweight)',
        description: 'Mimics Chrome for site compatibility but does not support Chrome extensions',
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
        description: `Full Google Chrome rendering via screen streaming — real Chrome compatibility but cannot install Chrome Web Store extensions`,
    });
    context.subscriptions.push(registration);
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
            const session = await (0, cdp_manager_1.launchChrome)(chromePath, opts.sessionId, opts.workspaceId, opts.url);
            const conn = new cdp_connection_1.CdpConnection(session.wsUrl, opts.sessionId);
            conn.onFrame = (frame) => { onFrameCallback?.(frame); };
            conn.onDisconnect = (reason) => { onSessionEndCallback?.({ sessionId: opts.sessionId, reason }); };
            await conn.connect();
            await conn.startScreencast(opts.width ?? 1280, opts.height ?? 800);
            cdpConnections.set(opts.sessionId, conn);
            return { ok: true, wsUrl: session.wsUrl };
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
    console.log('[chromium-engine] deactivated');
}
