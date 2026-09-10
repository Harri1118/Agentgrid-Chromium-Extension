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
const node_path_1 = __importDefault(require("node:path"));
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
// ── Bundled Chromium via Playwright ─────────────────────────────────
function getBundledChromiumVersion(extensionRoot) {
    try {
        const browsersJson = node_path_1.default.join(extensionRoot, 'node_modules', 'playwright-core', 'browsers.json');
        if (!node_fs_1.default.existsSync(browsersJson)) {
            return null;
        }
        const data = JSON.parse(node_fs_1.default.readFileSync(browsersJson, 'utf-8'));
        const chromium = data.browsers?.find((b) => b.name === 'chromium');
        return chromium?.browserVersion ?? null;
    }
    catch {
        return null;
    }
}
function installBundledChromium(extensionRoot) {
    try {
        (0, node_child_process_1.execFileSync)('npx', ['playwright-core', 'install', 'chromium'], {
            cwd: extensionRoot,
            stdio: 'inherit',
            timeout: 120_000,
        });
        console.log('[chromium-engine] bundled Chromium installed');
    }
    catch (err) {
        console.error('[chromium-engine] failed to install bundled Chromium:', err);
    }
}
// ── Activate ────────────────────────────────────────────────────────
async function activate(context) {
    console.log('[chromium-engine] activating');
    const extensionRoot = node_path_1.default.join(__dirname, '..');
    registerSystemChrome(context);
    registerBundledChromium(context, extensionRoot);
    const currentEngine = __agentgrid_api.settings.get('browserEngine');
    if (!currentEngine || currentEngine === 'built-in') {
        __agentgrid_api.settings.update('browserEngine', 'chrome-bundled');
        console.log('[chromium-engine] auto-activated chrome-bundled as default engine');
    }
}
function registerSystemChrome(context) {
    const chromePath = findChromePath();
    if (!chromePath) {
        console.log('[chromium-engine] system Chrome not found, skipping system engine');
        return;
    }
    const version = getChromeVersion(chromePath);
    if (!version) {
        console.warn('[chromium-engine] could not detect system Chrome version');
        return;
    }
    const userAgent = buildChromeUserAgent(version);
    console.log(`[chromium-engine] system Chrome ${version} at ${chromePath}`);
    const registration = __agentgrid_api.browserEngines.registerBrowserEngine({
        id: 'chrome-system',
        label: `Google Chrome ${version} (System)`,
        description: `Uses your installed Google Chrome at ${chromePath}`,
        userAgent,
    });
    context.subscriptions.push(registration);
}
function registerBundledChromium(context, extensionRoot) {
    installBundledChromium(extensionRoot);
    const bundledVersion = getBundledChromiumVersion(extensionRoot);
    const bundledUA = buildChromeUserAgent(bundledVersion ?? undefined);
    const label = bundledVersion ? `Chromium ${bundledVersion} (Bundled)` : 'Chromium (Bundled)';
    console.log(`[chromium-engine] bundled Chromium: ${bundledVersion ?? 'unknown version'}`);
    const registration = __agentgrid_api.browserEngines.registerBrowserEngine({
        id: 'chrome-bundled',
        label,
        description: 'Standalone Chromium managed by AgentGrid — independent of your system browser',
        userAgent: bundledUA,
    });
    context.subscriptions.push(registration);
}
function deactivate() {
    console.log('[chromium-engine] deactivated');
}
