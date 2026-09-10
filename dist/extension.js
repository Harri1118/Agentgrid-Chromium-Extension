"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const node_child_process_1 = require("node:child_process");
const node_path_1 = __importDefault(require("node:path"));
function ensureChromium(extensionRoot) {
    try {
        (0, node_child_process_1.execFileSync)('npx', ['playwright-core', 'install', 'chromium'], {
            cwd: extensionRoot,
            stdio: 'inherit',
            timeout: 120_000,
        });
        console.log('[chromium-engine] Chromium installed successfully');
    }
    catch (err) {
        console.error('[chromium-engine] failed to install Chromium:', err);
    }
}
async function activate(context) {
    console.log('[chromium-engine] activating');
    const registration = __agentgrid_api.browserEngines.registerBrowserEngine({
        id: 'chromium',
        label: 'Chromium',
        description: 'Standalone Chromium browser engine via Playwright',
    });
    context.subscriptions.push(registration);
    const extensionRoot = node_path_1.default.join(__dirname, '..');
    ensureChromium(extensionRoot);
}
function deactivate() {
    console.log('[chromium-engine] deactivated');
}
