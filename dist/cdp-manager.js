"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchChrome = launchChrome;
exports.getSession = getSession;
exports.killSession = killSession;
exports.killAllSessions = killAllSessions;
exports.openChromeForExtensions = openChromeForExtensions;
exports.listInstalledExtensions = listInstalledExtensions;
exports.clearBrowserData = clearBrowserData;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const node_http_1 = __importDefault(require("node:http"));
const activeSessions = new Map();
let nextPort = 9222;
function allocatePort() {
    return nextPort++;
}
function buildUserDataDir(workspaceId) {
    const base = node_path_1.default.join(node_os_1.default.homedir(), '.agentgrid', 'chrome-profiles', workspaceId);
    node_fs_1.default.mkdirSync(base, { recursive: true });
    return base;
}
function launchChrome(chromePath, sessionId, workspaceId, startUrl) {
    const port = allocatePort();
    const userDataDir = buildUserDataDir(workspaceId);
    const url = startUrl || 'about:blank';
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
    ];
    return new Promise((resolve, reject) => {
        const proc = (0, node_child_process_1.execFile)(chromePath, args, { windowsHide: true });
        proc.on('error', (err) => {
            reject(new Error(`Failed to launch Chrome: ${err.message}`));
        });
        let settled = false;
        const tryConnect = (attempt) => {
            if (attempt > 20) {
                if (!settled) {
                    settled = true;
                    proc.kill();
                    reject(new Error('Chrome did not start in time'));
                }
                return;
            }
            fetchJson(`http://127.0.0.1:${port}/json`)
                .then((targets) => {
                if (settled) {
                    return;
                }
                settled = true;
                const pageTarget = targets.find((t) => t.type === 'page');
                if (!pageTarget) {
                    proc.kill();
                    reject(new Error('No page target found'));
                    return;
                }
                const session = {
                    id: sessionId,
                    wsUrl: pageTarget.webSocketDebuggerUrl,
                    chromeProcess: proc,
                    debuggingPort: port,
                    userDataDir,
                };
                activeSessions.set(sessionId, session);
                resolve(session);
            })
                .catch(() => {
                setTimeout(() => tryConnect(attempt + 1), 250);
            });
        };
        setTimeout(() => tryConnect(0), 300);
    });
}
function getSession(sessionId) {
    return activeSessions.get(sessionId);
}
function killSession(sessionId) {
    const session = activeSessions.get(sessionId);
    if (!session) {
        return;
    }
    session.chromeProcess.kill();
    activeSessions.delete(sessionId);
}
function killAllSessions() {
    for (const session of activeSessions.values()) {
        session.chromeProcess.kill();
    }
    activeSessions.clear();
}
function openChromeForExtensions(chromePath, workspaceId) {
    const userDataDir = buildUserDataDir(workspaceId);
    const args = [
        `--user-data-dir=${userDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        'https://chromewebstore.google.com',
    ];
    const proc = (0, node_child_process_1.execFile)(chromePath, args, { windowsHide: false });
    return proc;
}
function listInstalledExtensions(workspaceId) {
    const extensionsDir = node_path_1.default.join(node_os_1.default.homedir(), '.agentgrid', 'chrome-profiles', workspaceId, 'Default', 'Extensions');
    if (!node_fs_1.default.existsSync(extensionsDir)) {
        return [];
    }
    const results = [];
    for (const extId of readdirSafe(extensionsDir)) {
        const extPath = node_path_1.default.join(extensionsDir, extId);
        const versions = readdirSafe(extPath);
        const latestVersion = versions[versions.length - 1];
        if (!latestVersion) {
            continue;
        }
        const versionDir = node_path_1.default.join(extPath, latestVersion);
        const manifestPath = node_path_1.default.join(versionDir, 'manifest.json');
        if (!node_fs_1.default.existsSync(manifestPath)) {
            continue;
        }
        try {
            const manifest = JSON.parse(node_fs_1.default.readFileSync(manifestPath, 'utf-8'));
            const popup = manifest.action?.default_popup
                ?? manifest.browser_action?.default_popup
                ?? null;
            const options = manifest.options_ui?.page
                ?? manifest.options_page
                ?? null;
            const iconMap = manifest.icons ?? {};
            const iconSizes = Object.keys(iconMap).map(Number).sort((a, b) => b - a);
            const bestIcon = iconSizes[0] ? iconMap[String(iconSizes[0])] ?? null : null;
            const rawName = manifest.name ?? extId;
            const rawDesc = manifest.description ?? '';
            const name = resolveI18n(rawName, versionDir, manifest.default_locale);
            const description = resolveI18n(rawDesc, versionDir, manifest.default_locale);
            results.push({
                id: extId,
                name,
                version: manifest.version ?? '0.0.0',
                description,
                popupPath: popup,
                optionsPath: options,
                iconPath: bestIcon,
            });
        }
        catch {
            continue;
        }
    }
    return results;
}
function readdirSafe(dir) {
    try {
        return node_fs_1.default.readdirSync(dir).filter((name) => !name.startsWith('.'));
    }
    catch {
        return [];
    }
}
function resolveI18n(raw, versionDir, defaultLocale) {
    const match = /^__MSG_(\w+)__$/.exec(raw);
    if (!match) {
        return raw;
    }
    const key = match[1];
    const locale = defaultLocale ?? 'en';
    const candidates = [locale, 'en', 'en_US'];
    for (const loc of candidates) {
        const msgPath = node_path_1.default.join(versionDir, '_locales', loc, 'messages.json');
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
function clearBrowserData(workspaceId) {
    const profileDir = node_path_1.default.join(node_os_1.default.homedir(), '.agentgrid', 'chrome-profiles', workspaceId);
    if (!node_fs_1.default.existsSync(profileDir)) {
        return false;
    }
    node_fs_1.default.rmSync(profileDir, { recursive: true, force: true });
    return true;
}
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        node_http_1.default.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch (err) {
                    reject(err);
                }
            });
        }).on('error', reject);
    });
}
