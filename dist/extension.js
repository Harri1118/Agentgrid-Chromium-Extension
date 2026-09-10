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
// ── Activate ────────────────────────────────────────────────────────
async function activate(context) {
    console.log('[chromium-engine] activating');
    const chromePath = findChromePath();
    const chromeVersion = chromePath ? getChromeVersion(chromePath) : null;
    registerLightweightEngine(context, chromeVersion);
    registerFullChromeEngine(context, chromePath, chromeVersion);
    const currentEngine = __agentgrid_api.settings.get('browserEngine');
    if (!currentEngine || currentEngine === 'built-in') {
        __agentgrid_api.settings.update('browserEngine', 'chrome-lightweight');
        console.log('[chromium-engine] auto-activated chrome-lightweight as default engine');
    }
}
function registerLightweightEngine(context, chromeVersion) {
    const userAgent = buildChromeUserAgent(chromeVersion ?? undefined);
    const versionSuffix = chromeVersion ? ` (Chrome ${chromeVersion} UA)` : '';
    console.log(`[chromium-engine] lightweight engine: Chrome UA${versionSuffix}`);
    const registration = __agentgrid_api.browserEngines.registerBrowserEngine({
        id: 'chrome-lightweight',
        label: `Lightweight${versionSuffix}`,
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
        description: `Full Google Chrome with extension support, rendered via screen streaming from ${chromePath}`,
    });
    context.subscriptions.push(registration);
}
function deactivate() {
    console.log('[chromium-engine] deactivated');
}
